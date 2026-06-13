#!/usr/bin/env python3
"""生成各种格式的测试文件，用于验证材料解析链路"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'test_materials')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_font_path():
    """尝试获取中文字体路径"""
    font_paths = [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            return fp
    return None

def create_medical_pdf():
    """创建门诊病历 PDF"""
    output_path = os.path.join(OUTPUT_DIR, '门诊病历.pdf')
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    
    font_path = get_font_path()
    if font_path:
        try:
            pdfmetrics.registerFont(TTFont('Chinese', font_path))
            c.setFont('Chinese', 14)
        except:
            c.setFont('Helvetica', 12)
    else:
        c.setFont('Helvetica', 12)
    
    y = height - 50
    lines = [
        '门诊病历',
        '',
        '姓名：张三',
        '性别：男',
        '年龄：35岁',
        '就诊日期：2024-06-10',
        '科室：内科',
        '',
        '主诉：发热、咳嗽3天',
        '',
        '现病史：患者3天前受凉后出现发热，体温最高38.5℃，',
        '伴咳嗽、咳黄痰，无胸痛、咯血。自行服用感冒药',
        '后症状无明显缓解。',
        '',
        '既往史：体健，无高血压、糖尿病史。',
        '',
        '体格检查：T 37.8℃，P 88次/分，R 20次/分，',
        'BP 120/80mmHg。咽部充血，双侧扁桃体Ⅰ度肿大。',
        '双肺呼吸音粗，可闻及散在湿啰音。',
        '',
        '诊断：',
        '1. 急性支气管炎',
        '2. 上呼吸道感染',
        '',
        '医师：李医生',
        '日期：2024-06-10',
    ]
    
    for line in lines:
        c.drawString(50, y, line)
        y -= 22
    
    c.save()
    print(f'✅ 已创建: {output_path}')

def create_invoice_pdf():
    """创建住院发票 PDF（2页）"""
    output_path = os.path.join(OUTPUT_DIR, '住院发票.pdf')
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    
    font_path = get_font_path()
    if font_path:
        try:
            pdfmetrics.registerFont(TTFont('Chinese', font_path))
            c.setFont('Chinese', 12)
        except:
            c.setFont('Helvetica', 11)
    else:
        c.setFont('Helvetica', 11)
    
    # 第一页
    y = height - 50
    lines1 = [
        '医院住院收费票据',
        '',
        '发票号：INV20240615001',
        '患者姓名：张三',
        '性别：男',
        '年龄：35岁',
        '住院号：ZY20240608001',
        '入院日期：2024-06-08',
        '出院日期：2024-06-15',
        '住院天数：7天',
        '',
        '费用明细：',
        '',
        '项目名称         金额（元）',
        '──────────────────────',
        '床位费           1,050.00',
        '护理费             350.00',
        '检查费           2,800.00',
        '化验费           1,200.00',
        '治疗费             980.00',
        '药品费           3,560.00',
        '手术费               0.00',
    ]
    
    for line in lines1:
        c.drawString(50, y, line)
        y -= 20
    
    c.showPage()
    
    # 第二页
    y = height - 50
    lines2 = [
        '医院住院收费票据（续）',
        '',
        '费用明细（续）：',
        '',
        '项目名称         金额（元）',
        '──────────────────────',
        '其他费用           556.50',
        '',
        '──────────────────────',
        '合计：          10,496.50',
        '',
        '医保支付：       7,347.55',
        '个人支付：       3,148.95',
        '',
        '折扣说明：本次费用享受医保报销比例70%',
        '',
        '收费日期：2024-06-15',
        '收费员：王收费',
    ]
    
    for line in lines2:
        c.drawString(50, y, line)
        y -= 22
    
    c.save()
    print(f'✅ 已创建: {output_path}')

def create_accident_image():
    """创建事故说明图片（模拟手写/打印的事故说明）"""
    output_path = os.path.join(OUTPUT_DIR, '事故说明.png')
    
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    font_path = get_font_path()
    if font_path:
        try:
            font_large = ImageFont.truetype(font_path, 24)
            font_normal = ImageFont.truetype(font_path, 16)
        except:
            font_large = ImageFont.load_default()
            font_normal = ImageFont.load_default()
    else:
        font_large = ImageFont.load_default()
        font_normal = ImageFont.load_default()
    
    draw.text((300, 30), '交通事故说明', fill='black', font=font_large)
    
    lines = [
        '',
        '事故时间：2024年6月15日 上午9:30',
        '事故地点：北京市朝阳区建国路88号路口',
        '',
        '事故经过：',
        '  本人张三（身份证号：110101198901011234）',
        '驾驶小型轿车（车牌号：京A12345）由东向西',
        '行驶至上述地点时，因前方车辆突然变道，',
        '本人采取紧急制动措施，但仍与前车发生追尾。',
        '',
        '  事故造成本人车辆前部受损，无人员伤亡。',
        '对方车辆后部轻微受损，对方司机无受伤。',
        '',
        '  事故发生后已报警，交警认定对方全责。',
        '',
        '特此说明。',
        '',
        '说明人：张三',
        '日期：2024年6月16日',
    ]
    
    y = 80
    for line in lines:
        draw.text((50, y), line, fill='black', font=font_normal)
        y += 26
    
    img.save(output_path)
    print(f'✅ 已创建: {output_path}')

def create_invoice_image():
    """创建发票图片（模拟拍照的发票）"""
    output_path = os.path.join(OUTPUT_DIR, '门诊发票.jpg')
    
    img = Image.new('RGB', (600, 800), color='white')
    draw = ImageDraw.Draw(img)
    
    font_path = get_font_path()
    if font_path:
        try:
            font_title = ImageFont.truetype(font_path, 22)
            font_normal = ImageFont.truetype(font_path, 15)
        except:
            font_title = ImageFont.load_default()
            font_normal = ImageFont.load_default()
    else:
        font_title = ImageFont.load_default()
        font_normal = ImageFont.load_default()
    
    draw.text((180, 30), '医院门诊收费票据', fill='black', font=font_title)
    
    lines = [
        '',
        '发票号：MZ20240610088',
        '患者姓名：张三',
        '性别：男',
        '年龄：35岁',
        '就诊日期：2024-06-10',
        '科室：内科',
        '',
        '─────────────────────',
        '',
        '项目名称       金额（元）',
        '',
        '挂号费            50.00',
        '诊疗费           120.00',
        '检查费           380.00',
        '化验费           180.00',
        '药品费           550.50',
        '',
        '─────────────────────',
        '',
        '合计：         1,280.50',
        '',
        '医保支付：       896.35',
        '个人支付：       384.15',
        '',
        '收费日期：2024-06-10',
    ]
    
    y = 80
    for line in lines:
        draw.text((50, y), line, fill='black', font=font_normal)
        y += 28
    
    img.save(output_path, 'JPEG', quality=85)
    print(f'✅ 已创建: {output_path}')

def create_medical_text():
    """创建门诊病历文本文件"""
    output_path = os.path.join(OUTPUT_DIR, '门诊病历.txt')
    
    content = '''门诊病历

姓名：李四
性别：女
年龄：28岁
就诊日期：2024-06-05
科室：皮肤科

主诉：全身皮疹伴瘙痒1周

现病史：患者1周前食用海鲜后出现全身皮疹，
以四肢及躯干为主，呈红色风团样，伴明显瘙痒，
皮疹此起彼伏，夜间加重。自行服用抗过敏药物后
症状稍缓解，但仍有反复。

既往史：既往有过敏性鼻炎病史，对海鲜过敏。

体格检查：四肢及躯干可见散在红色风团，
形态不规则，压之褪色。皮肤划痕症阳性。

诊断：
1. 荨麻疹
2. 过敏性皮炎

处理意见：
1. 口服抗组胺药物
2. 外用炉甘石洗剂
3. 避免食用海鲜等易过敏食物
4. 如症状加重及时就诊

医师：陈医生
日期：2024-06-05
'''
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✅ 已创建: {output_path}')

def main():
    print('=' * 60)
    print('生成测试文件（用于验证材料解析链路）')
    print('=' * 60)
    print()
    
    create_medical_pdf()
    create_invoice_pdf()
    create_accident_image()
    create_invoice_image()
    create_medical_text()
    
    print()
    print('=' * 60)
    print(f'所有测试文件已生成到: {OUTPUT_DIR}')
    print('=' * 60)
    print()
    print('可用的测试文件：')
    for f in sorted(os.listdir(OUTPUT_DIR)):
        fp = os.path.join(OUTPUT_DIR, f)
        size = os.path.getsize(fp)
        print(f'  - {f} ({size} 字节)')

if __name__ == '__main__':
    main()
