#!/usr/bin/env python3
"""
生成测试用的模拟后台截图，用于验证隐私遮罩工具。
"""

import os
import random
from PIL import Image, ImageDraw, ImageFont

def create_test_screenshots(output_dir="screenshots"):
    os.makedirs(output_dir, exist_ok=True)
    
    screenshots = [
        {
            "filename": "后台_订单详情_浅色.png",
            "theme": "light",
            "width": 1440,
            "height": 900,
            "content": "order_detail"
        },
        {
            "filename": "后台_用户信息_深色.png",
            "theme": "dark",
            "width": 1920,
            "height": 1080,
            "content": "user_info"
        },
        {
            "filename": "后台_订单列表_浅色.png",
            "theme": "light",
            "width": 1280,
            "height": 800,
            "content": "order_list"
        },
        {
            "filename": "后台_数据面板_深色.png",
            "theme": "dark",
            "width": 2560,
            "height": 1440,
            "content": "dashboard"
        },
        {
            "filename": "后台_异常分辨率.png",
            "theme": "light",
            "width": 2000,
            "height": 600,
            "content": "weird_size"
        },
    ]
    
    for config in screenshots:
        generate_screenshot(config, output_dir)
        print(f"✓ 生成: {config['filename']}")

def generate_screenshot(config, output_dir):
    w, h = config["width"], config["height"]
    
    if config["theme"] == "dark":
        bg_color = (13, 17, 23)
        panel_color = (22, 27, 34)
        text_color = (240, 246, 252)
        secondary_color = (139, 148, 158)
        accent_color = (88, 166, 255)
        border_color = (48, 54, 61)
    else:
        bg_color = (250, 250, 250)
        panel_color = (255, 255, 255)
        text_color = (30, 30, 30)
        secondary_color = (100, 100, 100)
        accent_color = (24, 144, 255)
        border_color = (230, 230, 230)
    
    img = Image.new("RGB", (w, h), bg_color)
    draw = ImageDraw.Draw(img)
    
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", int(h * 0.025))
        font_medium = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", int(h * 0.018))
        font_small = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", int(h * 0.014))
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    draw_top_bar(draw, w, h, panel_color, border_color, text_color, secondary_color, font_small, config["theme"])
    draw_sidebar(draw, w, h, panel_color, border_color, text_color, secondary_color, accent_color, font_small)
    
    content_x = int(w * 0.18)
    content_y = int(h * 0.07)
    content_w = int(w * 0.82)
    content_h = int(h * 0.93)
    
    if config["content"] == "order_detail":
        draw_order_detail(draw, content_x, content_y, content_w, content_h, 
                         panel_color, border_color, text_color, secondary_color, 
                         accent_color, font_large, font_medium, font_small)
    elif config["content"] == "user_info":
        draw_user_info(draw, content_x, content_y, content_w, content_h,
                      panel_color, border_color, text_color, secondary_color,
                      accent_color, font_large, font_medium, font_small)
    elif config["content"] == "order_list":
        draw_order_list(draw, content_x, content_y, content_w, content_h,
                       panel_color, border_color, text_color, secondary_color,
                       accent_color, font_medium, font_small)
    elif config["content"] == "dashboard":
        draw_dashboard(draw, content_x, content_y, content_w, content_h,
                      panel_color, border_color, text_color, secondary_color,
                      accent_color, font_large, font_medium, font_small)
    elif config["content"] == "weird_size":
        draw_weird_size(draw, content_x, content_y, content_w, content_h,
                       panel_color, border_color, text_color, secondary_color,
                       accent_color, font_medium, font_small)
    
    output_path = os.path.join(output_dir, config["filename"])
    img.save(output_path)

def draw_top_bar(draw, w, h, panel_color, border_color, text_color, secondary_color, font, theme):
    draw.rectangle([0, 0, w, int(h * 0.07)], fill=panel_color)
    draw.line([0, int(h * 0.07), w, int(h * 0.07)], fill=border_color, width=1)
    
    draw.text((int(w * 0.02), int(h * 0.022)), "后台管理系统", fill=text_color, font=font)
    
    user_x = int(w * 0.92)
    user_y = int(h * 0.018)
    draw.ellipse([user_x, user_y, user_x + int(h * 0.035), user_y + int(h * 0.035)], 
                 fill=(100, 100, 255))
    
    draw.text((user_x + int(h * 0.045), user_y + int(h * 0.005)), 
              "张三 (管理员)", fill=text_color, font=font)

