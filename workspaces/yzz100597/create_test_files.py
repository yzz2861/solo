import os
from PIL import Image

test_dir = 'test_customer'
os.makedirs(test_dir, exist_ok=True)

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    c = canvas.Canvas(os.path.join(test_dir, '宣传册.pdf'), pagesize=A4)
    c.drawString(100, 750, '测试文件 1 - 宣传册')
    c.showPage()
    c.drawString(100, 750, '第 2 页')
    c.showPage()
    c.drawString(100, 750, '第 3 页')
    c.showPage()
    c.save()
    print('宣传册.pdf 已创建 (3页)')

    c2 = canvas.Canvas(os.path.join(test_dir, '报价单.pdf'), pagesize=A4)
    c2.drawString(100, 750, '报价单 - 第一页')
    c2.showPage()
    c2.save()
    print('报价单.pdf 已创建 (1页)')

    c3 = canvas.Canvas(os.path.join(test_dir, '合同_v1.pdf'), pagesize=A4)
    c3.drawString(100, 750, '合同版本 1')
    c3.showPage()
    c3.save()
    print('合同_v1.pdf 已创建')

    c4 = canvas.Canvas(os.path.join(test_dir, '合同_v2.pdf'), pagesize=A4)
    c4.drawString(100, 750, '合同版本 2 - 修订版')
    c4.showPage()
    c4.drawString(100, 750, '第 2 页')
    c4.showPage()
    c4.save()
    print('合同_v2.pdf 已创建')
except ImportError:
    print('reportlab 未安装，使用空PDF文件')
    for name in ['宣传册.pdf', '报价单.pdf', '合同_v1.pdf', '合同_v2.pdf']:
        path = os.path.join(test_dir, name)
        with open(path, 'wb') as f:
            f.write(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 750 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000015 00000 n\n0000000060 00000 n\n0000000111 00000 n\n0000000205 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n300\n%%EOF\n')
        print(f'{name} 已创建')

img = Image.new('RGB', (800, 600), color='lightblue')
img.save(os.path.join(test_dir, '产品图片.jpg'))
print('产品图片.jpg 已创建')

img2 = Image.new('RGB', (1024, 768), color='lightgreen')
img2.save(os.path.join(test_dir, '公司logo.png'))
print('公司logo.png 已创建')

with open(os.path.join(test_dir, '损坏文件.pdf'), 'wb') as f:
    f.write(b'this is not a valid pdf file')
print('损坏文件.pdf 已创建 (用于测试异常检测)')

with open(os.path.join(test_dir, '备注.txt'), 'w', encoding='utf-8') as f:
    f.write('客户：张三\n')
    f.write('双面彩打，骑马钉装订\n')
    f.write('宣传册打5份，其他各2份\n')
    f.write('一共6个文件\n')
    f.write('A4纸张\n')
print('备注.txt 已创建')

print('\n测试文件创建完成！')
