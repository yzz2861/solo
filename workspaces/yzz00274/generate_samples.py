import random
import csv
import os

def generate_valid_id_card():
    areas = ['110101', '310101', '440101', '330101', '320101', '510101', '420101', '610101']
    area = random.choice(areas)
    year = random.randint(1990, 2005)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    birth = f'{year}{month:02d}{day:02d}'
    seq = f'{random.randint(1, 999):03d}'
    first17 = area + birth + seq
    weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    check_codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
    total = sum(int(first17[i]) * weights[i] for i in range(17))
    check_code = check_codes[total % 11]
    return first17 + check_code

surnames = ['张', '李', '王', '赵', '钱', '孙', '周', '吴', '郑', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤']
names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '霞', '平', '华']
cities = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '济南']
schools = ['第一小学', '实验小学', '中心小学', '育才小学', '阳光小学']
grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
companies = ['中国平安', '中国人寿', '太平洋保险', '中国人保', '新华保险']

random.seed(42)

os.makedirs('sample_data', exist_ok=True)

# 文件1：混合正常、待复核、异常
records_1 = []

# 6条正常记录
for i in range(6):
    surname = random.choice(surnames)
    name = random.choice(names)
    city = random.choice(cities)
    records_1.append({
        '姓名': surname + name,
        '身份证号': generate_valid_id_card(),
        '联系电话': f'138{random.randint(10000000, 99999999)}',
        '学校': city + random.choice(schools),
        '年级': random.choice(grades),
        '活动名称': city + '文化研学活动',
        '活动开始日期': '2025-07-01',
        '活动结束日期': '2025-07-05',
        '保险公司': random.choice(companies),
        '保单号': f'PA{random.randint(202500000, 202599999)}',
        '保额': random.choice([300000, 400000, 500000, 600000]),
        '保费': random.choice([30, 40, 50, 60]),
    })

# 异常：缺少身份证号
records_1.append({
    '姓名': '王小明',
    '身份证号': '',
    '联系电话': '13700137003',
    '学校': '广州天河小学',
    '年级': '四年级',
    '活动名称': '广州长隆研学游',
    '活动开始日期': '2025-07-15',
    '活动结束日期': '2025-07-18',
    '保险公司': '太平洋保险',
    '保单号': 'TP202507003',
    '保额': 400000,
    '保费': 40,
})

# 待复核：电话号码格式不对
records_1.append({
    '姓名': '赵小红',
    '身份证号': generate_valid_id_card(),
    '联系电话': '136001360',
    '学校': '深圳南山小学',
    '年级': '六年级',
    '活动名称': '深圳户外拓展训练',
    '活动开始日期': '2025-07-20',
    '活动结束日期': '2025-07-25',
    '保险公司': '中国平安',
    '保单号': 'PA202507004',
    '保额': 200000,
    '保费': 25,
})

# 待复核：有保单号但缺少保险公司
records_1.append({
    '姓名': '钱小华',
    '身份证号': generate_valid_id_card(),
    '联系电话': '13500135005',
    '学校': '杭州西湖小学',
    '年级': '二年级',
    '活动名称': '杭州西湖文化研学',
    '活动开始日期': '2025-06-30',
    '活动结束日期': '2025-07-02',
    '保险公司': '',
    '保单号': 'CL202507005',
    '保额': 100000,
    '保费': 15,
})

# 异常：开始日期晚于结束日期
records_1.append({
    '姓名': '李小强',
    '身份证号': generate_valid_id_card(),
    '联系电话': '13400134006',
    '学校': '南京鼓楼小学',
    '年级': '一年级',
    '活动名称': '南京中山陵研学活动',
    '活动开始日期': '2025-08-05',
    '活动结束日期': '2025-08-03',
    '保险公司': '中国人寿',
    '保单号': 'CL202507006',
    '保额': 50000,
    '保费': 10,
})

