"""生成用于演示的示例数据：合同表、使用量表、工单表、销售预测表。"""
from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path


OUTPUT_DIR = Path(__file__).parent


CUSTOMERS = [
    {"full": "阿里巴巴集团控股有限公司", "short": "阿里", "abbrev": "Alibaba"},
    {"full": "腾讯科技（深圳）有限公司", "short": "腾讯", "abbrev": "Tencent"},
    {"full": "百度在线网络技术（北京）有限公司", "short": "百度", "abbrev": "Baidu"},
    {"full": "字节跳动有限公司", "short": "字节", "abbrev": "ByteDance"},
    {"full": "美团点评科技有限公司", "short": "美团", "abbrev": "Meituan"},
    {"full": "京东集团股份有限公司", "short": "京东", "abbrev": "JD"},
    {"full": "拼多多信息技术有限公司", "short": "拼多多", "abbrev": "PDD"},
    {"full": "小米科技有限责任公司", "short": "小米", "abbrev": "Xiaomi"},
    {"full": "华为技术有限公司", "short": "华为", "abbrev": "Huawei"},
    {"full": "网易（杭州）网络有限公司", "short": "网易", "abbrev": "NetEase"},
    {"full": "滴滴出行科技有限公司", "short": "滴滴", "abbrev": "Didi"},
    {"full": "顺丰速运有限公司", "short": "顺丰", "abbrev": "SF"},
]

CSMS = ["张明", "李华", "王芳", "陈静", "刘洋"]
SALES = ["周强", "吴磊", "郑雪", "孙涛", "马丽"]
PRODUCTS = ["企业版SaaS", "专业版SaaS", "旗舰版SaaS", "标准版+"]
TICKET_CATEGORIES = ["登录问题", "数据导出", "权限配置", "集成对接", "功能异常", "性能问题", "培训咨询"]
TICKET_PRIORITIES = ["高", "中", "低"]


def _rand_contract_end(today: date) -> date:
    days = random.choice([5, 12, 25, 45, 70, 100, 150, 240, 365, 500, -10])
    return today + timedelta(days=days)


def generate_contracts(output_path: Path, seed: int = 42) -> None:
    random.seed(seed)
    today = date.today()
    rows = [
        ["合同ID", "客户名称", "合同金额", "合同开始日期", "合同到期日期",
         "负责人", "负责人邮箱", "产品", "自动续费", "续签状态", "续费备注"],
    ]
    for i, cust in enumerate(CUSTOMERS):
        contract_id = f"HT{2024:04d}{i + 1:05d}"
        cust_variant = random.choice([cust["full"], cust["short"], cust["abbrev"]])
        value = random.choice([50000, 80000, 120000, 180000, 250000, 360000, 500000, 800000])
        start = today - timedelta(days=random.randint(200, 700))
        end = _rand_contract_end(today)
        owner = CSMS[i % len(CSMS)]
        email = f"{''.join(random.sample('abcdefghij', 3))}@company.com"
        product = PRODUCTS[i % len(PRODUCTS)]
        auto = random.choice(["是", "否", "否", "否"])
        renewal_status = ""
        renewal_notes = ""
        days_left = (end - today).days
        if 30 <= days_left <= 90:
            if random.random() < 0.35:
                renewal_status = "续签中"
                renewal_notes = random.choice([
                    "客户表示倾向增购，正在走法务流程",
                    "报价已发，等客户内部审批",
                    "预计下周签回",
                ])
        if cust["short"] == "华为":
            renewal_status = "续签中"
            renewal_notes = "采购已确认，等总部盖章"
        if cust["short"] == "拼多多":
            renewal_status = ""
            renewal_notes = "客成反馈客户态度不明确，约了下周拜访"
        rows.append([
            contract_id, cust_variant, value,
            start.isoformat(), end.isoformat(),
            owner, email, product, auto, renewal_status, renewal_notes,
        ])
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rows)


