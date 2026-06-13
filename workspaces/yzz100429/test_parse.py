from badminton_verify.reader import parse_wechat_text, parse_partner_field, read_and_parse

print("=" * 70)
print("📱 微信群文本解析测试")
print("=" * 70)

test_cases = [
    "张三 13800138001 报名男单",
    "周九 13800138009 男 飞羽 报名男双 搭档: 李四",
    "吴十 13800138010 女 旋风羽球 女单",
    "钱六 13800138006 女 报名混双 搭档: 王五 13800138005",
    "王芳 13900139002 女 青云 女双 搭档:李娜 13900139003",
    "陈刚 13700137004 男 报名男子双打 混合双打",
]

for text in test_cases:
    print(f"\n📝 原始: {text}")
    result = parse_wechat_text(text)
    print(f"   姓名: {result['name']}  手机: {result['phone']}")
    print(f"   性别: {result['gender']}  俱乐部: {result['club']}")
    print(f"   项目: {result['events']}")
    print(f"   搭档: {result['partner_name']} / {result['partner_phone']}")

print("\n" + "=" * 70)
print("🤝 俱乐部搭档解析测试")
print("=" * 70)

partner_cases = [
    "张三 13800138001",
    "郑十一 13800138011",
    "李四",
    "王五/13800138005",
    "13800138006 钱六",
]

for p in partner_cases:
    name, phone = parse_partner_field(p)
    print(f"   '{p}' → 姓名: '{name}', 手机: '{phone}'")

print("\n" + "=" * 70)
print("📂 完整文件解析测试 - 微信群报名")
print("=" * 70)

result = read_and_parse('./test_data/02_微信群报名.xlsx', source_type='wechat')
for rec in result['records']:
    print(f"\n第{rec['row_index']}行:")
    print(f"   姓名: {rec['name']}  手机: {rec['phone']}")
    print(f"   性别: {rec['gender']}  俱乐部: {rec['club']}")
    print(f"   项目: {rec['events']}")
    print(f"   搭档: {rec['partner_name']} / {rec['partner_phone']}")

print("\n" + "=" * 70)
print("📂 完整文件解析测试 - 俱乐部代报")
print("=" * 70)

result2 = read_and_parse('./test_data/03_俱乐部代报.xlsx', source_type='club')
for rec in result2['records']:
    print(f"\n第{rec['row_index']}行: {rec['name']} 报 {rec['events']}")
    print(f"   搭档: {rec['partner_name']} / {rec['partner_phone']}")
    print(f"   俱乐部: {rec['club']}")

print("\n" + "=" * 70)
print("✅ 全部解析测试完成")
print("=" * 70)
