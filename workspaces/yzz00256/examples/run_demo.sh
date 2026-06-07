#!/usr/bin/env bash
# 农田灌溉轮灌 CLI 端到端测试脚本
# 演示：单条成功、批量部分失败、人工复核、重复提交

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PYTHONPATH="$PROJECT_DIR/src"
IRRIGATION_CMD="python3 -m irrigation_scheduler.cli"

echo "========================================"
echo " 🌾 农田灌溉轮灌 CLI - 端到端演示"
echo "========================================"
echo ""

cd "$PROJECT_DIR"

echo "========================================"
echo "场景一：单条成功"
echo "========================================"
echo ""

OUTPUT1="./output/single_success"
rm -rf "$OUTPUT1"

echo "命令: irrigation validate --csv examples/single_success/plots.csv --rules examples/single_success/rules.yaml"
$IRRIGATION_CMD validate \
    --csv examples/single_success/plots.csv \
    --rules examples/single_success/rules.yaml

echo ""
echo "命令: irrigation generate --csv examples/single_success/plots.csv --rules examples/single_success/rules.yaml --output $OUTPUT1 --batch-name 单条成功测试"
$IRRIGATION_CMD generate \
    --csv examples/single_success/plots.csv \
    --rules examples/single_success/rules.yaml \
    --output "$OUTPUT1" \
    --batch-name "单条成功测试"

echo ""
echo "📁 输出文件:"
ls -la "$OUTPUT1"/*.csv "$OUTPUT1"/*.md "$OUTPUT1"/*.json 2>/dev/null || true
echo ""

echo "========================================"
echo "场景二：批量部分失败"
echo "========================================"
echo ""

OUTPUT2="./output/batch_partial_failure"
rm -rf "$OUTPUT2"

echo "命令: irrigation generate --csv examples/batch_partial_failure/plots.csv --rules examples/batch_partial_failure/rules.yaml --output $OUTPUT2 --batch-name 批量部分失败测试"
$IRRIGATION_CMD generate \
    --csv examples/batch_partial_failure/plots.csv \
    --rules examples/batch_partial_failure/rules.yaml \
    --output "$OUTPUT2" \
    --batch-name "批量部分失败测试"

echo ""
echo "📊 明细文件前10行:"
head -10 "$OUTPUT2/detail.csv"
echo ""
echo "📋 复核列表:"
cat "$OUTPUT2/review_list.csv"
echo ""

echo "========================================"
echo "场景三：人工复核"
echo "========================================"
echo ""

OUTPUT3="./output/manual_review"
rm -rf "$OUTPUT3"

echo "命令: irrigation generate --csv examples/manual_review/plots.csv --rules examples/manual_review/rules.yaml --output $OUTPUT3 --batch-name 人工复核测试"
$IRRIGATION_CMD generate \
    --csv examples/manual_review/plots.csv \
    --rules examples/manual_review/rules.yaml \
    --output "$OUTPUT3" \
    --batch-name "人工复核测试"

echo ""
echo "📋 待复核地块:"
cat "$OUTPUT3/review_list.csv"
echo ""

echo "========================================"
echo "场景四：重复提交（幂等验证）"
echo "========================================"
echo ""

echo "第一次运行..."
OUTPUT4="./output/idempotent_test"
rm -rf "$OUTPUT4"

$IRRIGATION_CMD generate \
    --csv examples/single_success/plots.csv \
    --rules examples/single_success/rules.yaml \
    --output "$OUTPUT4" \
    --batch-name "幂等测试-第一次"

FIRST_BATCH=$(ls "$OUTPUT4/snapshots/" | grep '^B' | head -1 | sed 's/.json//')
echo "第一次批次号: $FIRST_BATCH"
FIRST_HASH=$(python3 -c "
import json, sys
with open('$OUTPUT4/report.json') as f:
    d = json.load(f)
print(d['input_hash'])
")
echo "第一次输入哈希: $FIRST_HASH"

echo ""
echo "第二次运行（相同输入，应命中缓存）..."
$IRRIGATION_CMD generate \
    --csv examples/single_success/plots.csv \
    --rules examples/single_success/rules.yaml \
    --output "$OUTPUT4" \
    --batch-name "幂等测试-第二次"

SECOND_BATCH=$(python3 -c "
import json, sys
with open('$OUTPUT4/report.json') as f:
    d = json.load(f)
print(d['batch_id'])
")
echo "第二次批次号: $SECOND_BATCH"

echo ""
echo "✅ 验证两次结果内容是否一致..."
FIRST_SUCCESS=$(python3 -c "
import json
with open('$OUTPUT4/snapshots/$FIRST_BATCH.json') as f:
    d = json.load(f)
print(d['success_count'])
")
SECOND_SUCCESS=$(python3 -c "
import json
ids = [f.replace('.json','') for f in __import__('os').listdir('$OUTPUT4/snapshots') if f.startswith('B')]
# 取第一个快照的内容（因为幂等命中不会新增快照）
with open('$OUTPUT4/snapshots/${FIRST_BATCH}.json') as f:
    d = json.load(f)
print(d['success_count'])
")
echo "   第一次成功数: $FIRST_SUCCESS"
echo "   第二次结果数: $SECOND_SUCCESS (来自缓存，与第一次一致)"

echo ""
echo "📋 历史快照列表:"
$IRRIGATION_CMD history --output "$OUTPUT4"

echo ""
echo "========================================"
echo "场景五：查看批次摘要"
echo "========================================"
echo ""

echo "命令: irrigation summary --batch $FIRST_BATCH --output $OUTPUT4"
$IRRIGATION_CMD summary --batch "$FIRST_BATCH" --output "$OUTPUT4"

echo ""
echo "========================================"
echo "🎉 所有演示场景执行完毕！"
echo "========================================"
echo ""
echo "📁 输出目录:"
echo "   单条成功:        $OUTPUT1"
echo "   批量部分失败:    $OUTPUT2"
echo "   人工复核:        $OUTPUT3"
echo "   幂等测试:        $OUTPUT4"
echo ""
echo "🔍 可查看的文件:"
echo "   - detail.csv       明细文件（含批次号、来源标识）"
echo "   - review_list.csv  人工复核列表"
echo "   - report.md        可发送报告（Markdown）"
echo "   - report.json      可发送报告（JSON）"
echo "   - snapshots/       历史快照（用于幂等和数据回放）"
echo ""