def generate_usage(output_path: Path, seed: int = 42) -> None:
    random.seed(seed + 1)
    today = date.today()
    period = f"{today.year}年{today.month}月"
    period_end = today - timedelta(days=2)
    rows = [
        ["客户", "统计周期", "统计结束日期", "活跃用户数", "总授权数", "使用率",
         "核心功能使用数", "总核心功能", "近30天登录", "是否有试点", "试点功能"],
    ]
    scenarios = [
        (0, 100, 0.0, 0, 8, 0, True, "高级API,数据大屏"),
        (12, 100, 0.12, 2, 8, 10, False, ""),
        (35, 100, 0.35, 3, 8, 25, False, ""),
        (55, 100, 0.55, 5, 8, 40, False, ""),
        (82, 100, 0.82, 7, 8, 60, True, "私有化模块"),
        (0, 50, 0.0, 0, 8, 0, False, ""),
    ]
    for i, cust in enumerate(CUSTOMERS):
        cust_variant = random.choice([cust["full"], cust["short"]])
        scenario = scenarios[i % len(scenarios)]
        if cust["short"] == "百度":
            active, total, rate, used_feat, total_feat, login, pilot, pilot_feat = (
                0, 200, 0.0, 0, 8, 0, True, "AI模型训练模块"
            )
        elif cust["short"] == "滴滴":
            active, total, rate, used_feat, total_feat, login, pilot, pilot_feat = (
                8, 500, 0.016, 1, 8, 6, False, ""
            )
        elif cust["short"] == "字节":
            active, total, rate, used_feat, total_feat, login, pilot, pilot_feat = (
                450, 500, 0.90, 8, 8, 380, False, ""
            )
        else:
            active, total, rate, used_feat, total_feat, login, pilot, pilot_feat = scenario
        rows.append([
            cust_variant, period, period_end.isoformat(),
            active, total, f"{rate:.2%}",
            used_feat, total_feat, login,
            "是" if pilot else "否", pilot_feat,
        ])
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rows)


def generate_tickets(output_path: Path, seed: int = 42) -> None:
    random.seed(seed + 2)
    today = date.today()
    rows = [
        ["工单ID", "客户名称", "工单标题", "工单状态", "优先级",
         "创建时间", "关闭时间", "重开次数", "是否重开", "工单类别", "处理人"],
    ]
    ticket_dist = {
        "腾讯": 8,
        "阿里": 2,
        "百度": 5,
        "字节": 1,
        "美团": 4,
        "京东": 3,
        "拼多多": 6,
        "小米": 0,
        "华为": 7,
        "网易": 2,
        "滴滴": 9,
        "顺丰": 1,
    }
    ticket_id = 1000
    for cust in CUSTOMERS:
        n = ticket_dist.get(cust["short"], 2)
        cust_variant = random.choice([cust["full"], cust["abbrev"]])
        for j in range(n):
            ticket_id += 1
            status_num = random.random()
            if status_num < 0.35:
                status = "已关闭"
                closed = (today - timedelta(days=random.randint(1, 40))).isoformat()
            elif status_num < 0.50:
                status = "重开"
                closed = ""
            elif status_num < 0.65:
                status = "待客户回复"
                closed = ""
            elif status_num < 0.85:
                status = "处理中"
                closed = ""
            else:
                status = "新工单"
                closed = ""
            reopened_count = 2 if status == "重开" else (1 if random.random() < 0.15 else 0)
            is_reopened = "是" if reopened_count > 0 or status == "重开" else "否"
            priority = random.choice(TICKET_PRIORITIES)
            if cust["short"] == "华为" and j < 2:
                priority = "高"
                status = "重开"
                is_reopened = "是"
                reopened_count = 3
            if cust["short"] == "滴滴" and j < 3:
                priority = "高"
                if j == 0:
                    status = "重开"
                    is_reopened = "是"
                    reopened_count = 2
            category = random.choice(TICKET_CATEGORIES)
            subject = f"{category}问题 - {random.choice(['无法操作','报错','需要支持','配置问题','系统异常'])}"
            created = (today - timedelta(days=random.randint(1, 60))).isoformat()
            if status == "已关闭" and not closed:
                closed = (today - timedelta(days=random.randint(1, 15))).isoformat()
            handler = random.choice(CSMS + ["客服A", "客服B", "客服C"])
            rows.append([
                f"TK{ticket_id}", cust_variant, subject, status, priority,
                created, closed, reopened_count, is_reopened, category, handler,
            ])
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rows)


