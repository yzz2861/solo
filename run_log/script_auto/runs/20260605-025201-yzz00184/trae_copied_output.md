from late_return_stats import run_late_return_stats

result = run_late_return_stats(
    records=[
        {"student_id": "2024001", "student_name": "张三", "dormitory": "1号楼",
         "room_number": "301", "return_date": "2025-05-01", "return_time": "23:10",
         "reason": "自习", "recorder": "李老师", "source_id": "SRC001"},
    ],
    problem_dict_config={
        "required_fields": ["student_id", "student_name", "dormitory", "return_date", "return_time"],
        "dedup_keys": ["student_id", "return_date", "return_time"],
        "bounds": {"return_time": {"time_after": "22:30"}},
        "anomaly_descriptions": {"缺失.student_id": "学号为空", "重复": "记录重复", "越界.return_time": "未达晚归阈值"},
    },
    source="门禁系统A",
)
# result 包含: batch / statistics / anomaly_samples / trend_summary / export_file