#!/usr/bin/env python3
import requests, json, time, sys

BASE = "http://localhost:3001/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRqdXN0ZXIxIiwicm9sZSI6ImFkanVzdGVyIiwiaWF0IjoxNzgxMjI5NzM2LCJleHAiOjE3ODE4MzQ1MzZ9.tk4AGLebsJgkeNT2esJ3R7dpI3X1C7YhMdFkqJ7fnCA"
HEADERS = {"Authorization": "Bearer " + TOKEN}

def test_summary_generation():
    print("=" * 60)
    print("测试：摘要生成（基于已解析文档）")
    print("=" * 60)
    
    # 生成摘要
    r = requests.post(BASE + "/summaries/1/generate", headers=HEADERS)
    print(f"\n生成状态: {r.status_code}")
    if r.status_code != 200:
        print(f"  错误: {r.text}")
        return False
    
    data = r.json()
    summary = data["summary"]
    print(f"摘要ID: {summary['id']}")
    print(f"状态: {summary['status']}")
    
    # 结构化数据
    structured = summary.get("structured") or {}
    print(f"\n结构化数据:")
    for cat, items in structured.items():
        if items:
            print(f"  {cat}: {len(items)} 项")
            for item in items[:2]:
                source = item.get("source_ref", "无来源")
                print(f"    - {str(item)[:60]}... 来源: {source}")
    
    # 冲突
    conflicts = summary.get("conflicts") or []
    print(f"\n冲突: {len(conflicts)} 个")
    for c in conflicts[:3]:
        print(f"  [{c['severity']}] {c['description'][:80]}")
    
    # 缺件
    missing = summary.get("missing_items") or []
    print(f"\n缺件: {len(missing)} 项")
    for m in missing[:5]:
        print(f"  - {m}")
    
    # 追问点
    followup = summary.get("follow_up_points") or []
    print(f"\n追问点: {len(followup)} 个")
    for f in followup[:3]:
        print(f"  - {f[:80]}")
    
    # 风险提示
    risks = summary.get("risk_flags") or []
    print(f"\n风险提示: {len(risks)} 个")
    for r in risks[:3]:
        print(f"  [{r['level']}] {r['description'][:80]}")
    
    return True

if __name__ == "__main__":
    test_summary_generation()
