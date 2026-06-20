import csv
import json
from pathlib import Path
from datetime import date, timedelta
from typing import Dict

import pandas as pd


def generate_sample_data(base_dir: str = None) -> Dict[str, str]:
    if base_dir is None:
        base_dir = str(Path(__file__).parent / "data")
    data_path = Path(base_dir)
    data_path.mkdir(parents=True, exist_ok=True)

    base_date = date(2025, 6, 16)
    weekday_date = base_date

    sms_content = _generate_sms_sample(weekday_date)
    sms_file = data_path / "短信摘录.txt"
    sms_file.write_text(sms_content, encoding="utf-8")

    sheet_df = _generate_sheet_sample(weekday_date)
    sheet_file = data_path / "请假表.xlsx"
    sheet_df.to_excel(sheet_file, index=False)

    absence_df = _generate_absence_sample(weekday_date)
    absence_file = data_path / "缺勤记录.csv"
    absence_df.to_csv(absence_file, index=False, encoding="utf-8-sig")

    return {
        "sms": str(sms_file),
        "sheet": str(sheet_file),
        "absence": str(absence_file),
    }


def _generate_sms_sample(base_date: date) -> str:
    d1 = base_date.strftime("%m月%d日")
    d2 = (base_date + timedelta(days=1)).strftime("%m月%d日")
    d3 = (base_date + timedelta(days=2)).strftime("%m月%d日")

    lines = [
        f"王老师您好，{d1}我家李明同学今天感冒发烧38.5度，需要上午请假去医院看病，麻烦批准。家长：王爸爸 13800138001",
        f"老师好，{d1}张伟今天头痛不舒服，全天请假在家休息，联系电话13900139002",
        f"{d2}刘芳同学今天下午家里有事，需要请假半天，家长：刘妈妈，谢谢老师",
        f"班主任您好，{d2}陈静参加学校区里的数学竞赛培训，全天公假，已经教务处报备",
        f"老师好，{d3}杨阳昨晚咳嗽加重，今天上午需要去医院复查，上午请假，下午回校上课，谢谢关心",
        f"张老师您好，{d1}赵雷因为家里老人过生日，今天下午请假回老家，事假，望批准",
        f"{d3}孙强同学今天胃痛呕吐，需要请假全天去医院检查，联系电话13600136005",
        f"老师好，{d2}周敏今天上午要去补牙，请假上午半天，下午到校",
        f"老师，{d3}杨洋同学今天发烧不舒服，全天请假在家休息，家长：杨妈妈",
    ]
    return "\n\n".join(lines)


def _generate_sheet_sample(base_date: date) -> pd.DataFrame:
    d1 = base_date
    d2 = base_date + timedelta(days=1)
    d3 = base_date + timedelta(days=2)
    d4 = base_date + timedelta(days=3)

    data = [
        {"姓名": "李明", "日期": d1.isoformat(), "节次": "上午", "请假类型": "病假", "请假原因": "感冒发烧38.5度", "班主任": "张老师", "联系电话": "13800138001"},
        {"姓名": "张伟", "日期": d1.isoformat(), "节次": "全天", "请假类型": "病假", "请假原因": "头痛在家休息", "班主任": "张老师", "联系电话": "13900139002"},
        {"姓名": "刘芳", "日期": d2.isoformat(), "节次": "下午", "请假类型": "事假", "请假原因": "家中有事", "班主任": "张老师", "联系电话": "13700137003"},
        {"姓名": "陈静", "日期": d2.isoformat(), "节次": "全天", "请假类型": "公假", "请假原因": "区数学竞赛培训", "班主任": "张老师", "联系电话": ""},
        {"姓名": "杨阳", "日期": d3.isoformat(), "节次": "全天", "请假类型": "事假", "请假原因": "家中有事需陪同家长", "班主任": "张老师", "联系电话": "13500135004"},
        {"姓名": "吴昊", "日期": d3.isoformat(), "节次": "全天", "请假类型": "病假", "请假原因": "发烧40度", "班主任": "张老师", "联系电话": "13400134006"},
        {"姓名": "郑洁", "日期": d4.isoformat(), "节次": "全天", "请假类型": "病假", "请假原因": "流感高烧", "班主任": "张老师", "联系电话": "13300133007"},
        {"姓名": "林浩", "日期": d4.isoformat(), "节次": "全天", "请假类型": "病假", "请假原因": "腹泻呕吐", "班主任": "张老师", "联系电话": "13200132008"},
        {"姓名": "黄雨", "日期": d3.isoformat(), "节次": "上午", "请假类型": "事假", "请假原因": "办证件", "班主任": "张老师", "联系电话": "13100131009"},
        {"姓名": "马超", "日期": d2.isoformat(), "节次": "全天", "请假类型": "病假", "请假原因": "发烧39度", "班主任": "张老师", "联系电话": "13000130010"},
        {"姓名": "杨洋", "日期": d3.isoformat(), "节次": "全天", "请假类型": "病假", "请假原因": "发烧在家休息", "班主任": "张老师", "联系电话": "12900129011"},
    ]
    return pd.DataFrame(data)


