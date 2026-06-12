#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成测试用日志样本 - 覆盖各种脱敏场景和异常场景
"""
import os
import json
import random
from pathlib import Path

RAW_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs_raw")
Path(RAW_DIR).mkdir(exist_ok=True)

def write(path, lines):
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"  生成: {path}  ({len(lines)} 行)")

# ---------- 1. 用户服务（多种敏感字段） ----------
svc1 = []
svc1.append('2026-06-10 10:15:22 INFO  UserController login: user=zhangsan phone=13812345678 token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.7fC8qFdY9qkMGOekJ0x3n_ABTq1-ExampleExampleEx')
svc1.append('2026-06-10 10:15:23 DEBUG 请求参数: {"userId":1001,"mobile":"13987654321","password":"MySecret123!","email":"zhangsan@example.com"}')
svc1.append('2026-06-10 10:15:24 INFO  发送验证码到 +86 15011112222 成功')
svc1.append('2026-06-10 10:15:25 WARN  身份证 110101199001011234 已绑定其他账号')
svc1.append('2026-06-10 10:15:26 INFO  支付请求 card=6222 0202 0202 0202 amount=99.00')
svc1.append('2026-06-10 10:15:27 INFO  回调 URL: https://api.example.com/notify?token=abcXYZ987654321secretKey&orderId=99887')
svc1.append('2026-06-10 10:15:28 INFO  HTTP POST /api/user header: Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.signaturePart.verysignature1234567890abcdefgh')
svc1.append('2026-06-10 10:15:29 INFO  Cookie: sessionId=a1b2c3d4e5f67890; JSESSIONID=ABCDEF1234567890GHIJ')
svc1.append('2026-06-10 10:15:30 DEBUG apiKey=STRIPE_SECRET_KEY_EXAMPLE secret=PRIVATE_key_1234_xyz')
svc1.append('2026-06-10 10:15:31 INFO  正常日志行，没有敏感信息，就是普通处理')
# 半截 JSON
svc1.append('2026-06-10 10:15:32 ERROR 请求异常: {"code":500, "msg":"timeout", "detail":{')
# 超长行
long_line = "2026-06-10 10:15:33 DEBUG 超长请求体: " + "A" * 6000
svc1.append(long_line)
write(os.path.join(RAW_DIR, "user-service_2026-06-10.log"), svc1)

# ---------- 2. 用户服务 第二天 ----------
svc2 = []
svc2.append('2026-06-11 09:00:01 INFO  UserService 注册新用户 phone=15566667777 password=StrongP@ss1')
svc2.append('2026-06-11 09:00:02 INFO  access_token: pk.eyJ1IjoiZGVtbyJ9.signature.sign1234567890abcdef')
write(os.path.join(RAW_DIR, "user-service_2026-06-11.log"), svc2)

# ---------- 3. 订单服务 ----------
ord = []
ord.append('20260610 11:22:33 INFO OrderService createOrder userId=1001 phone=18600001111 card_no=6222020202020200001')
ord.append('20260610 11:22:34 INFO headers: authToken=Bearer_tok_abc_xyz_123456789_signed')
ord.append('20260610 11:22:35 INFO 半截JSON示例: {"orderId":123, "items": [{"id":1, "name":"prod'), 
write(os.path.join(RAW_DIR, "order-service_20260610_001.log"), ord)

# ---------- 4. 订单服务 重复文件（内容完全相同） ----------
write(os.path.join(RAW_DIR, "order-service_20260610_002.log"), ord)

# ---------- 5. 订单服务 子目录里的 ----------
sub_dir = os.path.join(RAW_DIR, "archive_backup")
os.makedirs(sub_dir, exist_ok=True)
ord2 = []
ord2.append('2026-06-10 12:00:00 INFO backup job run, user=test@test.com idcard=310101199505055678')
write(os.path.join(sub_dir, "order-service_2026-06-10_backup.log"), ord2)

# ---------- 6. 支付服务（没敏感信息，用于触发 NO_MATCH 告警） ----------
pay = []
pay.append('2026-06-10 14:00:00 INFO 任务调度开始')
pay.append('2026-06-10 14:00:01 INFO 处理了 100 条记录，成功 98，失败 2')
pay.append('2026-06-10 14:00:02 INFO 任务调度结束，耗时 1.23s')
write(os.path.join(RAW_DIR, "payment-service_2026-06-10.log"), pay)

# ---------- 7. Metrics 服务（白名单，不应触发 NO_MATCH 告警） ----------
met = []
met.append('2026-06-10 14:10:00 INFO metrics qps=1024 rt=50ms err=0')
write(os.path.join(RAW_DIR, "metrics_2026-06-10.log"), met)

# ---------- 8. 未知日期未知服务 ----------
unk = []
unk.append('WARN 这行没有日期标识')
unk.append('ERROR user phone is 15688889999 but also token=abcdefghijklmnopqrst1234567890')
write(os.path.join(RAW_DIR, "random.txt"), unk)

print(f"\n✅  测试数据生成完毕，目录: {RAW_DIR}")
