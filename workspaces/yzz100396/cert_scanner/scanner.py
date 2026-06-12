import ssl
import socket
import datetime
from dataclasses import dataclass, field
from typing import Optional, List
from .config import DomainEntry


@dataclass
class ScanResult:
    domain: DomainEntry

    dns_resolved: bool = False
    dns_ips: List[str] = field(default_factory=list)
    connectable: bool = False

    cert_verified: bool = False
    cert_chain_complete: bool = True
    cert_subject: str = ""
    cert_issuer: str = ""
    cert_not_before: Optional[datetime.datetime] = None
    cert_not_after: Optional[datetime.datetime] = None
    days_until_expiry: Optional[int] = None

    san_names: List[str] = field(default_factory=list)
    chain_depth: int = 0

    error: Optional[str] = None

    @property
    def host_port(self) -> str:
        return f"{self.domain.host}:{self.domain.port}"

    @property
    def is_expired(self) -> bool:
        if self.days_until_expiry is None:
            return False
        return self.days_until_expiry < 0

    def to_dict(self) -> dict:
        return {
            "key": self.domain.key,
            "host": self.domain.host,
            "port": self.domain.port,
            "environment": self.domain.environment,
            "owner": self.domain.owner,
            "owner_contact": self.domain.owner_contact,
            "is_orphan": self.domain.is_orphan,
            "dns_resolved": self.dns_resolved,
            "dns_ips": self.dns_ips,
            "connectable": self.connectable,
            "cert_verified": self.cert_verified,
            "cert_chain_complete": self.cert_chain_complete,
            "cert_subject": self.cert_subject,
            "cert_issuer": self.cert_issuer,
            "cert_not_before": self.cert_not_before.isoformat() if self.cert_not_before else None,
            "cert_not_after": self.cert_not_after.isoformat() if self.cert_not_after else None,
            "days_until_expiry": self.days_until_expiry,
            "san_names": self.san_names,
            "chain_depth": self.chain_depth,
            "error": self.error,
        }


def _resolve_dns(host: str) -> tuple:
    try:
        infos = socket.getaddrinfo(host, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        ips = list({addr[4][0] for addr in infos})
        return True, ips
    except socket.gaierror:
        return False, []


def _check_cert_chain(cert_der_list: list) -> bool:
    if len(cert_der_list) <= 1:
        return False
    return True


def scan_domain(entry: DomainEntry, timeout: float = 10.0) -> ScanResult:
    result = ScanResult(domain=entry)

    dns_ok, dns_ips = _resolve_dns(entry.host)
    result.dns_resolved = dns_ok
    result.dns_ips = dns_ips

    if not dns_ok:
        result.error = "DNS_RESOLUTION_FAILED"
        result.cert_chain_complete = False
        return result

    ctx = ssl.create_default_context()
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED

    try:
        sock = socket.create_connection((entry.host, entry.port), timeout=timeout)
    except (socket.timeout, ConnectionRefusedError, OSError) as exc:
        result.connectable = False
        result.error = f"CONNECTION_FAILED: {exc.__class__.__name__}"
        result.cert_chain_complete = False
        return result

    try:
        ssock = ctx.wrap_socket(sock, server_hostname=entry.host)
        result.connectable = True
        result.cert_verified = True

        der_peers = ssock.getpeercert(binary_form=True)
        peer_cert = ssock.getpeercert()

        result.cert_subject = ", ".join(
            f"{'='.join(pair)}" for group in peer_cert.get("subject", ()) for pair in group
        )
        result.cert_issuer = ", ".join(
            f"{'='.join(pair)}" for group in peer_cert.get("issuer", ()) for pair in group
        )

        not_before_str = peer_cert.get("notBefore", "")
        not_after_str = peer_cert.get("notAfter", "")

        fmt = "%b %d %H:%M:%S %Y %Z"
        try:
            result.cert_not_before = datetime.datetime.strptime(not_before_str, fmt)
        except (ValueError, TypeError):
            pass
        try:
            result.cert_not_after = datetime.datetime.strptime(not_after_str, fmt)
        except (ValueError, TypeError):
            pass

        if result.cert_not_after:
            now = datetime.datetime.utcnow()
            result.days_until_expiry = (result.cert_not_after - now).days

        san = peer_cert.get("subjectAltName", [])
        result.san_names = [v for typ, v in san if typ == "DNS"]

        result.cert_chain_complete = True

        ssock.close()

    except ssl.SSLCertVerificationError as exc:
        result.connectable = True
        result.cert_verified = False
        result.cert_chain_complete = False
        result.error = f"CERT_VERIFY_FAILED: {exc.verify_message}"

        try_insecure = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        try_insecure.check_hostname = False
        try_insecure.verify_mode = ssl.CERT_NONE

        try:
            sock2 = socket.create_connection((entry.host, entry.port), timeout=timeout)
            ssock2 = try_insecure.wrap_socket(sock2, server_hostname=entry.host)
            der_cert = ssock2.getpeercert(binary_form=True)
            if der_cert:
                from . import _cert_parse
                info = _cert_parse.parse_der_cert(der_cert)
                if info:
                    result.cert_not_after = info.get("not_after")
                    result.cert_subject = info.get("subject", "")
                    result.cert_issuer = info.get("issuer", "")
                    if result.cert_not_after:
                        result.days_until_expiry = (
                            result.cert_not_after - datetime.datetime.utcnow()
                        ).days
            ssock2.close()
        except Exception:
            pass

    except ssl.SSLError as exc:
        result.connectable = True
        result.cert_verified = False
        result.cert_chain_complete = False
        result.error = f"SSL_ERROR: {exc}"

    return result
