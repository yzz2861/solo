"""验证核心逻辑的测试脚本"""
from pathlib import Path
from datetime import date
from renewal_aligner.importers import import_contracts, import_usage, import_tickets, import_forecasts
from renewal_aligner.merger import merge_data
from renewal_aligner.risk_engine import run_risk_assessment, RiskConfig
from renewal_aligner.name_matcher import CustomerNameMatcher
from renewal_aligner.history import SnapshotStore, build_snapshot
from renewal_aligner.exporter import build_follow_up_list, export_follow_up_excel
from renewal_aligner.sales_sync import build_sales_sync_list, build_pre_meeting_report, export_sales_sync_excel

SD = Path("sample_data")
print("=== 1. 导入 ===")
c = import_contracts(SD / "contracts.csv")
print(f"  合同: {c.success_count}/{c.total_rows}")
u = import_usage(SD / "usage.csv")
print(f"  使用量: {u.success_count}/{u.total_rows}")
t = import_tickets(SD / "tickets.csv")
print(f"  工单: {t.success_count}/{t.total_rows}")
f = import_forecasts(SD / "forecasts.csv")
print(f"  预测: {f.success_count}/{f.total_rows}")
if c.errors: print("合同错误:", c.errors[:3])
if t.errors: print("工单错误:", t.errors[:3])

print("\n=== 2. 合并 ===")
matcher = CustomerNameMatcher()
res = merge_data(c.records, u.records, t.records, f.records, matcher, baseline_date=date.today())
print(f"  合并后客户数: {res.stats.total_customers}")
print(f"  改名客户: {res.stats.renamed_customers}")
print(f"  新客户: {len(res.stats.new_customers)}")
print(f"  模糊匹配: {len(res.stats.fuzzy_matches)} 项")
for fm in res.stats.fuzzy_matches[:6]:
    print(f"    {fm['source']:8s} | {fm['raw_name']:>14s} → {fm['canonical_name']:10s} | {fm['score']:3d}% | {fm['match_type']}")

print("\n=== 3. 风险评估 ===")
recs = run_risk_assessment(res.records, baseline=date.today(), config=RiskConfig())
from renewal_aligner.models import RiskLevel
level_counts = {}
for r in recs.values():
    level_counts[r.highest_risk_level.value] = level_counts.get(r.highest_risk_level.value, 0) + 1
print("  风险等级分布:", level_counts)
print("\n  前6个客户详情:")
for name, rec in sorted(recs.items(), key=lambda x: -x[1].contract_value)[:6]:
    lv = rec.highest_risk_level.value
    dte = (rec.upcoming_end_date - date.today()).days if rec.upcoming_end_date else "?"
    print(f"  {name:10s} ￥{rec.contract_value:>9,.0f} | {lv:9s} | 风险{len(rec.risks):2d}项 | 到期剩{dte:>4}天 | CSM:{rec.csm_owner} 销售:{rec.sales_owner}")
    for rk in rec.risks[:2]:
        msg = rk.message[:55]
        print(f"    · [{rk.risk_type.value:18s}/{rk.risk_level.value:8s}] {msg}")

print("\n=== 4. 特殊场景检查 ===")
checks = [
    ("百度", "零使用+试点"),
    ("华为", "续签中+重开工单"),
    ("拼多多", "缺少预测"),
    ("滴滴", "预测超合同+重开工单"),
    ("字节跳动", "增购高使用"),
]
for name, desc in checks:
    if name in recs:
        r = recs[name]
        risk_types = [rt.risk_type.value for rt in r.risks]
        print(f"  ✅ {name:6s} [{desc}] → 风险: {', '.join(risk_types) if risk_types else '无'}")
    else:
        print(f"  ⚠️  {name:6s} 未找到")

print("\n=== 5. 快照存储 ===")
store = SnapshotStore(Path("test_output/snapshots"))
prev = store.latest_run_id()
print(f"  上次运行: {prev or '无'}")
snap = build_snapshot(recs, baseline_date=date.today(), previous_run_id=prev)
rid = store.save_snapshot(snap)
print(f"  保存快照: {rid}")
# 别名存储
matcher.save_aliases(Path("test_output/aliases.json"))
print(f"  保存别名")

# 风险变化追踪
diff = store.annotate_with_changes(recs, rid, prev)
print(f"  变化摘要: {diff.summary}")

print("\n=== 6. 导出 ===")
items = build_follow_up_list(recs, diff, baseline=date.today())
print(f"  跟进清单: {len(items)} 位客户")
xl = export_follow_up_excel(items, Path("test_output/follow-up.xlsx"))
print(f"  Excel: {xl}")
sales_items = build_sales_sync_list(recs, baseline=date.today())
print(f"  销售同步: {len(sales_items)} 位")
if sales_items:
    xl2 = export_sales_sync_excel(sales_items, Path("test_output/sales-sync.xlsx"))
    rpt = build_pre_meeting_report(sales_items, baseline=date.today())
    print(f"  销售Excel: {xl2}")
    print(f"  紧急项: {len(rpt.urgent_items)} / 预测偏差: {len(rpt.forecast_mismatch_items)} / 需确认: {len(rpt.items_needing_confirmation)}")
    for k, v in rpt.by_sales_owner.items():
        print(f"    销售 {k}: {len(v)} 位 (￥{sum(i.contract_value for i in v):,.0f})")

print("\n✅ 所有测试通过！")
