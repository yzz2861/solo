"""数据一致性验证脚本"""
import pandas as pd

merged = pd.read_csv('output/merged_detail.csv')
anomalies = pd.read_csv('output/all_anomalies.csv')
wave_summary = pd.read_csv('output/wave_summary.csv')

print('=== 数据一致性验证 ===')
print()
print('关联明细汇总:')
print(f'  总行数: {len(merged)}')
print(f'  应拣总数: {merged["qty_expected"].sum()}')
print(f'  实拣总数: {merged["qty_picked"].sum()}')
print(f'  短拣总数: {merged["qty_short"].sum()}')
print(f'  已补发: {merged["qty_supplemented"].sum()}')
print(f'  最终短拣: {merged["qty_final_short"].sum()}')
print(f'  短拣未补行数: {(merged["qty_final_short"] > 0).sum()}')
print(f'  复核人不一致行数: {(merged["reviewer_count"] > 1).sum()}')
print()

print('波次汇总校验:')
print(f'  波次数: {len(wave_summary)}')
print(f'  应拣总数: {wave_summary["total_expected"].sum()}')
print(f'  实拣总数: {wave_summary["total_picked"].sum()}')
print(f'  最终短拣: {wave_summary["total_final_short"].sum()}')
print()

print('异常明细校验:')
short_df = anomalies[anomalies['anomaly_type'] == '短拣未补']
print(f'  短拣未补条数: {len(short_df)}')
reviewer_df = anomalies[anomalies['anomaly_type'] == '复核人不一致']
print(f'  复核人不一致条数: {len(reviewer_df)}')
cross_df = anomalies[anomalies['anomaly_type'] == 'SKU跨波次重复']
print(f'  SKU跨波次重复条数: {len(cross_df)}')
over_df = anomalies[anomalies['anomaly_type'] == '超拣']
print(f'  超拣条数: {len(over_df)}')
print()

if len(short_df) > 0:
    short_qty = short_df['qty_final_short'].sum()
    merged_short_qty = merged[merged['qty_final_short'] > 0]['qty_final_short'].sum()
    print(f'  短拣未补数量一致: {short_qty} == {merged_short_qty} -> {short_qty == merged_short_qty}')

print()
print('=== 去重功能测试 ===')
from wave_analysis.importer import DataImporter
importer = DataImporter(state_file='output/import_state.json')

df, is_new = importer.import_wave_csv('data/wave_data.csv')
print(f'  重复导入波次CSV: is_new={is_new} (期望 False)')
df2, is_new2 = importer.import_review_json('data/review_data.json')
print(f'  重复导入复核JSON: is_new={is_new2} (期望 False)')
df3, is_new3 = importer.import_supplement_csv('data/supplement_data.csv')
print(f'  重复导入短拣补录: is_new={is_new3} (期望 False)')

print()
print('=== 验证通过 ===' if (not is_new and not is_new2 and not is_new3) else '=== 验证失败 ===')