# 正常但高风险活动
records_1.append({
    '姓名': '郑小军',
    '身份证号': generate_valid_id_card(),
    '联系电话': '13100131009',
    '学校': '北京朝阳小学',
    '年级': '五年级',
    '活动名称': '北京攀岩探险营',
    '活动开始日期': '2025-07-20',
    '活动结束日期': '2025-07-27',
    '保险公司': '中国人寿',
    '保单号': 'CL202507009',
    '保额': 800000,
    '保费': 100,
})

with open('sample_data/insurance_list_1.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=records_1[0].keys())
    writer.writeheader()
    writer.writerows(records_1)

print(f'生成文件1：{len(records_1)}条记录')

# 文件2
records_2 = []

# 5条正常记录
for i in range(5):
    surname = random.choice(surnames)
    name = random.choice(names)
    city = random.choice(cities)
    records_2.append({
        '姓名': surname + name + '二',
        '身份证号': generate_valid_id_card(),
        '联系电话': f'139{random.randint(10000000, 99999999)}',
        '学校': city + random.choice(schools),
        '年级': random.choice(grades),
        '活动名称': city + '科技馆实践活动',
        '活动开始日期': '2025-07-10',
        '活动结束日期': '2025-07-12',
        '保险公司': random.choice(companies),
        '保单号': f'CL{random.randint(202500000, 202599999)}',
        '保额': random.choice([250000, 350000, 450000, 550000]),
        '保费': random.choice([25, 35, 45, 55]),
    })

# 异常：缺少姓名和活动名称
records_2.append({
    '姓名': '',
    '身份证号': generate_valid_id_card(),
    '联系电话': '13600136012',
    '学校': '天津和平小学',
    '年级': '五年级',
    '活动名称': '',
    '活动开始日期': '2025-07-18',
    '活动结束日期': '2025-07-20',
    '保险公司': '中国人寿',
    '保单号': 'CL202507012',
    '保额': 150000,
    '保费': 20,
})

# 高风险活动：野外探险
records_2.append({
    '姓名': '褚大伟',
    '身份证号': generate_valid_id_card(),
    '联系电话': '13700137013',
    '学校': '福州鼓楼小学',
    '年级': '三年级',
    '活动名称': '福州武夷山野外探险',
    '活动开始日期': '2025-07-22',
    '活动结束日期': '2025-07-28',
    '保险公司': '太平洋保险',
    '保单号': 'TP202507013',
    '保额': 700000,
    '保费': 80,
})

# 待复核：缺少联系电话
records_2.append({
    '姓名': '沈小丽',
    '身份证号': generate_valid_id_card(),
    '联系电话': '',
    '学校': '长沙岳麓小学',
    '年级': '二年级',
    '活动名称': '长沙橘子洲研学',
    '活动开始日期': '2025-07-08',
    '活动结束日期': '2025-07-09',
    '保险公司': '太平洋保险',
    '保单号': 'TP202507016',
    '保额': 200000,
    '保费': 20,
})

# 正常但保额较低
records_2.append({
    '姓名': '杨小芳',
    '身份证号': generate_valid_id_card(),
    '联系电话': '13300133018',
    '学校': '贵阳南明小学',
    '年级': '三年级',
    '活动名称': '贵阳黄果树瀑布研学',
    '活动开始日期': '2025-07-25',
    '活动结束日期': '2025-07-30',
    '保险公司': '中国人寿',
    '保单号': 'CL202507018',
    '保额': 8000,
    '保费': 8,
})

# 异常：15位身份证格式不对
records_2.append({
    '姓名': '朱晓强',
    '身份证号': '12345678901234',
    '联系电话': '13200132019',
    '学校': '石家庄桥西小学',
    '年级': '四年级',
    '活动名称': '石家庄西柏坡红色研学',
    '活动开始日期': '2025-07-16',
    '活动结束日期': '2025-07-18',
    '保险公司': '太平洋保险',
    '保单号': 'TP202507019',
    '保额': 400000,
    '保费': 40,
})

with open('sample_data/insurance_list_2.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=records_2[0].keys())
    writer.writeheader()
    writer.writerows(records_2)

print(f'生成文件2：{len(records_2)}条记录')
print('示例数据生成完成！')