def draw_sidebar(draw, w, h, panel_color, border_color, text_color, secondary_color, accent_color, font):
    sidebar_w = int(w * 0.18)
    draw.rectangle([0, int(h * 0.07), sidebar_w, h], fill=panel_color)
    draw.line([sidebar_w, int(h * 0.07), sidebar_w, h], fill=border_color, width=1)
    
    menu_items = [
        ("📊 数据面板", False),
        ("📦 订单管理", True),
        ("👤 用户管理", False),
        ("📋 商品管理", False),
        ("💰 财务管理", False),
        ("⚙️ 系统设置", False),
    ]
    
    y = int(h * 0.1)
    for item, active in menu_items:
        if active:
            draw.rectangle([0, y, sidebar_w, y + int(h * 0.05)], fill=accent_color + (40,))
            draw.text((int(w * 0.02), y + int(h * 0.012)), item, fill=accent_color, font=font)
        else:
            draw.text((int(w * 0.02), y + int(h * 0.012)), item, fill=secondary_color, font=font)
        y += int(h * 0.06)

def draw_order_detail(draw, x, y, w, h, panel_color, border_color, text_color, secondary_color, accent_color, font_large, font_medium, font_small):
    padding = int(w * 0.03)
    
    draw.text((x + padding, y + padding), "订单详情", fill=text_color, font=font_large)
    
    order_no_y = y + padding + int(h * 0.08)
    draw.text((x + padding, order_no_y), "订单号: ", fill=secondary_color, font=font_medium)
    draw.text((x + padding + int(w * 0.1), order_no_y), "ORD2024061800123456", fill=accent_color, font=font_medium)
    
    card_y = order_no_y + int(h * 0.1)
    card_h = int(h * 0.35)
    
    draw.rounded_rectangle([x + padding, card_y, x + w - padding, card_y + card_h], 
                          radius=8, fill=panel_color, outline=border_color, width=1)
    
    info_items = [
        ("收货人", "李明华"),
        ("手机号", "13812345678"),
        ("收货地址", "北京市朝阳区建国路88号"),
        ("下单时间", "2024-06-18 14:30:25"),
        ("支付方式", "微信支付"),
        ("订单状态", "已发货"),
    ]
    
    info_x = x + padding + int(w * 0.03)
    info_y = card_y + int(h * 0.04)
    info_w = int(w * 0.4)
    
    for i, (label, value) in enumerate(info_items):
        row_y = info_y + i * int(h * 0.045)
        draw.text((info_x, row_y), label + ":", fill=secondary_color, font=font_small)
        draw.text((info_x + int(w * 0.1), row_y), value, fill=text_color, font=font_small)
    
    btn_y = card_y + card_h + int(h * 0.04)
    btn_w = int(w * 0.12)
    btn_h = int(h * 0.05)
    
    buttons = [
        ("确认发货", accent_color, True),
        ("查看物流", panel_color, False),
        ("取消订单", (248, 81, 73), False),
    ]
    
    btn_x = x + padding
    for btn_text, btn_color, is_primary in buttons:
        draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], 
                              radius=6, fill=btn_color if is_primary else panel_color,
                              outline=btn_color if not is_primary else None, width=1)
        text_c = (255, 255, 255) if is_primary else btn_color
        draw.text((btn_x + int(w * 0.02), btn_y + int(h * 0.012)), 
                  btn_text, fill=text_c, font=font_small)
        btn_x += btn_w + int(w * 0.02)

