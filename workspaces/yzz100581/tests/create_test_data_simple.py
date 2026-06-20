"""生成测试照片数据 - 简化版，不依赖 piexif"""

import os
from pathlib import Path
from datetime import datetime, timedelta
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def create_test_image(path, size=(4000, 3000), shoot_time=None):
    """创建测试图片，生成随机噪点确保文件大小 > 10KB"""
    import numpy as np

    arr = np.random.randint(0, 255, (size[1], size[0], 3), dtype=np.uint8)
    img = Image.fromarray(arr, 'RGB')
    img.save(path, 'JPEG', quality=95)

    if shoot_time:
        timestamp = shoot_time.timestamp()
        os.utime(path, (timestamp, timestamp))

    return path

def main():
    photo_dir = Path(__file__).parent / "照片目录"

    for f in photo_dir.glob("IMG_*.jpg"):
        f.unlink()

    photo_dir.mkdir(parents=True, exist_ok=True)

    print(f"正在生成测试照片到: {photo_dir}")

    base_date = datetime(2024, 6, 15, 10, 0, 0)

    # 1. 正常照片 - 位置在对照表中（有 EXIF 测试通过文件修改时间模拟）
    for i in range(1, 6):
        shoot_time = base_date + timedelta(minutes=i*5)
        path = photo_dir / f"IMG_000{i}.jpg"
        create_test_image(str(path), shoot_time=shoot_time)
        print(f"  ✅ 已创建: {path.name} (有拍摄时间, 对照表中有完整位置)")

    # 2. 照片 - 位置不完整（用于测试待确认）
    for i in range(6, 9):
        shoot_time = base_date + timedelta(minutes=i*5)
        path = photo_dir / f"IMG_000{i}.jpg"
        create_test_image(str(path), shoot_time=shoot_time)
        print(f"  ⚠️  已创建: {path.name} (位置信息不完整)")

    # 3. 照片 - 有正常拍摄时间（EXIF 通过 Pillow 测试即可）
    for i in range(9, 11):
        shoot_time = base_date + timedelta(minutes=i*5)
        path = photo_dir / f"IMG_00{i}.jpg"
        create_test_image(str(path), shoot_time=shoot_time)
        print(f"  ✅ 已创建: {path.name} (有拍摄时间, 位置完整)")

    # 4. 小尺寸照片（小于100KB，用于测试待确认）
    small_path = photo_dir / "IMG_0011.jpg"
    small_img = Image.new('RGB', (320, 240), (200, 255, 200))
    small_img.save(str(small_path), 'JPEG', quality=50)
    print(f"  ⚠️  已创建: {small_path.name} (小尺寸, <100KB)")

    # 5. 未在对照表中的照片（用于测试未识别位置）
    for i in range(20, 23):
        shoot_time = base_date + timedelta(minutes=i*5)
        path = photo_dir / f"IMG_00{i}.jpg"
        create_test_image(str(path), shoot_time=shoot_time)
        print(f"  ❌ 已创建: {path.name} (未在对照表中)")

    # 6. 创建测试位置对照表
    map_file = Path(__file__).parent / "测试对照表.csv"
    with open(map_file, 'w', encoding='utf-8') as f:
        f.write("原始文件名,项目,楼栋,楼层,部位\n")
        f.write("IMG_0001,幸福花园,1号楼,3层,客厅\n")
        f.write("IMG_0002,幸福花园,1号楼,3层,主卧\n")
        f.write("IMG_0003,幸福花园,1号楼,3层,卫生间\n")
        f.write("IMG_0004,幸福花园,2号楼,5层,厨房\n")
        f.write("IMG_0005,幸福花园,2号楼,5层,阳台\n")
        f.write("IMG_0006,幸福花园,1号楼,,客厅\n")
        f.write("IMG_0007,幸福花园,,3层,主卧\n")
        f.write("IMG_0008,,1号楼,3层,卫生间\n")
        f.write("IMG_0009,幸福花园,3号楼,10层,电梯间\n")
        f.write("IMG_0010,幸福花园,3号楼,10层,消防通道\n")
        f.write("IMG_0011,幸福花园,3号楼,10层,走廊\n")

    print(f"\n✅ 测试数据生成完成！")
    print(f"   照片目录: {photo_dir}")
    print(f"   对照表: {map_file}")
    print(f"\n共创建 {len(list(photo_dir.glob('IMG_*.jpg')))} 张测试照片")
    print(f"对照表包含 10 条记录")
    print(f"\n预期测试结果:")
    print(f"  ✅ 成功处理: 7 张 (IMG_0001-0005, IMG_0009-0010)")
    print(f"  ⚠️  待确认: 4 张 (IMG_0006-0008 位置不完整, IMG_0011 太小)")
    print(f"  ❌ 未识别位置: 3 张 (IMG_0020-0022) → 保留在源目录")

if __name__ == '__main__':
    main()
