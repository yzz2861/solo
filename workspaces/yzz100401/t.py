import requests, json, time, sys

BASE = "http://localhost:3001/api"

r = requests.post(BASE + "/auth/login", json={"username":"adjuster1","password":"adjuster123"})
token = r.json()["token"]
print("登录成功")

r = requests.post(BASE + "/claims", json={
    "customer_name":"测试解析",
    "phone":"13900000005",
    "accident_date":"2024-06-20"
}, headers={"Authorization":"Bearer " + token})
claim_id = r.json()["id"]
print("案件ID:", claim_id)

with open("test_sample_insurance.txt", "rb") as f:
    r = requests.post(BASE + "/documents/" + str(claim_id), 
        files={"files":("test.txt", f)}, 
        data={"doc_type":"medical"}, 
        headers={"Authorization":"Bearer " + token})

docs = r.json()
print("上传完成，初始状态:", docs[0].get("parse_status","N/A"))

for i in range(8):
    time.sleep(1)
    r = requests.get(BASE + "/documents/" + str(claim_id), 
        headers={"Authorization":"Bearer " + token})
    d = r.json()[0]
    status = d.get("parse_status", "?")
    pages = d.get("page_count", 0)
    text_len = d.get("text_length", 0)
    err = d.get("parse_error", "")
    print(str((i+1)) + "秒: " + status + ", " + str(pages) + "页, " + str(text_len) + "字")
    if err:
        print("  错误:", err)
    
    if status == "success":
        doc_id = d["id"]
        rc = requests.get(BASE + "/documents/" + str(claim_id) + "/" + str(doc_id) + "/content", 
            headers={"Authorization":"Bearer " + token})
        content = rc.json()
        print("内容页数:", len(content))
        if content:
            preview = content[0]["content"][:60].replace("\n", " ")
            print("预览:", preview + "...")
        
        print("\n生成摘要...")
        rs = requests.post(BASE + "/summaries/" + str(claim_id) + "/generate",
            headers={"Authorization":"Bearer " + token})
        sid = rs.json()["summary"]["id"]
        print("摘要ID:", sid)
        
        rd = requests.get(BASE + "/summaries/" + str(sid),
            headers={"Authorization":"Bearer " + token})
        sd = rd.json()
        
        print("\n提取结果:")
        if "structured" in sd:
            for cat, items in sd["structured"].items():
                if items:
                    print("  " + cat + ": " + str(len(items)) + " 项")
        
        if sd.get("conflicts"):
            print("冲突: " + str(len(sd["conflicts"])) + " 个")
            for c in sd["conflicts"][:2]:
                print("    [" + c["severity"] + "] " + c["description"][:60])
        
        if sd.get("missing_items"):
            print("缺件: " + str(len(sd["missing_items"])) + " 项")
        
        if sd.get("follow_up_points"):
            print("追问: " + str(len(sd["follow_up_points"])) + " 个")
        
        print("\n文本文件测试成功！")
        sys.exit(0)

print("\n测试超时，状态未变为 success")
