#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "========================================="
echo "🐾 兽医院疫苗冰箱记录 CLI 演示"
echo "========================================="

DB_PATH="./test_vaccine.db"
export DB_PATH

echo ""
echo "📌 步骤 1: 初始化数据库"
echo "-----------------------------------------"
rm -f "$DB_PATH"
echo "y" | python3 main.py --db "$DB_PATH" init

echo ""
echo "📌 步骤 2: 添加疫苗种类"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" vaccine add --name "犬四联疫苗" --species "狗"
python3 main.py --db "$DB_PATH" vaccine add --name "猫三联疫苗" --species "猫"
python3 main.py --db "$DB_PATH" vaccine add --name "狂犬疫苗" --species "通用"

echo ""
echo "📌 步骤 3: 查看疫苗列表"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" vaccine list

echo ""
echo "📌 步骤 4: 登记疫苗批号"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" batch add --vaccine-id 1 --batch-number "DV20260101" --manufacture-date "2026-01-01" --expiry-date "2027-01-01" --quantity 50
python3 main.py --db "$DB_PATH" batch add --vaccine-id 2 --batch-number "CV20260215" --manufacture-date "2026-02-15" --expiry-date "2027-02-15" --quantity 40
python3 main.py --db "$DB_PATH" batch add --vaccine-id 3 --batch-number "RV20260320" --manufacture-date "2026-03-20" --expiry-date "2026-07-20" --quantity 30
python3 main.py --db "$DB_PATH" batch add --vaccine-id 3 --batch-number "RV20251201" --manufacture-date "2025-12-01" --expiry-date "2026-06-25" --quantity 20

echo ""
echo "📌 步骤 5: 查看批号列表"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" batch list

echo ""
echo "📌 步骤 6: 导入温度日志 (CSV)"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" temperature import sample_data/temperature_log.csv --show-errors

echo ""
echo "📌 步骤 7: 导入温度日志 (TXT)"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" temperature import sample_data/temperature_log.txt

echo ""
echo "📌 步骤 8: 查看温度记录"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" temperature list --hours 72

echo ""
echo "📌 步骤 9: 查看异常温度记录"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" temperature list --hours 72 --abnormal-only

echo ""
echo "📌 步骤 10: 记录停电事件"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" event add \
    --type power_outage \
    --start "2026-06-01 09:00:00" \
    --end "2026-06-01 14:00:00" \
    --batch-ids "DV20260101,CV20260215,RV20260320,RV20251201" \
    --description "6月1日上午9点突发停电，下午2点恢复供电，期间冰箱温度升至13.8°C" \
    --action "已记录并等待评估"

echo ""
echo "📌 步骤 11: 记录接种"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" vaccinate add \
    --pet-name "旺财" --pet-species "狗" \
    --owner-name "张三" --owner-phone "13800138001" \
    --batch-number "DV20260101" --date "2026-06-05" \
    --dose 1 --admin "李医生" --breed "金毛" --age 2

python3 main.py --db "$DB_PATH" vaccinate add \
    --pet-name "喵喵" --pet-species "猫" \
    --owner-name "李四" --owner-phone "13800138002" \
    --batch-number "CV20260215" --date "2026-06-06" \
    --dose 1 --admin "王医生" --breed "英短" --age 1

python3 main.py --db "$DB_PATH" vaccinate add \
    --pet-name "大黄" --pet-species "狗" \
    --owner-name "王五" --owner-phone "13800138003" \
    --batch-number "RV20260320" --date "2026-06-07" \
    --dose 1 --admin "李医生" --breed "拉布拉多" --age 3

python3 main.py --db "$DB_PATH" vaccinate add \
    --pet-name "小白" --pet-species "狗" \
    --owner-name "赵六" --owner-phone "13800138004" \
    --batch-number "DV20260101" --date "2026-06-08" \
    --dose 1 --admin "王医生" --breed "泰迪" --age 1

python3 main.py --db "$DB_PATH" vaccinate add \
    --pet-name "奶茶" --pet-species "猫" \
    --owner-name "孙七" --owner-phone "13800138005" \
    --batch-number "CV20260215" --date "2026-06-09" \
    --dose 1 --admin "李医生" --breed "布偶" --age 2