def generate_forecasts(output_path: Path, seed: int = 42) -> None:
    random.seed(seed + 3)
    today = date.today()
    rows = [
        ["商机ID", "客户名称", "预测金额", "预测类别", "预计关单日",
         "商机阶段", "成交概率", "销售负责人", "关联合同ID", "备注"],
    ]
    opp_id = 2000
    for i, cust in enumerate(CUSTOMERS):
        opp_id += 1
        cust_variant = random.choice([cust["short"], cust["full"], cust["abbrev"]])
        contract_id = f"HT{2024:04d}{i + 1:05d}"
        # 按合同额生成预测
        base_values = {
            "阿里": 250000, "腾讯": 500000, "百度": 180000, "字节": 800000,
            "美团": 120000, "京东": 360000, "拼多多": 80000, "小米": 50000,
            "华为": 500000, "网易": 250000, "滴滴": 180000, "顺丰": 120000,
        }
        base = base_values.get(cust["short"], 100000)
        if cust["short"] == "拼多多":
            amount = 0
            category = "管道"
            stage = "初步接触"
            probability = 0
            close_date = ""
            notes = "尚未录入，等待销售确认续费意向"
        elif cust["short"] == "美团":
            amount = int(base * 0.6)
            category = "最佳情况"
            stage = "需求确认"
            probability = 40
            close_date = (today + timedelta(days=75)).isoformat()
            notes = "客户预算评估中，可能缩量"
        elif cust["short"] == "滴滴":
            amount = int(base * 1.3)
            category = "承诺"
            stage = "商务谈判"
            probability = 85
            close_date = (today + timedelta(days=20)).isoformat()
            notes = "预计增购席位，等客户确认具体数量"
        elif cust["short"] == "字节":
            amount = int(base * 1.5)
            category = "已赢单"
            stage = "合同签署"
            probability = 100
            close_date = (today + timedelta(days=10)).isoformat()
            notes = "客户确认增购50%席位，合同盖章中"
        elif cust["short"] == "顺丰":
            amount = base
            category = "承诺"
            stage = "方案确认"
            probability = 75
            close_date = (today + timedelta(days=180)).isoformat()
            notes = "合同还早，先占位"
        else:
            scenarios = [
                (base, "承诺", "商务谈判", 80, 30),
                (int(base * 0.9), "最佳情况", "需求确认", 50, 50),
                (base, "承诺", "合同审批", 90, 15),
            ]
            amount, category, stage, probability, close_days = scenarios[i % len(scenarios)]
            close_date = (today + timedelta(days=close_days)).isoformat()
            notes = ""
        sales_owner = SALES[i % len(SALES)]
        if amount == 0:
            rows.append([
                f"OPP{opp_id}", cust_variant, "", category, close_date,
                stage, f"{probability}%", sales_owner, contract_id, notes,
            ])
        else:
            rows.append([
                f"OPP{opp_id}", cust_variant, amount, category, close_date,
                stage, f"{probability}%", sales_owner, contract_id, notes,
            ])
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(rows)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    generate_contracts(OUTPUT_DIR / "contracts.csv")
    generate_usage(OUTPUT_DIR / "usage.csv")
    generate_tickets(OUTPUT_DIR / "tickets.csv")
    generate_forecasts(OUTPUT_DIR / "forecasts.csv")
    print(f"✅ 示例数据已生成到：{OUTPUT_DIR}")
    print(f"  - contracts.csv  （合同表，含简称、续签中）")
    print(f"  - usage.csv      （使用量表，含零使用、试点）")
    print(f"  - tickets.csv    （工单表，含重开、高优先级）")
    print(f"  - forecasts.csv  （销售预测表，含缺失、不匹配）")


if __name__ == "__main__":
    main()
