import os
import tempfile
import unittest

from cert_scanner.config import DomainEntry
from cert_scanner.scanner import ScanResult
from cert_scanner.dedup import AlertDedup, _fingerprint
from cert_scanner.risk import RiskLevel


def _make_result(host="api.example.com", port=443, environment="production",
                 owner="team-backend", owner_contact="x@y.com",
                 dns_resolved=True, connectable=True, cert_verified=True,
                 cert_chain_complete=True, days_until_expiry=44, error=None):
    entry = DomainEntry(
        host=host, port=port, environment=environment,
        owner=owner, owner_contact=owner_contact,
    )
    return ScanResult(
        domain=entry,
        dns_resolved=dns_resolved,
        connectable=connectable,
        cert_verified=cert_verified,
        cert_chain_complete=cert_chain_complete,
        days_until_expiry=days_until_expiry,
        error=error,
    )


class FingerprintTests(unittest.TestCase):

    def test_same_state_same_fingerprint(self):
        r1 = _make_result(days_until_expiry=44)
        r2 = _make_result(days_until_expiry=44)
        self.assertEqual(_fingerprint(r1), _fingerprint(r2))

    def test_natural_day_decrement_same_fingerprint(self):
        r_44 = _make_result(days_until_expiry=44)
        r_43 = _make_result(days_until_expiry=43)
        self.assertEqual(_fingerprint(r_44), _fingerprint(r_43))

    def test_day_range_within_same_risk_bucket_same_fingerprint(self):
        r_90 = _make_result(days_until_expiry=90)
        r_120 = _make_result(days_until_expiry=120)
        self.assertEqual(_fingerprint(r_90), _fingerprint(r_120))

    def test_risk_bucket_change_different_fingerprint(self):
        r_90 = _make_result(days_until_expiry=90)
        r_60 = _make_result(days_until_expiry=60)
        self.assertNotEqual(_fingerprint(r_90), _fingerprint(r_60))

    def test_risk_bucket_critical_vs_high_different_fingerprint(self):
        r_29 = _make_result(days_until_expiry=29)
        r_6 = _make_result(days_until_expiry=6)
        self.assertNotEqual(_fingerprint(r_29), _fingerprint(r_6))

    def test_dns_failure_different_fingerprint(self):
        r_ok = _make_result(dns_resolved=True)
        r_bad = _make_result(dns_resolved=False, days_until_expiry=None,
                             error="DNS_RESOLUTION_FAILED")
        self.assertNotEqual(_fingerprint(r_ok), _fingerprint(r_bad))

    def test_owner_change_different_fingerprint(self):
        r_old = _make_result(owner="team-a")
        r_new = _make_result(owner="team-b")
        self.assertNotEqual(_fingerprint(r_old), _fingerprint(r_new))

    def test_orphan_change_different_fingerprint(self):
        r_owned = _make_result(owner="team-a")
        r_orphan = _make_result(owner="")
        self.assertNotEqual(_fingerprint(r_owned), _fingerprint(r_orphan))


