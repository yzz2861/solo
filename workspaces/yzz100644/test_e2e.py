import uvicorn, threading, time, httpx

def run_server():
    uvicorn.run('backend.app.main:app', host='127.0.0.1', port=8765, log_level='error')

t = threading.Thread(target=run_server, daemon=True)
t.start()
time.sleep(5)

BASE = 'http://127.0.0.1:8765'
c = httpx.Client(timeout=30)

r = c.get(f'{BASE}/health')
print(f'1. Health: {r.json()}')

r = c.post(f'{BASE}/api/products/models', json={'name': 'X1-Old', 'is_old': True})
old_id = r.json()['id']
r = c.post(f'{BASE}/api/products/models', json={'name': 'X2-New', 'is_old': False})
new_id = r.json()['id']
print(f'2. Models: old={old_id} new={new_id}')

faqs = [
    {'product_model_id': new_id, 'question': 'X2如何安装？', 'answer': '开箱-插电-开机-配网-充电4小时', 'source_page': '说明书第3页', 'notes': '首次充电必须满4小时', 'category': 'installation'},
    {'product_model_id': new_id, 'question': '日常怎么保养？', 'answer': '每次清理尘盒；每周检查滚刷；滤网3月换一次', 'source_page': '说明书第12页', 'notes': '滤网不可水洗', 'category': 'maintenance'},
    {'product_model_id': new_id, 'question': '保修多久？', 'answer': '整机1年，电池6个月。人为损坏不保修', 'source_page': '保修卡', 'category': 'warranty', 'is_warranty_exception': True},
    {'product_model_id': new_id, 'question': 'X2和X1有什么区别？', 'answer': 'X2增自动集尘+吸力4000Pa+拖地功能', 'source_page': '官网对比', 'category': 'model_diff', 'is_model_difference': True},
    {'product_model_id': old_id, 'question': 'X1怎么安装？', 'answer': '取出主机-插电-开机-配网-充电3小时', 'source_page': 'X1说明书第3页', 'category': 'installation'},
    {'product_model_id': old_id, 'question': 'X1保修多久？', 'answer': '整机1年，电池6个月，人为损坏不在保修范围', 'source_page': 'X1保修卡', 'category': 'warranty', 'is_warranty_exception': True},
]
for faq in faqs:
    c.post(f'{BASE}/api/products/faqs', json=faq)
print(f'3. FAQs imported: {len(faqs)}')

r = c.post(f'{BASE}/api/qa/query', json={'question': 'X2怎么安装？', 'product_model_id': new_id, 'agent_id': 'a1'})
d = r.json()
print(f'4. Normal answer: type={d["answer_type"]} no_answer={d["is_no_answer"]}')

r = c.post(f'{BASE}/api/qa/query', json={'question': '怎么保养？', 'agent_id': 'a2'})
d = r.json()
print(f'5. Missing model: missing={d["is_missing_model"]} followup={len(d["need_followup"])}')

r = c.post(f'{BASE}/api/qa/query', json={'question': 'X1怎么安装？', 'product_model_id': old_id, 'agent_id': 'a1'})
d = r.json()
print(f'6. Old model: old_model={d["is_old_model"]}')

r = c.post(f'{BASE}/api/qa/query', json={'question': '保修多久？', 'product_model_id': new_id, 'agent_id': 'a3'})
d = r.json()
warranty_hint = '保修例外' in d.get('notes', '')
print(f'7. Warranty: warranty_exception_in_notes={warranty_hint}')

r = c.post(f'{BASE}/api/qa/query', json={'question': 'X2和X1区别？', 'product_model_id': new_id, 'agent_id': 'a1'})
d = r.json()
print(f'8. Model diff: diff_hint={any("型号" in f for f in d["need_followup"])}')

r = c.post(f'{BASE}/api/qa/query', json={'question': '怎么连HomeKit？', 'product_model_id': new_id, 'agent_id': 'a2'})
d = r.json()
qid_no = d['query_id']
reject = '请不要凭经验' in d['answer']
print(f'9. Reject answer: no_answer={d["is_no_answer"]} reject={reject}')

r = c.post(f'{BASE}/api/qa/decision', json={'query_record_id': qid_no, 'adopted': True})
print(f'10. Adopt: {r.status_code}')

r = c.post(f'{BASE}/api/qa/query', json={'question': '接智能音箱', 'product_model_id': new_id, 'agent_id': 'a3'})
qid2 = r.json()['query_id']
r = c.post(f'{BASE}/api/qa/decision', json={'query_record_id': qid2, 'adopted': False, 'modified_answer': '可接入米家', 'modify_reason': '文档未覆盖'})
print(f'11. Override: {r.status_code}')

r = c.get(f'{BASE}/api/supervisor/stats')
d = r.json()
print(f'12. Stats: total={d["total_queries"]} no_answer={d["no_answer_count"]} rate={d["adoption_rate"]:.0%} old={d["old_model_count"]} warranty={d["warranty_question_count"]}')

r = c.get(f'{BASE}/api/supervisor/decisions')
decisions = r.json()
print(f'13. Decisions: {len(decisions)} records')

r = c.get(f'{BASE}/api/supervisor/export/no-answer.csv')
print(f'14. CSV export: {r.status_code} rows={len(r.text.strip().split(chr(10)))}')

r = c.post(f'{BASE}/api/supervisor/decisions/{decisions[0]["id"]}/review?note=OK&reviewed=true')
print(f'15. Supervisor review: {r.status_code}')

r = c.get(f'{BASE}/api/qa/records?is_no_answer=true')
print(f'16. Filter no-answer records: {len(r.json())} records')

print()
print('ALL TESTS PASSED!')
