#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建测试数据脚本 - 模拟共享盘的各种风险场景
仅用于测试 permission_audit.py 脚本
"""

import os
import random
from pathlib import Path


def create_test_data(base_dir: str = "test_shared_drive"):
    base = Path(base_dir)
    if base.exists():
        import shutil
        shutil.rmtree(base)
    base.mkdir(parents=True)

    print(f"正在创建测试数据目录: {base.resolve()}")

    (base / "公共目录").mkdir()
    (base / "公共目录" / "薪资表_2024.xlsx").write_text("敏感数据占位", encoding="utf-8")
    (base / "公共目录" / "客户名单_全公司.csv").write_text("敏感数据占位", encoding="utf-8")
    os.chmod(base / "公共目录" / "薪资表_2024.xlsx", 0o777)

    (base / "研发部-RD").mkdir()
    (base / "研发部-RD" / "RD 项目文档 版本1.docx").write_text("测试", encoding="utf-8")
    (base / "研发部-RD" / "代码规范(内部版).md").write_text("测试", encoding="utf-8")
    (base / "研发部-RD" / "离职员工-张三的项目").mkdir()
    (base / "研发部-RD" / "离职员工-张三的项目" / "源代码.zip").write_text("测试", encoding="utf-8")

    (base / "人事部-HR").mkdir()
    (base / "人事部-HR" / "员工花名册_2024.xlsx").write_text("测试", encoding="utf-8")
    (base / "人事部-HR" / "工资明细_季度汇总.xlsx").write_text("测试", encoding="utf-8")
    (base / "人事部-HR" / "简历库-候选人信息").mkdir()
    (base / "人事部-HR" / "简历库-候选人信息" / "技术岗简历（最新）.pdf").write_text("测试", encoding="utf-8")
    (base / "人事部-HR" / "离职员工档案").mkdir()
    (base / "人事部-HR" / "离职员工档案" / "2023离职员工资料.zip").write_text("测试", encoding="utf-8")

    (base / "财务部-FIN").mkdir()
    (base / "财务部-FIN" / "2024财务报表_机密.xlsx").write_text("测试", encoding="utf-8")
    (base / "财务部-FIN" / "合同归档").mkdir()
    (base / "财务部-FIN" / "合同归档" / "客户合同-机密.docx").write_text("测试", encoding="utf-8")
    (base / "财务部-FIN" / "发票管理（待处理）").mkdir()
    (base / "财务部-FIN" / "发票管理（待处理）" / "客户发票扫描件.pdf").write_text("测试", encoding="utf-8")
    sharing_file = base / "财务部-FIN" / ".2024财务报表_机密.xlsx.sharing"
    sharing_file.write_text(
        "https://pan.baidu.com/s/1abc123xyz\n"
        "分享链接: https://drive.google.com/file/d/test123\n"
        "提取码: abcd\n",
        encoding="utf-8"
    )

    (base / "销售部-BD").mkdir()
    (base / "销售部-BD" / "客户信息表-完整名单.xlsx").write_text("测试", encoding="utf-8")
    (base / "销售部-BD" / "客户联系方式汇总.csv").write_text("测试", encoding="utf-8")
    (base / "销售部-BD" / "BD 报价单 2024.docx").write_text("测试", encoding="utf-8")
    (base / "销售部-BD" / "项目报价（保密版）.xlsx").write_text("测试", encoding="utf-8")
    sharing_file2 = base / "销售部-BD" / ".客户信息表-完整名单.xlsx.sharing"
    sharing_file2.write_text(
        "https://share.company.com/s/xyz789\n"
        "外部链接: 任何人可访问\n"
        "过期: 2099-12-31\n",
        encoding="utf-8"
    )
    os.chmod(base / "销售部-BD" / "客户信息表-完整名单.xlsx", 0o666)

    (base / "市场部-MKT").mkdir()
    (base / "市场部-MKT" / "MKT 活动方案 （最终版）.pptx").write_text("测试", encoding="utf-8")
    (base / "市场部-MKT" / "品牌推广预算.xlsx").write_text("测试", encoding="utf-8")
    (base / "市场部-MKT" / "合作方合同.pdf").write_text("测试", encoding="utf-8")
    sharing_file3 = base / "市场部-MKT" / ".品牌推广预算.xlsx.sharing"
    sharing_file3.write_text(
        "https://pan.qq.com/s/testshare\n"
        "链接分享，无过期时间\n",
        encoding="utf-8"
    )

    (base / "离职员工文件夹").mkdir()
    (base / "离职员工文件夹" / "李四-旧项目资料").mkdir()
    (base / "离职员工文件夹" / "李四-旧项目资料" / "项目文档.doc").write_text("测试", encoding="utf-8")
    (base / "离职员工文件夹" / "王五-客户资料备份").mkdir()
    (base / "离职员工文件夹" / "王五-客户资料备份" / "客户名单备份.xlsx").write_text("测试", encoding="utf-8")

    (base / "临时文件").mkdir()
    (base / "临时文件" / "工资表_副本.xlsx").write_text("测试", encoding="utf-8")
    (base / "临时文件" / "员工身份证扫描件（复印件）.pdf").write_text("测试", encoding="utf-8")
    (base / "临时文件" / "合同（最终版）（1）.docx").write_text("测试", encoding="utf-8")
    (base / "临时文件" / "保密协议-NDA.pdf").write_text("测试", encoding="utf-8")
    (base / "临时文件" / "财务 数据 备份 2024.zip").write_text("测试", encoding="utf-8")
    os.chmod(base / "临时文件" / "工资表_副本.xlsx", 0o777)

    (base / "运营部-OP").mkdir()
    (base / "运营部-OP" / "OP 运营数据 报表.xlsx").write_text("测试", encoding="utf-8")
    (base / "运营部-OP" / "用户数据导出（机密）.csv").write_text("测试", encoding="utf-8")
    (base / "运营部-OP" / "活动数据 备份").mkdir()
    (base / "运营部-OP" / "活动数据 备份" / "用户信息 2024.zip").write_text("测试", encoding="utf-8")

    (base / "产品部-PM").mkdir()
    (base / "产品部-PM" / "PM 产品需求文档 V1.0.docx").write_text("测试", encoding="utf-8")
    (base / "产品部-PM" / "产品路线图（机密）.pptx").write_text("测试", encoding="utf-8")

    (base / "待归档-无负责人").mkdir()
    (base / "待归档-无负责人" / "旧项目资料").mkdir()
    (base / "待归档-无负责人" / "旧项目资料" / "客户合同.pdf").write_text("测试", encoding="utf-8")
    (base / "待归档-无负责人" / "旧项目资料" / "员工信息.docx").write_text("测试", encoding="utf-8")
    os.chmod(base / "待归档-无负责人", 0o777)

    (base / "正常文件").mkdir()
    (base / "正常文件" / "会议纪要.docx").write_text("测试", encoding="utf-8")
    (base / "正常文件" / "周报模板.xlsx").write_text("测试", encoding="utf-8")
    (base / "正常文件" / "员工手册.pdf").write_text("测试", encoding="utf-8")

    (base / "无人负责目录").mkdir()
    (base / "无人负责目录" / "待认领项目").mkdir()
    (base / "无人负责目录" / "待认领项目" / "项目资料.docx").write_text("测试", encoding="utf-8")
    (base / "无人负责目录" / "废弃资料").mkdir()
    (base / "无人负责目录" / "废弃资料" / "旧版文件.zip").write_text("测试", encoding="utf-8")
    (base / "无人负责目录" / "孤儿文件夹-无人接管").mkdir()
    (base / "无人负责目录" / "孤儿文件夹-无人接管" / "数据备份.tar.gz").write_text("测试", encoding="utf-8")

    (base / "临时-无负责人").mkdir()
    (base / "临时-无负责人" / "待处理文件.docx").write_text("测试", encoding="utf-8")

    (base / "元数据测试").mkdir()
    (base / "元数据测试" / "标记无主的文件夹").mkdir()
    (base / "元数据测试" / "标记无主的文件夹" / "一些文件.txt").write_text("测试", encoding="utf-8")
    meta_file1 = base / "元数据测试" / ".标记无主的文件夹.meta"
    meta_file1.write_text(
        "owner: 无负责人\n"
        "department: 未知\n"
        "last_audit: 2023-01-15\n",
        encoding="utf-8"
    )

    (base / "元数据测试" / "权限未设置的文件.xlsx").write_text("测试", encoding="utf-8")
    meta_file2 = base / "元数据测试" / ".权限未设置的文件.xlsx.meta"
    meta_file2.write_text(
        "owner: 张三\n"
        "permission_desc: 未设置\n"
        "department: 待定\n",
        encoding="utf-8"
    )

    (base / "元数据测试" / "正常元数据文件.docx").write_text("测试", encoding="utf-8")
    meta_file3 = base / "元数据测试" / ".正常元数据文件.docx.meta"
    meta_file3.write_text(
        "owner: 李四\n"
        "permission_desc: 部门内可见\n"
        "department: 研发部\n"
        "expiry_date: 2026-12-31\n",
        encoding="utf-8"
    )

    (base / "已离职员工目录").mkdir()
    (base / "已离职员工目录" / "resigned_zhang_san_project").mkdir()
    (base / "已离职员工目录" / "resigned_zhang_san_project" / "代码仓库.zip").write_text("测试", encoding="utf-8")
    (base / "已离职员工目录" / "former_employee_docs").mkdir()
    (base / "已离职员工目录" / "former_employee_docs" / "交接文档.docx").write_text("测试", encoding="utf-8")

    count = 0
    for root, dirs, files in os.walk(base):
        count += len(files) + len(dirs)

    print(f"测试数据创建完成！")
    print(f"  目录: {base.resolve()}")
    print(f"  文件/目录总数: {count}")
    print(f"  包含的风险场景:")
    print(f"    - 公共目录下的薪资表、客户名单")
    print(f"    - 777 权限文件")
    print(f"    - 文件名含空格、中文括号")
    print(f"    - 旧部门缩写（RD, HR, BD, OP, MKT, FIN, PM）")
    print(f"    - 离职员工文件夹")
    print(f"    - 外部分享链接（含/不含过期时间）")
    print(f"    - 敏感词文件名（薪资、客户、身份证、合同、保密等）")
    print(f"    - 无人负责文件夹（路径关键词识别）")
    print(f"    - 元数据标记的无负责人文件夹")
    print(f"    - 元数据标记的权限缺失文件")
    print(f"    - 全局可读写文件")
    print(f"    - 待归档、临时、废弃、孤儿等疑似无主目录")
    print(f"\n运行测试命令:")
    print(f"  pip install -r requirements.txt")
    print(f"  python permission_audit.py {base_dir}")
    return base.resolve()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='创建测试数据目录')
    parser.add_argument('-d', '--dir', default='test_shared_drive', help='测试数据目录名')
    args = parser.parse_args()
    create_test_data(args.dir)
