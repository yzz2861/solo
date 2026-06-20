"""生成测试照片数据"""

import os
from pathlib import Path
from datetime import datetime, timedelta
from PIL import Image
import piexif

def create_test_image(path, size=(1920, 1080), color=(255, 200, 150), exif_date=None):
    """创建测试图片，可选添加 EXIF 拍摄时间"""
    img = Image.new('RGB', size, color)

    if exif_date:
        exif_dict = {
            '0th': {},
            'Exif': {
                piexif.ExifIFD.DateTimeOriginal: exif_date,
                piexif.ExifIFD.DateTimeDigitized: exif_date,
            },
            'GPS': {},
            '1st': {},
            'thumbnail': None,
        }
        exif_bytes = piexif.dump(exif_dict)
        img.save(path, 'JPEG', exif=exif_bytes, quality=85)
    else:
        img.save(path, 'JPEG', quality=85)

    return path

def main():
    photo_dir = Path(__file__).parent / "照片目录"
    photo_dir.mkdir(parents=True, exist_ok=True)

    print(f"正在生成测试照片到: {photo_dir}")

    base_date = datetime(2024, 6, 15, 10, 0, 0)

    # 1. 正常照片 - 有 EXIF，位置在对照表中
    for i in range(1, 6):
        date_str = (base_date + timedelta(minutes=i*5)).strftime("%Y:%m:%d %H:%M:%S")
        path = photo_dir / f"IMG_000{i}.jpg"
        create_test_image(str(path), exif_date=date_str)
        print(f"  ✅ 已创建: {path.name} (有EXIF, 对照表中有位置)")

    # 2. 照片 - 有 EXIF，但位置不完整（用于测试待确认）
    for i in range(6, 9):
        date_str = (base_date + timedelta(minutes=i*5)).strftime("%Y:%m:%d %H:%M:%S")
        path = photo_dir / f"IMG_00{i}.jpg"
        create_test_image(str(path), exif_date=date_str)
        print(f"  ⚠️  已创建: {path.name} (有EXIF, 位置不完整)")

    # 3. 照片 - 没有 EXIF（用于测试待确认）
    for i in range(9, 11):
        path = photo_dir / f"IMG_00{i}.jpg"
        create_test_image(str(path))
        print(f"  ⚠️  已创建: {path.name} (无EXIF)")

    # 4. 小尺寸照片（小于100KB，用于测试待确认）
    small_path = photo_dir / "IMG_0011.jpg"
    create_test_image(str(small_path), size=(320, 240), color=(200, 255, 200))
    print(f"  ⚠️  已创建: {small_path.name} (小尺寸)")

    # 5. 未在对照表中的照片（用于测试未识别位置）
    for i in range(20, 23):
        date_str = (base_date + timedelta(minutes=i*5)).strftime("%Y:%m:%d %H:%M:%S")
        path = photo_dir / f"IMG_00{i}.jpg"
        create_test_image(str(path), exif_date=date_str)
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

    print(f"\n✅ 测试数据生成完成！")
    print(f"   照片目录: {photo_dir}")
    print(f"   对照表: {map_file}")
    print(f"\n共创建 {len(list(photo_dir.glob('IMG_*.jpg')))} 张测试照片")
    print(f"对照表包含 10 条记录")

if __name__ == '__main__':
    main()
