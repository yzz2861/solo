import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os


def generate_decibel_data(output_path: str, start_date: datetime, days: int = 14):
    locations = [
        ("阳光花园小区", "阳光花园", "中山路", "中山路123号"),
        ("丽湖苑", "丽湖苑小区", "长江路", "长江路88号"),
        ("和平里", "和平里小区", "人民路", "人民路56号"),
        ("幸福村", "幸福村", "解放路", "解放路200号"),
        ("市中心广场", "市中心广场", "中山路", "中山路500号"),
        ("美食街夜宵摊", "美食街沿线", "美食街", "美食街66号"),
        ("城东工地", "城东工地", "建设大道", "建设大道999号"),
        ("老街广场舞点", "老街沿线", "老街", "老街100号"),
    ]
    
    records = []
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        for location, community, street, address in locations:
            for hour in range(18, 30):
                actual_hour = hour if hour < 24 else hour - 24
                record_time = current_date + timedelta(hours=actual_hour)
                
                if hour < 6:
                    record_time = current_date + timedelta(days=1) + timedelta(hours=actual_hour)
                
                if random.random() < 0.05:
                    db_value = np.nan
                else:
                    if "工地" in location:
                        base_db = 58 if actual_hour < 22 else 52
                        db_value = base_db + random.gauss(0, 5)
                    elif "美食街" in location or "夜宵" in location:
                        base_db = 55 if actual_hour < 22 else 48
                        db_value = base_db + random.gauss(0, 6)
                    elif "广场舞" in location or "广场" in location:
                        if 18 <= actual_hour < 22:
                            base_db = 60
                        else:
                            base_db = 45
                        db_value = base_db + random.gauss(0, 4)
                    else:
                        base_db = 48 if actual_hour < 22 else 42
                        db_value = base_db + random.gauss(0, 3)
                
                if random.random() < 0.15:
                    db_value += 15
                
                records.append({
                    "监测时间": record_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "监测点": location,
                    "地址": address,
                    "分贝值": round(db_value, 1) if not np.isnan(db_value) else "",
                    "仪器编号": f"DEV{random.randint(1001, 1010)}",
                })
    
    df = pd.DataFrame(records)
    df.to_excel(output_path, index=False)
    print(f"已生成分贝数据: {len(df)} 条记录 -> {output_path}")
    return df


def generate_complaint_data(output_path: str, start_date: datetime, days: int = 14):
    complaints = []
    
    complaint_scenarios = [
        {"addr": "阳光花园小区12栋", "phone": "13800000001", "type": "广场舞音响太大声"},
        {"addr": "阳光花园 12栋3单元", "phone": "13800000001", "type": "广场舞噪音"},
        {"addr": "阳光花园12号楼", "phone": "13800000002", "type": "晚上跳舞太吵"},
        {"addr": "丽湖苑5栋", "phone": "13800000003", "type": "楼下夜宵摊吵闹"},
        {"addr": "丽湖苑5号楼", "phone": "13800000003", "type": "夜宵摊扰民"},
        {"addr": "丽湖苑小区5栋", "phone": "13800000004", "type": "大排档噪音"},
        {"addr": "和平里3号", "phone": "13800000005", "type": "夜间施工"},
        {"addr": "和平里小区3号楼", "phone": "13800000005", "type": "工地施工吵"},
        {"addr": "和平里", "phone": "13800000006", "type": "施工噪音"},
        {"addr": "幸福村10号", "phone": "13800000007", "type": "广场舞音乐大"},
        {"addr": "幸福村", "phone": "13800000008", "type": "施工扰民"},
        {"addr": "中山路123号", "phone": "13800000009", "type": "夜间施工"},
        {"addr": "长江路88号丽湖苑", "phone": "13800000010", "type": "夜宵摊吵"},
        {"addr": "人民路56号和平里", "phone": "13800000011", "type": "工地施工"},
        {"addr": "美食街66号", "phone": "13800000012", "type": "大排档喧哗"},
        {"addr": "建设大道999号", "phone": "13800000013", "type": "夜间施工"},
        {"addr": "老街100号", "phone": "13800000014", "type": "广场舞吵"},
    ]
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        is_weekend = current_date.weekday() >= 5
        
        num_complaints = random.randint(8, 15) if is_weekend else random.randint(3, 8)
        
        for _ in range(num_complaints):
            scenario = random.choice(complaint_scenarios)
            
            hour = random.choice([19, 20, 21, 22, 23, 0, 1, 2, 20, 21, 22, 23])
            minute = random.randint(0, 59)
            
            if hour < 6:
                call_time = current_date + timedelta(days=1) + timedelta(hours=hour, minutes=minute)
            else:
                call_time = current_date + timedelta(hours=hour, minutes=minute)
            
            complaints.append({
                "来电时间": call_time.strftime("%Y-%m-%d %H:%M:%S"),
                "来电号码": scenario["phone"],
                "投诉人": f"市民{random.randint(100, 999)}",
                "投诉地址": scenario["addr"],
                "投诉内容": scenario["type"],
                "噪声来源": scenario["type"],
                "处理状态": random.choice(["已处理", "处理中", "待处理"]),
            })
            
            if random.random() < 0.2:
                for repeat in range(1, random.randint(2, 4)):
                    repeat_time = call_time + timedelta(minutes=random.randint(10, 60))
                    complaints.append({
                        "来电时间": repeat_time.strftime("%Y-%m-%d %H:%M:%S"),
                        "来电号码": scenario["phone"],
                        "投诉人": f"市民{random.randint(100, 999)}",
                        "投诉地址": scenario["addr"],
                        "投诉内容": scenario["type"],
                        "噪声来源": scenario["type"],
                        "处理状态": random.choice(["已处理", "处理中", "待处理"]),
                    })
    
    df = pd.DataFrame(complaints)
    df.to_excel(output_path, index=False)
    print(f"已生成投诉数据: {len(df)} 条记录 -> {output_path}")
    return df


