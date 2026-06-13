#!/bin/bash

echo "=== 1. 登录获取 Token ==="
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"adjuster1","password":"adjuster123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: ${TOKEN:0:30}..."

echo ""
echo "=== 2. 创建新测试案件 ==="
CLAIM_ID=$(curl -s -X POST http://localhost:3001/api/claims \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customer_name":"测试-文件解析验证","phone":"13900001234","accident_date":"2024-06-20"}' | python3 -c "import sys,json; print(json.load(sys.stdin).id)")

echo "新建案件ID: $CLAIM_ID"

echo ""
echo "=== 3. 上传文本文件测试 ==="
TEXT_RESULT=$(curl -s -X POST http://localhost:3001/api/documents/$CLAIM_ID \
  -H "Authorization: Bearer $TOKEN" \
  -F "doc_type=medical" \
  -F "files=@test_sample_insurance.txt")

echo "$TEXT_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if isinstance(data, list):
    for doc in data:
        print(f'  文件名: {doc[\"file_name\"]}')
        print(f'  解析状态: {doc.get(\"parse_status\", \"N/A\")}')
        print(f'  文件大小: {doc.get(\"file_size\", 0)} bytes')
"

echo ""
echo "=== 4. 等待3秒后检查解析状态 ==="
sleep 3

DOCS=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/documents/$CLAIM_ID)

echo "$DOCS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('文档列表:')
for doc in data:
    status = doc.get('parse_status', 'N/A')
    pages = doc.get('page_count', 0)
    text_len = doc.get('text_length', 0)
    content_pages = doc.get('content_pages', 0)
    error = doc.get('parse_error', '')
    print(f'  {doc[\"file_name\"]}:')
    print(f'    状态: {status}')
    print(f'    页数: {pages}, 字数: {text_len}')
    print(f'    内容页数: {content_pages}')
    if error:
        print(f'    错误: {error}')
"

echo ""
echo "=== 5. 检查文本解析内容 ==="
DOC_ID=$(echo "$DOCS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for doc in data:
    if '.txt' in doc['file_name']:
        print(doc['id'])
        break
")

if [ -n "$DOC_ID" ]; then
    CONTENT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/documents/$CLAIM_ID/$DOC_ID/content)
    echo "$CONTENT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'解析到 {len(data)} 页内容')
if data:
    first_page = data[0]['content']
    print(f'第1页预览 (前300字):')
    print(first_page[:300])
"
fi

echo ""
echo "测试完成！案件ID: $CLAIM_ID"