def _generate_absence_sample(base_date: date) -> pd.DataFrame:
    d1 = base_date
    d2 = base_date + timedelta(days=1)
    d3 = base_date + timedelta(days=2)
    d4 = base_date + timedelta(days=3)

    data = [
        {"学生姓名": "李明", "日期": d1.isoformat(), "节次": "上午", "任课老师": "王老师", "科目": "语文", "备注": ""},
        {"学生姓名": "张伟", "日期": d1.isoformat(), "节次": "全天", "任课老师": "各科老师", "科目": "全部", "备注": "未到"},
        {"学生姓名": "刘芳", "日期": d2.isoformat(), "节次": "下午", "任课老师": "李老师", "科目": "数学", "备注": ""},
        {"学生姓名": "陈静", "日期": d2.isoformat(), "节次": "全天", "任课老师": "各科老师", "科目": "全部", "备注": "竞赛"},
        {"学生姓名": "杨阳", "日期": d3.isoformat(), "节次": "全天", "任课老师": "各科老师", "科目": "全部", "备注": "未到"},
        {"学生姓名": "赵雷", "日期": d1.isoformat(), "节次": "下午", "任课老师": "孙老师", "科目": "物理", "备注": "未到未请假"},
        {"学生姓名": "吴昊", "日期": d3.isoformat(), "节次": "全天", "任课老师": "各科老师", "科目": "全部", "备注": "发烧"},
        {"学生姓名": "郑洁", "日期": d4.isoformat(), "节次": "全天", "任课老师": "各科老师", "科目": "全部", "备注": "生病"},
        {"学生姓名": "林浩", "日期": d4.isoformat(), "节次": "全天", "任课老师": "各科老师", "科目": "全部", "备注": "肠胃不舒服"},
        {"学生姓名": "马超", "日期": d2.isoformat(), "节次": "全天", "任课老师": "各科老师", "科目": "全部", "备注": "生病"},
        {"学生姓名": "孙强", "日期": d3.isoformat(), "节次": "上午", "任课老师": "王老师", "科目": "语文", "备注": "未到"},
        {"学生姓名": "孙强", "日期": d3.isoformat(), "节次": "下午", "任课老师": "李老师", "科目": "数学", "备注": "未到"},
        {"学生姓名": "周敏", "日期": d2.isoformat(), "节次": "上午", "任课老师": "张老师", "科目": "化学", "备注": ""},
        {"学生姓名": "杨洋", "日期": d3.isoformat(), "节次": "全天", "任课老师": "各科老师", "科目": "全部", "备注": "发烧"},
        {"学生姓名": "黄雨", "日期": d3.isoformat(), "节次": "上午", "任课老师": "王老师", "科目": "语文", "备注": ""},
    ]
    return pd.DataFrame(data)