def generate_enforcement_data(output_path: str, start_date: datetime, days: int = 14):
    enforcements = []
    
    scenarios = [
        {"addr": "阳光花园小区12栋", "type": "广场舞", "party": "广场舞队伍"},
        {"addr": "丽湖苑5栋楼下", "type": "夜宵摊", "party": "夜宵摊主"},
        {"addr": "和平里3号工地", "type": "施工", "party": "建筑公司"},
        {"addr": "幸福村10号", "type": "广场舞", "party": "广场舞队伍"},
        {"addr": "美食街66号", "type": "夜宵摊", "party": "大排档"},
        {"addr": "建设大道999号", "type": "施工", "party": "施工单位"},
        {"addr": "老街100号", "type": "广场舞", "party": "广场舞队"},
    ]
    
    case_id = 1
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        num_cases = random.randint(1, 4)
        
        for _ in range(num_cases):
            scenario = random.choice(scenarios)
            
            hour = random.randint(20, 23)
            register_time = current_date + timedelta(hours=hour, minutes=random.randint(0, 59))
            
            process_time = register_time + timedelta(hours=random.randint(1, 48))
            
            actions = ["口头警告", "责令整改", "暂扣设备", "罚款处理", "教育劝离"]
            results = ["已整改", "待复查", "重复违规", "拒不整改"]
            
            is_closed = random.random() < 0.7
            
            enforcements.append({
                "登记时间": register_time.strftime("%Y-%m-%d %H:%M:%S"),
                "处理时间": process_time.strftime("%Y-%m-%d %H:%M:%S") if is_closed else "",
                "执法编号": f"ZF{start_date.year}{case_id:04d}",
                "事发地点": scenario["addr"],
                "噪声类型": scenario["type"],
                "当事人": scenario["party"],
                "处理措施": random.choice(actions),
                "处理结果": random.choice(results) if is_closed else "处理中",
                "执法人员": f"执法员{random.randint(1, 10)}",
                "是否闭环": "是" if is_closed else "否",
                "处理备注": f"现场{scenario['type']}噪音超标，已采取相应措施。",
            })
            
            case_id += 1
    
    df = pd.DataFrame(enforcements)
    df.to_excel(output_path, index=False)
    print(f"已生成执法数据: {len(df)} 条记录 -> {output_path}")
    return df


def generate_all_sample_data(data_dir: str):
    os.makedirs(data_dir, exist_ok=True)
    
    start_date = datetime(2026, 5, 25)
    
    decibel_path = os.path.join(data_dir, "分贝记录.xlsx")
    complaint_path = os.path.join(data_dir, "投诉记录表.xlsx")
    enforcement_path = os.path.join(data_dir, "执法登记表.xlsx")
    
    generate_decibel_data(decibel_path, start_date, days=14)
    generate_complaint_data(complaint_path, start_date, days=14)
    generate_enforcement_data(enforcement_path, start_date, days=14)
    
    print(f"\n样本数据已全部生成完毕，保存在: {data_dir}")
    return {
        "decibel": decibel_path,
        "complaint": complaint_path,
        "enforcement": enforcement_path,
    }


if __name__ == "__main__":
    data_dir = os.path.dirname(os.path.abspath(__file__))
    generate_all_sample_data(data_dir)