def draw_user_info(draw, x, y, w, h, panel_color, border_color, text_color, secondary_color, accent_color, font_large, font_medium, font_small):
    padding = int(w * 0.03)
    
    draw.text((x + padding, y + padding), "用户信息", fill=text_color, font=font_large)
    
    card_y = y + padding + int(h * 0.1)
    card_h = int(h * 0.7)
    
    draw.rounded_rectangle([x + padding, card_y, x + w - padding, card_y + card_h], 
                          radius=8, fill=panel_color, outline=border_color, width=1)
    
    avatar_x = x + padding + int(w * 0.05)
    avatar_y = card_y + int(h * 0.08)
    avatar_size = int(h * 0.15)
    draw.ellipse([avatar_x, avatar_y, avatar_x + avatar_size, avatar_y + avatar_size], 
                 fill=(100, 150, 255))
    
    info_x = avatar_x + avatar_size + int(w * 0.05)
    info_y = avatar_y
    
    draw.text((info_x, info_y), "王小明", fill=text_color, font=font_large)
    draw.text((info_x, info_y + int(h * 0.06)), "VIP会员", fill=accent_color, font=font_medium)
    
    detail_y = card_y + int(h * 0.35)
    detail_items = [
        ("用户ID", "U10086"),
        ("手机号", "13987654321"),
        ("邮箱", "wangxiaoming@example.com"),
        ("身份证号", "110101199001011234"),
        ("注册时间", "2023-03-15"),
        ("累计消费", "¥12,580.00"),
        ("最近登录", "2024-06-17 22:15:33"),
        ("所属地区", "上海市浦东新区"),
    ]
    
    cols = 2
    for i, (label, value) in enumerate(detail_items):
        col = i % cols
        row = i // cols
        item_x = x + padding + int(w * 0.05) + col * int(w * 0.4)
        item_y = detail_y + row * int(h * 0.06)
        
        draw.text((item_x, item_y), label + ":", fill=secondary_color, font=font_small)
        draw.text((item_x + int(w * 0.08), item_y), value, fill=text_color, font=font_small)

def draw_order_list(draw, x, y, w, h, panel_color, border_color, text_color, secondary_color, accent_color, font_medium, font_small):
    padding = int(w * 0.03)
    
    draw.text((x + padding, y + padding), "订单列表", fill=text_color, font=font_medium)
    
    search_y = y + padding + int(h * 0.08)
    draw.rounded_rectangle([x + padding, search_y, x + padding + int(w * 0.3), search_y + int(h * 0.05)],
                          radius=6, fill=panel_color, outline=border_color, width=1)
    draw.text((x + padding + int(w * 0.02), search_y + int(h * 0.012)), 
              "搜索订单号...", fill=secondary_color, font=font_small)
    
    table_y = search_y + int(h * 0.1)
    table_h = int(h * 0.75)
    
    draw.rounded_rectangle([x + padding, table_y, x + w - padding, table_y + table_h],
                          radius=8, fill=panel_color, outline=border_color, width=1)
    
    headers = ["订单号", "客户", "金额", "状态", "操作"]
    col_widths = [int(w * 0.22), int(w * 0.15), int(w * 0.12), int(w * 0.12), int(w * 0.15)]
    
    header_y = table_y + int(h * 0.03)
    col_x = x + padding + int(w * 0.02)
    for header, cw in zip(headers, col_widths):
        draw.text((col_x, header_y), header, fill=secondary_color, font=font_small)
        col_x += cw
    
    draw.line([x + padding + int(w * 0.02), header_y + int(h * 0.05), 
               x + w - padding - int(w * 0.02), header_y + int(h * 0.05)], 
              fill=border_color, width=1)
    
    sample_orders = [
        ("ORD20240618001", "张三", "¥299.00", "已完成"),
        ("ORD20240617089", "李四", "¥1,299.00", "待发货"),
        ("ORD20240616056", "王五", "¥89.50", "已取消"),
        ("ORD20240615123", "赵六", "¥3,599.00", "已发货"),
        ("ORD20240614045", "钱七", "¥599.00", "已完成"),
    ]
    
    row_y = header_y + int(h * 0.08)
    for order in sample_orders:
        col_x = x + padding + int(w * 0.02)
        values = list(order)
        
        draw.text((col_x, row_y), values[0], fill=accent_color, font=font_small)
        col_x += col_widths[0]
        
        draw.text((col_x, row_y), values[1], fill=text_color, font=font_small)
        col_x += col_widths[1]
        
        draw.text((col_x, row_y), values[2], fill=text_color, font=font_small)
        col_x += col_widths[2]
        
        status_color = (46, 204, 113) if values[3] in ["已完成", "已发货"] else \
                       (243, 156, 18) if values[3] == "待发货" else (231, 76, 60)
        draw.text((col_x, row_y), values[3], fill=status_color, font=font_small)
        col_x += col_widths[3]
        
        draw.text((col_x, row_y), "查看详情", fill=accent_color, font=font_small)
        
        row_y += int(h * 0.1)

