import requests, json, time

BASE = "http://localhost:3001/api"

r = requests.post(f"{BASE}/auth/login", json={"username":"adjuster1","password":"adjuster123"})
token = r.json()["token"]
print("✅ 登录成功")

r = requests.post(f"{BASE}/claims", json={
    "customer_name":"测试解析",
    "phone":"13900000002",
    "accident_date":"2024-06-20"
}, headers={"Authorization":f"Bearer {token}"})
claim_id = r.json()["id"]
print(f"📋 案件ID: {claim_id}")

with open("test_sample_insurance.txt", "rb") as f:
    r = requests.post(f"{BASE}/documents/{claim_id}", 
        files={"files":("test.txt", f)}, 
        data={"doc_type":"medical"}, 
        headers={"Authorization":f"Bearer {token}"})

docs = r.json()
print(f"📤 上传完成，初始状态: {docs[0].get('parse_status','N/A')}")

for i in range(5):
    time.sleep(2)
    r = requests.get(f"{BASE}/documents/{claim_id}", headers={"Authorization":f"Bearer {token}"})
    d = r.json()[0]
    status = d.get("parse_status", "?")
    pages = d.get("page_count", 0)
    text_len = d.get("text_length", 0)
    print(f"⏱️  {(i+1)*2}秒后: {status}, {pages}页, {text_len}字")
    
    if status == "success":
        doc_id = d["id"]
        rc = requests.get(f"{BASE}/documents/{claim_id}/{doc_id}/content", 
            headers={"Authorization":f"Bearer {token}"})
        content = rc.json()
        print(f"📄 内容页数: {len(content)}")
        if content:
            preview = content[0]["content"][:60].replace("\n", " ")
            print(f"📝 预览: {preview}...")
        
        print("\n🔍 生成摘要...")
        rs = requests.post(f"{BASE}/summaries/{claim_id}/generate",
            headers={"Authorization":f"Bearer {token}"})
        sid = rs.json()["summary"]["id"]
        print(f"✅ 摘要ID: {sid}")
        
        rd = requests.get(f"{BASE}/summaries/{sid}",
            headers={"Authorization":f"Bearer {token}"})
        sd = rd.json()
        
        print(f"\n📊 提取结果:")
        if "structured" in sd:
            for cat, items in sd["structured"].items():
                if items:
                    print(f"  {cat}: {len(items)} 项")
        
        if sd.get("conflicts"):
            print(f"⚠️  冲突: {len(sd['conflicts'])} 个")
            for c in sd["conflicts"][:2]:
                print(f"    [{c['severity']}] {c['description'][:60]}")
        
        if sd.get("missing_items"):
            print(f"📭 缺件: {len(sd['missing_items'])} 项")
        
        if sd.get("follow_up_points"):
            print(f"❓ 追问: {len(sd['follow_up_points'])} 个")
        
        break

print("\n🎉 测试完成！")