python3 main.py --db "$DB_PATH" vaccinate add \
    --pet-name "旺财" --pet-species "狗" \
    --owner-name "张三" --owner-phone "13800138001" \
    --batch-number "RV20260320" --date "2026-06-10" \
    --dose 1 --admin "李医生" --breed "金毛" --age 2

echo ""
echo "📌 步骤 12: 将受影响批号标记为待评估"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" batch status --batch-number "DV20260101" --status "suspicious" --notes "6月1日停电超温影响，待评估"
python3 main.py --db "$DB_PATH" batch status --batch-number "CV20260215" --status "suspicious" --notes "6月1日停电超温影响，待评估"

echo ""
echo "📌 步骤 13: 运行系统检查"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" alert check

echo ""
echo "📌 步骤 14: 查看所有提醒"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" alert list

echo ""
echo "📌 步骤 15: 按宠物名查询 (旺财)"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" search pet "旺财"

echo ""
echo "📌 步骤 16: 按批号查询 (DV20260101)"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" search batch "DV20260101"

echo ""
echo "📌 步骤 17: 追溯受停电影响的批号 (批号追溯)"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" trace batch --batch-number "DV20260101"

echo ""
echo "📌 步骤 18: 追溯事件影响 (事件追溯)"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" trace event --event-id 1

echo ""
echo "📌 步骤 19: 处置并关闭事件"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" event resolve --event-id 1 \
    --action "已联系疫苗厂家评估，确认DV20260101和CV20260215批次受影响，建议已接种宠物加强观察，未使用的隔离封存；RV批次未受影响可继续使用" \
    --end "2026-06-11 10:00:00"

echo ""
echo "📌 步骤 20: 更新批号状态"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" batch status --batch-number "DV20260101" --status "quarantined" --notes "已确认受超温影响，隔离封存"
python3 main.py --db "$DB_PATH" batch status --batch-number "CV20260215" --status "quarantined" --notes "已确认受超温影响，隔离封存"
python3 main.py --db "$DB_PATH" batch status --batch-number "RV20260320" --status "normal" --notes "评估确认未受影响，可正常使用"
python3 main.py --db "$DB_PATH" batch status --batch-number "RV20251201" --status "expired" --notes "即将到期"

echo ""
echo "📌 步骤 21: 生成6月份月报"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" report --year 2026 --month 6 --output ./sample_data/june_report.txt
cat ./sample_data/june_report.txt

echo ""
echo "📌 步骤 22: 查看即将过期批号"
echo "-----------------------------------------"
python3 main.py --db "$DB_PATH" batch list --expiring-soon

echo ""
echo "📌 步骤 23: 测试重复录入保护"
echo "-----------------------------------------"
echo "尝试重复录入旺财的狂犬疫苗（应该会失败）："
set +e
python3 main.py --db "$DB_PATH" vaccinate add \
    --pet-name "旺财" --pet-species "狗" \
    --owner-name "张三" --owner-phone "13800138001" \
    --batch-number "RV20260320" --date "2026-06-10" \
    --dose 1 --admin "李医生" --breed "金毛" --age 2
set -e

echo ""
echo "📌 步骤 24: 测试异常批号使用保护"
echo "-----------------------------------------"
echo "尝试使用隔离状态的批号（应该会失败）："
set +e
python3 main.py --db "$DB_PATH" vaccinate add \
    --pet-name "小黑" --pet-species "狗" \
    --owner-name "周八" --owner-phone "13800138006" \
    --batch-number "DV20260101" --date "2026-06-11" \
    --dose 1 --admin "李医生"
set -e

echo ""
echo "========================================="
echo "✅ 演示完成！所有功能正常工作"
echo "========================================="
echo ""
echo "📂 生成的文件："
echo "  - 数据库: $DB_PATH"
echo "  - 月报: ./sample_data/june_report.txt"
echo ""
echo "💡 常用命令："
echo "  python3 main.py --help              # 查看所有命令"
echo "  python3 main.py vaccine --help      # 疫苗管理命令"
echo "  python3 main.py batch --help        # 批号管理命令"
echo "  python3 main.py temperature --help  # 温度记录命令"
echo "  python3 main.py vaccinate --help    # 接种记录命令"
echo "  python3 main.py event --help        # 异常事件命令"
echo "  python3 main.py alert --help        # 提醒管理命令"
echo "  python3 main.py trace --help        # 追溯查询命令"
echo "  python3 main.py search --help       # 快速查询命令"
echo "  python3 main.py report --help       # 生成月报"
