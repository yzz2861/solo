#!/usr/bin/env python3
import requests
import json
import time
import os

BASE_URL = "http://localhost:3001/api"
TOKEN = None

def login():
    global TOKEN
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "adjuster1",
        "password": "adjuster123"
    })
    TOKEN = r.json()["token"]
    print(f"✅ 登录成功，Token: {TOKEN[:20]}...")

def create_claim():
    r = requests.post(f"{BASE_URL}/claims", json={
        "customer_name": "测试-文件解析验证",
        "phone": "13900000001",
        "accident_date": "2024-06-20"
    }, headers={"Authorization": f"Bearer {TOKEN}"})
    claim = r.json()
    print(f"✅ 创建案件: ID={claim['id']}, 案件号={claim['claim_no']}")
    return claim["id"]

def upload_file(claim_id, file_path, doc_type):
    filename = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        files = {"files": (filename, f)}
        data = {"doc_type": doc_type}
        r = requests.post(f"{BASE_URL}/documents/{claim_id}", 
                         files=files, data=data,
                         headers={"Authorization": f"Bearer {TOKEN}"})
    docs = r.json()
    if isinstance(docs, list) and len(docs) > 0:
        doc = docs[0]
        print(f"📤 上传文件: {filename}")
        print(f"   状态: {doc.get('parse_status', 'N/A')}")
        return doc["id"]
    else:
        print(f"❌ 上传失败: {docs}")
        return None

def check_doc_status(claim_id, doc_id):
    r = requests.get(f"{BASE_URL}/documents/{claim_id}/{doc_id}/status",
                    headers={"Authorization": f"Bearer {TOKEN}"})
    return r.json()

def list_docs(claim_id):
    r = requests.get(f"{BASE_URL}/documents/{claim_id}",
                    headers={"Authorization": f"Bearer {TOKEN}"})
    return r.json()

def get_doc_content(claim_id, doc_id):
    r = requests.get(f"{BASE_URL}/documents/{claim_id}/{doc_id}/content",
                    headers={"Authorization": f"Bearer {TOKEN}"})
    return r.json()

def generate_summary(claim_id):
    r = requests.post(f"{BASE_URL}/summaries/{claim_id}/generate",
                     headers={"Authorization": f"Bearer {TOKEN}"})
    return r.json()

def get_summary(summary_id):
    r = requests.get(f"{BASE_URL}/summaries/{summary_id}",
                    headers={"Authorization": f"Bearer {TOKEN}"})
    return r.json()

def wait_for_parsing(claim_id, doc_ids, timeout=60):
    print("⏳ 等待文件解析完成...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        docs = list_docs(claim_id)
        all_done = True
        for doc in docs:
            if doc["id"] in doc_ids:
                status = doc.get("parse_status", "pending")
                if status in ("processing", "pending"):
                    all_done = False
                    break
        if all_done:
            print("✅ 所有文件解析完成！")
            return True
        time.sleep(2)
    print("⚠️  解析超时")
    return False

def main():
    print("=" * 60)
    print("保险理赔材料解析测试")
    print("=" * 60)
    
    login()
    claim_id = create_claim()
    
    doc_ids = []
    
    print("\n📁 测试1: 文本文件 (.txt)")
    txt_id = upload_file(claim_id, "test_sample_insurance.txt", "medical")
    if txt_id:
        doc_ids.append(txt_id)
    
    wait_for_parsing(claim_id, doc_ids)
    
    print("\n📄 解析结果:")
    docs = list_docs(claim_id)
    for doc in docs:
        status = doc.get("parse_status", "N/A")
        pages = doc.get("page_count", 0)
        text_len = doc.get("text_length", 0)
        err = doc.get("parse_error", "")
        print(f"  {doc['file_name']}:")
        print(f"    状态: {status}")
        print(f"    页数: {pages}, 字数: {text_len}")
        if err:
            print(f"    错误: {err}")
        
        if status == "success":
            content = get_doc_content(claim_id, doc["id"])
            if content and len(content) > 0:
                preview = content[0]["content"][:100].replace("\n", " ")
                print(f"    内容预览: {preview}...")
    
    print("\n📊 测试2: 生成摘要")
    summary_data = generate_summary(claim_id)
    if "summary" in summary_data:
        sid = summary_data["summary"]["id"]
        print(f"✅ 摘要生成成功: ID={sid}")
        
        summary_detail = get_summary(sid)
        print(f"   结构化数据:")
        if "structured" in summary_detail:
            for cat, items in summary_detail["structured"].items():
                if items:
                    print(f"     {cat}: {len(items)} 项")
        
        if "conflicts" in summary_detail and summary_detail["conflicts"]:
            print(f"   冲突检测: {len(summary_detail['conflicts'])} 个")
            for c in summary_detail["conflicts"][:3]:
                print(f"     [{c['severity']}] {c['description'][:50]}")
        
        if "missing_items" in summary_detail and summary_detail["missing_items"]:
            print(f"   缺失材料: {len(summary_detail['missing_items'])} 项")
        
        if "follow_up_points" in summary_detail and summary_detail["follow_up_points"]:
            print(f"   追问点: {len(summary_detail['follow_up_points'])} 个")
    else:
        print(f"❌ 摘要生成失败: {summary_data}")
    
    print("\n" + "=" * 60)
    print("测试完成！")
    print("=" * 60)

if __name__ == "__main__":
    main()