class DedupAlertTests(unittest.TestCase):

    def setUp(self):
        tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
        self.state_path = tmp.name
        tmp.close()

    def tearDown(self):
        if os.path.exists(self.state_path):
            os.remove(self.state_path)

    def test_first_scan_is_new(self):
        dedup = AlertDedup(state_path=self.state_path)
        r = _make_result(days_until_expiry=44)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r)
        self.assertTrue(is_new)
        self.assertTrue(is_changed)
        self.assertIsNone(prev_risk)

    def test_natural_decrement_no_alert(self):
        dedup = AlertDedup(state_path=self.state_path)
        r_44 = _make_result(days_until_expiry=44)
        dedup.is_new_or_changed(r_44)

        r_43 = _make_result(days_until_expiry=43)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_43)
        self.assertFalse(is_new)
        self.assertFalse(is_changed)

    def test_risk_bucket_crossing_triggers_alert(self):
        dedup = AlertDedup(state_path=self.state_path)
        r_95 = _make_result(days_until_expiry=95)
        dedup.is_new_or_changed(r_95)

        r_59 = _make_result(days_until_expiry=59)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_59)
        self.assertFalse(is_new)
        self.assertTrue(is_changed)
        self.assertEqual(prev_risk, RiskLevel.OK)

    def test_risk_bucket_crossing_high_to_critical(self):
        dedup = AlertDedup(state_path=self.state_path)
        r_29 = _make_result(days_until_expiry=29)
        dedup.is_new_or_changed(r_29)

        r_5 = _make_result(days_until_expiry=5)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_5)
        self.assertFalse(is_new)
        self.assertTrue(is_changed)
        self.assertEqual(prev_risk, RiskLevel.HIGH)

    def test_dns_goes_down_triggers_alert(self):
        dedup = AlertDedup(state_path=self.state_path)
        r_ok = _make_result(days_until_expiry=44)
        dedup.is_new_or_changed(r_ok)

        r_down = _make_result(dns_resolved=False, days_until_expiry=None,
                              error="DNS_RESOLUTION_FAILED")
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_down)
        self.assertTrue(is_changed)
        self.assertEqual(prev_risk, RiskLevel.MEDIUM)

    def test_cert_verify_fails_triggers_alert(self):
        dedup = AlertDedup(state_path=self.state_path)
        r_ok = _make_result(days_until_expiry=44)
        dedup.is_new_or_changed(r_ok)

        r_bad = _make_result(cert_verified=False, days_until_expiry=44,
                             error="CERT_VERIFY_FAILED: self-signed")
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_bad)
        self.assertTrue(is_changed)
        self.assertEqual(prev_risk, RiskLevel.MEDIUM)

    def test_owner_change_triggers_alert(self):
        dedup = AlertDedup(state_path=self.state_path)
        r_old = _make_result(owner="team-a", days_until_expiry=44)
        dedup.is_new_or_changed(r_old)

        r_new = _make_result(owner="team-b", days_until_expiry=43)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_new)
        self.assertTrue(is_changed)

    def test_orphan_becomes_owned_triggers_alert(self):
        dedup = AlertDedup(state_path=self.state_path)
        r_orphan = _make_result(owner="", days_until_expiry=44)
        dedup.is_new_or_changed(r_orphan)

        r_owned = _make_result(owner="team-new", days_until_expiry=43)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_owned)
        self.assertTrue(is_changed)

    def test_multi_day_sequential_scan_no_spam(self):
        dedup = AlertDedup(state_path=self.state_path)

        r_first = _make_result(days_until_expiry=95)
        dedup.is_new_or_changed(r_first)

        for days in [94, 93, 90]:
            r = _make_result(days_until_expiry=days)
            is_new, is_changed, _ = dedup.is_new_or_changed(r)
            self.assertFalse(is_new, f"days={days} should not be new")
            self.assertFalse(is_changed, f"days={days} should not be changed")

        r_89 = _make_result(days_until_expiry=89)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_89)
        self.assertFalse(is_new)
        self.assertTrue(is_changed)
        self.assertEqual(prev_risk, RiskLevel.OK)

        for days in [88, 80, 70, 61, 60]:
            r = _make_result(days_until_expiry=days)
            is_new, is_changed, prev = dedup.is_new_or_changed(r)
            self.assertFalse(is_new, f"days={days} should not be new in LOW bucket")
            self.assertFalse(is_changed, f"days={days} should not be changed in LOW bucket")

        r_59 = _make_result(days_until_expiry=59)
        is_new, is_changed, prev_risk = dedup.is_new_or_changed(r_59)
        self.assertTrue(is_changed)
        self.assertEqual(prev_risk, RiskLevel.LOW)

    def test_purge_missing(self):
        dedup = AlertDedup(state_path=self.state_path)
        r_a = _make_result(host="a.example.com")
        r_b = _make_result(host="b.example.com")
        dedup.is_new_or_changed(r_a)
        dedup.is_new_or_changed(r_b)
        self.assertEqual(2, len(dedup.get_active_keys()))

        dedup.purge_missing({r_a.domain.key})
        self.assertEqual(1, len(dedup.get_active_keys()))
        self.assertIn(r_a.domain.key, dedup.get_active_keys())


if __name__ == "__main__":
    unittest.main()