def draw_dashboard(draw, x, y, w, h, panel_color, border_color, text_color, secondary_color, accent_color, font_large, font_medium, font_small):
    padding = int(w * 0.03)
    
    draw.text((x + padding, y + padding), "数据面板", fill=text_color, font=font_large)
    
    stats_y = y + padding + int(h * 0.1)
    stat_cards = [
        ("今日订单", "1,234", "+12.5%", (88, 166, 255)),
        ("销售额", "¥89,500", "+8.3%", (46, 204, 113)),
        ("新增用户", "256", "-3.2%", (163, 113, 247)),
        ("退款率", "2.1%", "-0.5%", (248, 81, 73)),
    ]
    
    card_w = int((w - padding * 2 - int(w * 0.03) * 3) / 4)
    card_h = int(h * 0.2)
    
    for i, (title, value, change, color) in enumerate(stat_cards):
        card_x = x + padding + i * (card_w + int(w * 0.03))
        draw.rounded_rectangle([card_x, stats_y, card_x + card_w, stats_y + card_h],
                              radius=10, fill=panel_color, outline=border_color, width=1)
        
        draw.text((card_x + int(w * 0.02), stats_y + int(h * 0.04)), 
                  title, fill=secondary_color, font=font_small)
        draw.text((card_x + int(w * 0.02), stats_y + int(h * 0.09)), 
                  value, fill=text_color, font=font_large)
        draw.text((card_x + int(w * 0.02), stats_y + int(h * 0.15)), 
                  change, fill=color, font=font_small)
    
    chart_y = stats_y + card_h + int(h * 0.05)
    chart_w = int(w * 0.65)
    chart_h = int(h * 0.5)
    
    draw.rounded_rectangle([x + padding, chart_y, x + padding + chart_w, chart_y + chart_h],
                          radius=10, fill=panel_color, outline=border_color, width=1)
    draw.text((x + padding + int(w * 0.02), chart_y + int(h * 0.03)), 
              "本周销售趋势", fill=text_color, font=font_medium)
    
    bar_data = [65, 80, 45, 90, 70, 85, 95]
    bar_count = len(bar_data)
    bar_area_w = chart_w - int(w * 0.08)
    bar_area_h = chart_h - int(h * 0.12)
    bar_w = bar_area_w // (bar_count * 2)
    
    bar_start_x = x + padding + int(w * 0.04)
    bar_base_y = chart_y + chart_h - int(h * 0.06)
    
    for i, val in enumerate(bar_data):
        bar_h_val = int(bar_area_h * val / 100)
        bar_x = bar_start_x + i * (bar_w * 2)
        draw.rounded_rectangle([bar_x, bar_base_y - bar_h_val, bar_x + bar_w, bar_base_y],
                              radius=4, fill=accent_color)
    
    side_y = chart_y
    side_x = x + padding + chart_w + int(w * 0.03)
    side_w = w - padding - side_x
    side_h = chart_h
    
    draw.rounded_rectangle([side_x, side_y, side_x + side_w, side_y + side_h],
                          radius=10, fill=panel_color, outline=border_color, width=1)
    draw.text((side_x + int(w * 0.02), side_y + int(h * 0.03)), 
              "热门商品", fill=text_color, font=font_medium)
    
    items = [
        ("商品A - 基础版", "156 件"),
        ("商品B - 高级版", "128 件"),
        ("商品C - 专业版", "98 件"),
        ("商品D - 企业版", "67 件"),
        ("商品E - 入门版", "45 件"),
    ]
    
    item_y = side_y + int(h * 0.1)
    for name, count in items:
        draw.text((side_x + int(w * 0.03), item_y), name, fill=text_color, font=font_small)
        draw.text((side_x + side_w - int(w * 0.08), item_y), count, fill=secondary_color, font=font_small)
        item_y += int(h * 0.07)

def draw_weird_size(draw, x, y, w, h, panel_color, border_color, text_color, secondary_color, accent_color, font_medium, font_small):
    padding = int(w * 0.02)
    
    draw.text((x + padding, y + padding), "异常尺寸页面示例", fill=text_color, font=font_medium)
    
    info_y = y + padding + int(h * 0.2)
    draw.text((x + padding, info_y), "订单号: ORD2024061800123", fill=secondary_color, font=font_small)
    draw.text((x + padding, info_y + int(h * 0.15)), "用户: 陈七 13800001111", fill=text_color, font=font_small)
    
    btn_y = info_y + int(h * 0.4)
    draw.rounded_rectangle([x + padding, btn_y, x + padding + int(w * 0.15), btn_y + int(h * 0.25)],
                          radius=6, fill=accent_color)
    draw.text((x + padding + int(w * 0.03), btn_y + int(h * 0.06)), 
              "确认操作", fill=(255, 255, 255), font=font_small)

if __name__ == "__main__":
    create_test_screenshots()
    print("\n✅ 测试截图生成完成！")
    print("   输出目录: screenshots/")
