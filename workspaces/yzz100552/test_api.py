import base64, os, urllib.request, urllib.parse, json

BASE = "http://localhost:8001"

def post(path, data=None, form=None):
    if data is not None:
        req = urllib.request.Request(
            BASE + path, data=json.dumps(data).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
    elif form is not None:
        boundary = "----TestBoundary123"
        body = b""
        for k, v in form.items():
            if k == "file":
                fname, fdata = v
                body += f"--{boundary}\r\n".encode()
                body += f'Content-Disposition: form-data; name="file"; filename="{fname}"\r\n'.encode()
                body += b"Content-Type: image/jpeg\r\n\r\n"
                body += fdata + b"\r\n"
            else:
                body += f"--{boundary}\r\n".encode()
                body += f'Content-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
        body += f"--{boundary}--\r\n".encode()
        req = urllib.request.Request(
            BASE + path, data=body, method="POST",
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    else:
        req = urllib.request.Request(BASE + path, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def get(path, qs=None):
    url = BASE + path
    if qs:
        url += "?" + urllib.parse.urlencode(qs)
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.status, json.loads(r.read().decode())

jpg = base64.b64decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==')

print("=== 上传篷布照片 ===")
s, d = post("/api/photos/upload", form={
    "record_id": "1", "photo_type": "tarp", "uploaded_by": "安全员老钱",
    "file": ("tarp.jpg", jpg),
})
print(s, d.get("message") or d.get("detail"))

print("\n=== 上传洗轮后照片 ===")
s, d = post("/api/photos/upload", form={
    "record_id": "1", "photo_type": "wheel_after", "uploaded_by": "安全员老钱",
    "file": ("wheel.jpg", jpg),
})
print(s, d.get("message") or d.get("detail"))

print("\n=== 解决拦截记录 ===")
s, d = post("/api/vehicles/blocks/1/resolve", data={
    "resolve_method": "已补拍篷布和洗轮后照片，重新检查",
    "resolve_operator": "安全员老钱",
})
print(s, d.get("plate_number") or d.get("detail"), "resolved=", d.get("resolved"))

print("\n=== 再次检查（全部通过） ===")
s, d = post("/api/vehicles/1/inspect", data={
    "inspector": "安全员老钱", "tarp_cover_ok": True, "tarp_photo_taken": True,
    "wheel_clean_ok": True, "body_clean_ok": True, "license_plate_clear": True,
    "overloaded": False,
})
msg = d.get("message") if isinstance(d, dict) else d
passed = d.get("data", {}).get("passed") if isinstance(d, dict) else None
print(s, msg, "| passed=", passed)

print("\n=== 出场 ===")
s, d = post("/api/vehicles/1/exit", data={"gate_operator": "门岗李师傅"})
st = d.get("status") if isinstance(d, dict) else None
exit_t = d.get("exit_time") if isinstance(d, dict) else None
print(s, "status=", st, "exit_time=", exit_t)

print("\n=== 门岗实时排队 ===")
s, d = get("/api/vehicles/queue")
print(s, "排队数量:", len(d))
for x in d:
    print(" -", x["plate_number"], x["status_text"], "排队#", x["queue_position"], "等待", x["wait_minutes"], "分钟")

print("\n=== 环保抽查 - 按车牌查找 ===")
s, d = get("/api/vehicles/lookup", {"plate_number": "京A12345"})
print(s, "找到记录:", len(d))
for r in d:
    print(" - id=%s status=%s 进场=%s 出场=%s" % (r["id"], r["status"], r["entry_time"], r["exit_time"]))
    photos = r.get("photos", [])
    print("   照片数:", len(photos), [p["photo_type"] for p in photos])
    blocks = r.get("block_records", [])
    print("   拦截记录:", len(blocks))
    for b in blocks:
        print("     *", b["block_time"], "原因:", b["block_reason"], "| 环保问题:", b["is_environmental_issue"])

print("\n=== 门岗交班流水 ===")
s, d = get("/api/vehicles/shift-flow", {"shift": "all"})
print(s, "日期:", d.get("shift_date"), "班次:", d.get("shift"))
print("  汇总:", d.get("summary"))
print("  车辆流水数:", len(d.get("records", [])))

print("\n=== 安全员当日汇总 ===")
s, d = get("/api/safety/summary")
print(s, "统计:", d.get("counts"))

print("\n=== 完成所有测试 ===")
