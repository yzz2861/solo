import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models.audit import audit_store


class TestResult:
    def __init__(self, name, passed, message=""):
        self.name = name
        self.passed = passed
        self.message = message

    def __str__(self):
        status = "✓ PASS" if self.passed else "✗ FAIL"
        return f"  {status} - {self.name}" + (f": {self.message}" if self.message else "")


class AcceptanceTestSuite:
    def __init__(self):
        self.client = app.test_client()
        self.results = []

    def run(self):
        print("=" * 70)
        print("  楼栋水表异常API - 验收测试")
        print("=" * 70)

        self.test_complete_data_pass()
        self.test_complete_data_intercept()
        self.test_complete_data_review()
        print()

        self.test_time_out_of_bounds_early()
        self.test_time_out_of_bounds_late()
        self.test_time_invalid_format()
        print()

        self.test_biz_no_format_error()
        self.test_biz_no_empty()
        print()

        self.test_config_missing_version()
        print()

        self.test_boundary_conditions()
        self.test_error_messages()
        self.test_repeat_processing()
        self.test_traceable_id()
        print()

        self.print_summary()

    def _post(self, url, data):
        return self.client.post(url, json=data, content_type='application/json')

    def _add_result(self, name, passed, message=""):
        self.results.append(TestResult(name, passed, message))
        print(str(self.results[-1]))

    def print_summary(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r.passed)
        failed = total - passed

        print("=" * 70)
        print(f"  测试结果汇总：共 {total} 项，通过 {passed} 项，失败 {failed} 项")
        print("=" * 70)

        if failed > 0:
            print("\n  失败用例：")
            for r in self.results:
                if not r.passed:
                    print(f"    ✗ {r.name}: {r.message}")

    def test_complete_data_pass(self):
        print("\n【场景一：完整数据 - 通过】")
        req = {
            "biz_no": "LD-SB-2025-000001",
            "object_status": {
                "building_id": "BLD-001",
                "metrics": {
                    "usage_increase_rate": 0.1,
                    "usage_decrease_rate": 0.05,
                    "night_day_ratio": 0.1,
                    "zero_usage_days": 0,
                    "pressure_cv": 0.1,
                    "min_hourly_flow_ratio": 0.8
                }
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "zhangsan"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("接口响应状态码为200", resp.status_code == 200, f"实际: {resp.status_code}")
        self._add_result("success为true", data.get("success") is True)
        self._add_result("conclusion为pass", data.get("data", {}).get("conclusion") == "pass")
        self._add_result("conclusion_cn为通过", data.get("data", {}).get("conclusion_cn") == "通过")
        self._add_result("包含可读reason", bool(data.get("data", {}).get("reason")))
        self._add_result("触发规则数为0", len(data.get("data", {}).get("triggered_rules", [])) == 0)
        self._add_result("返回规则版本", data.get("data", {}).get("rule_version") == "v2.0")
        self._add_result("返回操作人", data.get("data", {}).get("operator") == "zhangsan")
        self._add_result("返回trace_id", bool(data.get("data", {}).get("trace_id")))

    def test_complete_data_intercept(self):
        print("\n【场景一：完整数据 - 拦截】")
        req = {
            "biz_no": "LD-SB-2025-000002",
            "object_status": {
                "building_id": "BLD-002",
                "metrics": {
                    "usage_increase_rate": 0.6,
                    "usage_decrease_rate": 0.1,
                    "night_day_ratio": 0.4,
                    "zero_usage_days": 3,
                    "pressure_cv": 0.2,
                    "min_hourly_flow_ratio": 2.0
                }
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "lisi"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("接口响应状态码为200", resp.status_code == 200)
        self._add_result("conclusion为intercept", data.get("data", {}).get("conclusion") == "intercept")
        self._add_result("conclusion_cn为拦截", data.get("data", {}).get("conclusion_cn") == "拦截")
        self._add_result("触发至少1条规则", len(data.get("data", {}).get("triggered_rules", [])) >= 1)
        triggered_ids = [r["id"] for r in data.get("data", {}).get("triggered_rules", [])]
        self._add_result("R001用量突增规则被触发", "R001" in triggered_ids, f"触发规则: {triggered_ids}")

    def test_complete_data_review(self):
        print("\n【场景一：完整数据 - 待复核】")
        req = {
            "biz_no": "LD-SB-2025-000003",
            "object_status": {
                "building_id": "BLD-003",
                "metrics": {
                    "usage_increase_rate": 0.2,
                    "usage_decrease_rate": 0.3,
                    "night_day_ratio": 0.2,
                    "zero_usage_days": 6,
                    "pressure_cv": 0.35,
                    "min_hourly_flow_ratio": 1.0
                }
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "wangwu"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("接口响应状态码为200", resp.status_code == 200)
        self._add_result("conclusion为review", data.get("data", {}).get("conclusion") == "review")
        self._add_result("conclusion_cn为待复核", data.get("data", {}).get("conclusion_cn") == "待复核")

    def test_time_out_of_bounds_early(self):
        print("\n【场景二：时间越界 - 早于规则生效时间】")
        req = {
            "biz_no": "LD-SB-2025-000004",
            "object_status": {
                "building_id": "BLD-004",
                "metrics": {"usage_increase_rate": 0.1}
            },
            "time_window": {
                "start": "2023-01-01 00:00:00",
                "end": "2023-01-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "test_user"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("响应状态码为400", resp.status_code == 400, f"实际: {resp.status_code}")
        self._add_result("success为false", data.get("success") is False)
        self._add_result("错误码为INVALID_REQUEST", data.get("code") == "INVALID_REQUEST")
        self._add_result("错误信息包含越界提示", "越界" in data.get("message", ""))

    def test_time_out_of_bounds_late(self):
        print("\n【场景二：时间越界 - 晚于规则失效时间】")
        req = {
            "biz_no": "LD-SB-2025-000005",
            "object_status": {
                "building_id": "BLD-005",
                "metrics": {"usage_increase_rate": 0.1}
            },
            "time_window": {
                "start": "2099-01-01 00:00:00",
                "end": "2099-01-07 23:59:59"
            },
            "rule_version": "v1.0",
            "operator": "test_user"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("响应状态码为400", resp.status_code == 400)
        self._add_result("success为false", data.get("success") is False)
        self._add_result("错误信息包含时间越界", "越界" in data.get("message", ""))

    def test_time_invalid_format(self):
        print("\n【场景二：时间格式错误】")
        req = {
            "biz_no": "LD-SB-2025-000006",
            "object_status": {
                "building_id": "BLD-006",
                "metrics": {"usage_increase_rate": 0.1}
            },
            "time_window": {
                "start": "not-a-date",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "test_user"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("响应状态码为400", resp.status_code == 400)
        self._add_result("success为false", data.get("success") is False)
        self._add_result("错误信息包含格式错误", "格式错误" in data.get("message", ""))

    def test_biz_no_format_error(self):
        print("\n【场景三：编号错误 - 格式错误】")
        req = {
            "biz_no": "INVALID-123",
            "object_status": {
                "building_id": "BLD-007",
                "metrics": {"usage_increase_rate": 0.1}
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "test_user"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("响应状态码为400", resp.status_code == 400)
        self._add_result("success为false", data.get("success") is False)
        self._add_result("错误码为INVALID_REQUEST", data.get("code") == "INVALID_REQUEST")
        self._add_result("错误信息包含格式错误", "格式错误" in data.get("message", "") or "编号" in data.get("message", ""))

    def test_biz_no_empty(self):
        print("\n【场景三：编号错误 - 空编号】")
        req = {
            "biz_no": "",
            "object_status": {
                "building_id": "BLD-008",
                "metrics": {"usage_increase_rate": 0.1}
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "test_user"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("响应状态码为400", resp.status_code == 400)
        self._add_result("success为false", data.get("success") is False)
        self._add_result("错误信息提示不能为空", "不能为空" in data.get("message", ""))

    def test_config_missing_version(self):
        print("\n【场景四：配置缺失 - 规则版本不存在】")
        req = {
            "biz_no": "LD-SB-2025-000009",
            "object_status": {
                "building_id": "BLD-009",
                "metrics": {"usage_increase_rate": 0.1}
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v99.0",
            "operator": "test_user"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()

        self._add_result("响应状态码为400", resp.status_code == 400)
        self._add_result("success为false", data.get("success") is False)
        self._add_result("错误码为CONFIG_MISSING", data.get("code") == "CONFIG_MISSING")
        self._add_result("错误信息包含不存在", "不存在" in data.get("message", ""))

    def test_boundary_conditions(self):
        print("\n【验证：边界条件】")

        req1 = {
            "biz_no": "LD-SB-2025-000010",
            "object_status": {
                "building_id": "BLD-010",
                "metrics": {
                    "usage_increase_rate": 0.399,
                    "night_day_ratio": 0.1,
                    "zero_usage_days": 0
                }
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "boundary_test"
        }
        resp1 = self._post('/api/abnormal/check', req1)
        data1 = resp1.get_json()
        self._add_result("阈值下界(0.399)不触发R001", data1.get("data", {}).get("conclusion") == "pass")

        req2 = {
            "biz_no": "LD-SB-2025-000011",
            "object_status": {
                "building_id": "BLD-011",
                "metrics": {
                    "usage_increase_rate": 0.401,
                    "night_day_ratio": 0.1,
                    "zero_usage_days": 0
                }
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "boundary_test"
        }
        resp2 = self._post('/api/abnormal/check', req2)
        data2 = resp2.get_json()
        self._add_result("阈值上界(0.401)触发R001", data2.get("data", {}).get("conclusion") == "intercept")

        req3 = {
            "biz_no": "LD-SB-2025-000012",
            "object_status": {
                "building_id": "BLD-012",
                "metrics": {"zero_usage_days": 4}
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "boundary_test"
        }
        resp3 = self._post('/api/abnormal/check', req3)
        data3 = resp3.get_json()
        self._add_result("连续零用量4天不触发R004", data3.get("data", {}).get("conclusion") == "pass")

        req4 = {
            "biz_no": "LD-SB-2025-000013",
            "object_status": {
                "building_id": "BLD-013",
                "metrics": {"zero_usage_days": 5}
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "boundary_test"
        }
        resp4 = self._post('/api/abnormal/check', req4)
        data4 = resp4.get_json()
        self._add_result("连续零用量5天触发R004", data4.get("data", {}).get("conclusion") == "review")

    def test_error_messages(self):
        print("\n【验证：失败提示清晰可读】")

        test_cases = [
            ("操作人缺失", {
                "biz_no": "LD-SB-2025-000020",
                "object_status": {"building_id": "B01", "metrics": {}},
                "time_window": {"start": "2025-07-01", "end": "2025-07-07"},
                "rule_version": "v2.0"
            }, "操作人"),
            ("楼栋ID缺失", {
                "biz_no": "LD-SB-2025-000021",
                "object_status": {"metrics": {}},
                "time_window": {"start": "2025-07-01", "end": "2025-07-07"},
                "rule_version": "v2.0",
                "operator": "test"
            }, "楼栋ID"),
            ("时间窗口为空", {
                "biz_no": "LD-SB-2025-000022",
                "object_status": {"building_id": "B01", "metrics": {}},
                "time_window": {},
                "rule_version": "v2.0",
                "operator": "test"
            }, "时间窗口"),
        ]

        for case_name, payload, keyword in test_cases:
            resp = self._post('/api/abnormal/check', payload)
            data = resp.get_json()
            msg = data.get("message", "")
            self._add_result(
                f"{case_name}提示包含'{keyword}'",
                keyword in msg,
                f"实际消息: {msg}"
            )

    def test_repeat_processing(self):
        print("\n【验证：重复处理稳定性】")

        req = {
            "biz_no": "LD-SB-2025-000030",
            "object_status": {
                "building_id": "BLD-030",
                "metrics": {
                    "usage_increase_rate": 0.5,
                    "night_day_ratio": 0.2,
                    "zero_usage_days": 3
                }
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "repeat_test"
        }

        resp1 = self._post('/api/abnormal/check', req)
        data1 = resp1.get_json()
        trace_id1 = data1.get("data", {}).get("trace_id")
        conclusion1 = data1.get("data", {}).get("conclusion")

        resp2 = self._post('/api/abnormal/check', req)
        data2 = resp2.get_json()
        trace_id2 = data2.get("data", {}).get("trace_id")
        conclusion2 = data2.get("data", {}).get("conclusion")
        is_repeat = data2.get("data", {}).get("is_repeat")

        self._add_result("重复请求trace_id相同", trace_id1 == trace_id2,
                         f"第一次: {trace_id1}, 第二次: {trace_id2}")
        self._add_result("重复请求结论一致", conclusion1 == conclusion2)
        self._add_result("第二次标记为重复请求", is_repeat is True)
        self._add_result("消息提示重复请求", "重复" in data2.get("message", ""))

        resp3 = self._post('/api/abnormal/check', req)
        data3 = resp3.get_json()
        self._add_result("第三次请求仍稳定",
                         data3.get("data", {}).get("trace_id") == trace_id1)

    def test_traceable_id(self):
        print("\n【验证：可追溯编号】")

        req = {
            "biz_no": "LD-SB-2025-000040",
            "object_status": {
                "building_id": "BLD-040",
                "metrics": {"usage_increase_rate": 0.5}
            },
            "time_window": {
                "start": "2025-07-01 00:00:00",
                "end": "2025-07-07 23:59:59"
            },
            "rule_version": "v2.0",
            "operator": "trace_test"
        }
        resp = self._post('/api/abnormal/check', req)
        data = resp.get_json()
        trace_id = data.get("data", {}).get("trace_id")

        self._add_result("trace_id格式正确", trace_id and trace_id.startswith("TRACE-"),
                         f"实际: {trace_id}")

        resp2 = self.client.get(f'/api/audit/trace/{trace_id}')
        data2 = resp2.get_json()
        self._add_result("通过trace_id可查询审计记录", data2.get("success") is True)
        self._add_result("审计记录包含业务编号",
                         data2.get("data", {}).get("biz_no") == "LD-SB-2025-000040")
        self._add_result("审计记录包含操作人",
                         data2.get("data", {}).get("operator") == "trace_test")
        self._add_result("审计记录包含规则版本",
                         data2.get("data", {}).get("rule_version") == "v2.0")
        self._add_result("审计记录包含请求数据",
                         "request_data" in data2.get("data", {}))
        self._add_result("审计记录包含结果",
                         "result" in data2.get("data", {}))

        resp3 = self.client.get('/api/audit/biz/LD-SB-2025-000040')
        data3 = resp3.get_json()
        self._add_result("通过biz_no可查询历史记录", data3.get("success") is True)
        self._add_result("biz_no查询记录数>=1", data3.get("data", {}).get("count", 0) >= 1)


if __name__ == '__main__':
    suite = AcceptanceTestSuite()
    suite.run()
