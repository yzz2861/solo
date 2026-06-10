"""
报告生成模块
生成可视化摘要图表和主管早会可读的HTML报告
"""
import base64
import os
from io import BytesIO
from pathlib import Path
from typing import Dict

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import pandas as pd

plt.rcParams['axes.unicode_minus'] = False


def _setup_chinese_font():
    """配置中文字体，返回是否配置成功"""
    font_paths = [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                font_prop = fm.FontProperties(fname=fp)
                font_name = font_prop.get_name()
                fm.fontManager.addfont(fp)
                plt.rcParams['font.sans-serif'] = [font_name, 'DejaVu Sans']
                plt.rcParams['font.family'] = 'sans-serif'
                return True
            except Exception:
                continue
    return False


_chinese_font_ready = _setup_chinese_font()


def _set_chinese_font(ax):
    """为图表设置中文字体（兼容方法）"""
    pass


class ReportGenerator:
    """报告生成器"""

    def __init__(self, engine, detector):
        self.engine = engine
        self.detector = detector
        self.charts = {}

    def generate_charts(self, output_dir: str) -> Dict[str, str]:
        """生成所有图表，保存为PNG"""
        os.makedirs(output_dir, exist_ok=True)
        chart_paths = {}

        chart_paths['status_pie'] = self._chart_status_pie(output_dir)
        chart_paths['wave_bar'] = self._chart_wave_bar(output_dir)
        chart_paths['anomaly_bar'] = self._chart_anomaly_bar(output_dir)
        chart_paths['reviewer_bar'] = self._chart_reviewer_bar(output_dir)

        self.charts = chart_paths
        return chart_paths

    def _chart_status_pie(self, output_dir: str) -> str:
        """状态分布饼图"""
        df = self.engine.merged_df
        if df.empty:
            return ''

        status_counts = df['status'].value_counts()
        colors = ['#52c41a', '#faad14', '#ff4d4f', '#1890ff']

        fig, ax = plt.subplots(figsize=(8, 6))
        wedges, texts, autotexts = ax.pie(
            status_counts.values,
            labels=status_counts.index,
            autopct='%1.1f%%',
            colors=colors[:len(status_counts)],
            startangle=90
        )
        ax.set_title('拣货状态分布（按SKU行数）', fontsize=14)
        _set_chinese_font(ax)
        plt.tight_layout()

        filepath = os.path.join(output_dir, 'chart_status_pie.png')
        fig.savefig(filepath, dpi=100, bbox_inches='tight')
        plt.close(fig)
        return filepath

    def _chart_wave_bar(self, output_dir: str) -> str:
        """各波次应拣/实拣/短拣柱状图"""
        wave_summary = self.engine.get_wave_summary()
        if wave_summary.empty:
            return ''

        fig, ax = plt.subplots(figsize=(12, 6))
        x = range(len(wave_summary))
        width = 0.25

        ax.bar([i - width for i in x], wave_summary['total_expected'],
               width=width, label='应拣', color='#1890ff')
        ax.bar(x, wave_summary['total_picked'],
               width=width, label='实拣', color='#52c41a')
        ax.bar([i + width for i in x], wave_summary['total_final_short'],
               width=width, label='最终短拣', color='#ff4d4f')

        ax.set_xticks(x)
        ax.set_xticklabels(wave_summary['wave_no'], rotation=45, ha='right')
        ax.set_ylabel('数量')
        ax.set_title('各波次拣货情况对比', fontsize=14)
        ax.legend()
        _set_chinese_font(ax)
        plt.tight_layout()

        filepath = os.path.join(output_dir, 'chart_wave_bar.png')
        fig.savefig(filepath, dpi=100, bbox_inches='tight')
        plt.close(fig)
        return filepath

    def _chart_anomaly_bar(self, output_dir: str) -> str:
        """异常类型数量柱状图"""
        anomaly_summary = self.detector.get_anomaly_summary()
        if not anomaly_summary:
            return ''

        names = []
        counts = []
        name_map = {
            'short_not_supplemented': '短拣未补',
            'reviewer_inconsistent': '复核人不一致',
            'sku_cross_wave': 'SKU跨波次重复',
            'over_pick': '超拣',
        }
        for key, val in anomaly_summary.items():
            names.append(name_map.get(key, key))
            counts.append(val['count'])

        fig, ax = plt.subplots(figsize=(10, 6))
        colors = ['#ff4d4f', '#faad14', '#722ed1', '#13c2c2']
        bars = ax.bar(names, counts, color=colors[:len(names)])

        for bar, count in zip(bars, counts):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
                    str(count), ha='center', va='bottom', fontsize=11)

        ax.set_ylabel('异常数量')
        ax.set_title('各类异常数量统计', fontsize=14)
        _set_chinese_font(ax)
        plt.tight_layout()

        filepath = os.path.join(output_dir, 'chart_anomaly_bar.png')
        fig.savefig(filepath, dpi=100, bbox_inches='tight')
        plt.close(fig)
        return filepath

    def _chart_reviewer_bar(self, output_dir: str) -> str:
        """复核人工作量柱状图"""
        reviewer_stats = self.engine.get_reviewer_summary()
        if reviewer_stats.empty:
            return ''

        fig, ax = plt.subplots(figsize=(10, 6))
        bars = ax.bar(reviewer_stats['reviewer'], reviewer_stats['total_picked'],
                      color='#1890ff')

        for bar, count in zip(bars, reviewer_stats['total_picked']):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
                    str(count), ha='center', va='bottom', fontsize=10)

        ax.set_ylabel('复核数量')
        ax.set_title('各复核人工作量', fontsize=14)
        plt.xticks(rotation=45, ha='right')
        _set_chinese_font(ax)
        plt.tight_layout()

        filepath = os.path.join(output_dir, 'chart_reviewer_bar.png')
        fig.savefig(filepath, dpi=100, bbox_inches='tight')
        plt.close(fig)
        return filepath

    @staticmethod
    def _image_to_base64(image_path: str) -> str:
        """将图片转为base64嵌入HTML"""
        if not image_path or not os.path.exists(image_path):
            return ''
        with open(image_path, 'rb') as f:
            data = base64.b64encode(f.read()).decode('utf-8')
        return f'data:image/png;base64,{data}'

    def generate_html_report(self, output_path: str, report_title: str = '晚班拣货波次复盘报告'):
        """生成HTML早会报告"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        overall = self.engine.get_overall_summary()
        wave_summary = self.engine.get_wave_summary()
        anomaly_summary = self.detector.get_anomaly_summary()
        anomalies = self.detector.anomalies

        chart_dir = os.path.join(os.path.dirname(output_path), 'charts')
        self.generate_charts(chart_dir)

        status_pie_b64 = self._image_to_base64(self.charts.get('status_pie', ''))
        wave_bar_b64 = self._image_to_base64(self.charts.get('wave_bar', ''))
        anomaly_bar_b64 = self._image_to_base64(self.charts.get('anomaly_bar', ''))
        reviewer_bar_b64 = self._image_to_base64(self.charts.get('reviewer_bar', ''))

        html = self._build_html(
            report_title, overall, wave_summary, anomaly_summary,
            anomalies, status_pie_b64, wave_bar_b64,
            anomaly_bar_b64, reviewer_bar_b64
        )

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        return output_path

    def _build_html(self, title, overall, wave_summary, anomaly_summary,
                    anomalies, status_pie_b64, wave_bar_b64,
                    anomaly_bar_b64, reviewer_bar_b64) -> str:
        """构建HTML内容"""
        from datetime import datetime
        report_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        wave_table_html = self._build_wave_table(wave_summary)
        anomaly_sections_html = self._build_anomaly_sections(anomalies)

        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f5f7fa;
    color: #333;
    line-height: 1.6;
    padding: 20px;
  }}
  .header {{
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
    color: white;
    padding: 24px 32px;
    border-radius: 8px;
    margin-bottom: 20px;
  }}
  .header h1 {{ font-size: 24px; margin-bottom: 8px; }}
  .header .subtitle {{ font-size: 14px; opacity: 0.9; }}
  .summary-cards {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }}
  .card {{
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }}
  .card .label {{ font-size: 13px; color: #666; margin-bottom: 8px; }}
  .card .value {{ font-size: 28px; font-weight: bold; color: #1890ff; }}
  .card.success .value {{ color: #52c41a; }}
  .card.warning .value {{ color: #faad14; }}
  .card.danger .value {{ color: #ff4d4f; }}
  .card .sub {{ font-size: 12px; color: #999; margin-top: 4px; }}
  .section {{
    background: white;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }}
  .section h2 {{
    font-size: 18px;
    color: #262626;
    margin-bottom: 16px;
    border-left: 4px solid #1890ff;
    padding-left: 12px;
  }}
  .charts-row {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }}
  .chart-box {{
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    text-align: center;
  }}
  .chart-box img {{ max-width: 100%; height: auto; }}
  .chart-box.full {{ grid-column: 1 / -1; }}
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }}
  th, td {{
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
  }}
  th {{
    background: #fafafa;
    font-weight: 600;
    color: #595959;
  }}
  tr:hover {{ background: #f5f5f5; }}
  .tag {{
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
  }}
  .tag-success {{ background: #f6ffed; color: #52c41a; }}
  .tag-warning {{ background: #fffbe6; color: #faad14; }}
  .tag-danger {{ background: #fff1f0; color: #ff4d4f; }}
  .tag-info {{ background: #e6f7ff; color: #1890ff; }}
  .tag-purple {{ background: #f9f0ff; color: #722ed1; }}
  .anomaly-section {{ margin-bottom: 24px; }}
  .anomaly-section h3 {{
    font-size: 16px;
    margin-bottom: 12px;
    color: #333;
  }}
  .anomaly-count {{
    display: inline-block;
    background: #ff4d4f;
    color: white;
    border-radius: 10px;
    padding: 2px 10px;
    font-size: 13px;
    margin-left: 8px;
  }}
  .footer {{
    text-align: center;
    color: #999;
    font-size: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e8e8e8;
  }}
  @media (max-width: 768px) {{
    .charts-row {{ grid-template-columns: 1fr; }}
    .summary-cards {{ grid-template-columns: repeat(2, 1fr); }}
  }}
</style>
</head>
<body>
  <div class="header">
    <h1>📦 {title}</h1>
    <div class="subtitle">报告生成时间：{report_time}</div>
  </div>

  <div class="summary-cards">
    <div class="card">
      <div class="label">波次总数</div>
      <div class="value">{overall.get('total_waves', 0)}</div>
      <div class="sub">参与复盘的波次</div>
    </div>
    <div class="card">
      <div class="label">SKU行数</div>
      <div class="value">{overall.get('total_lines', 0)}</div>
      <div class="sub">波次×SKU组合</div>
    </div>
    <div class="card success">
      <div class="label">拣货完成率</div>
      <div class="value">{overall.get('pick_rate_pct', 0):.2f}%</div>
      <div class="sub">实拣 / 应拣</div>
    </div>
    <div class="card success">
      <div class="label">最终履约率</div>
      <div class="value">{overall.get('fulfill_rate_pct', 0):.2f}%</div>
      <div class="sub">含补发后</div>
    </div>
    <div class="card warning">
      <div class="label">短拣行数</div>
      <div class="value">{overall.get('short_sku_lines', 0)}</div>
      <div class="sub">短拣SKU条目数</div>
    </div>
    <div class="card danger">
      <div class="label">未补发行数</div>
      <div class="value">{overall.get('final_short_sku_lines', 0)}</div>
      <div class="sub">短拣未补发数</div>
    </div>
  </div>

  <div class="section">
    <h2>📊 整体数据概览</h2>
    <table>
      <tr>
        <th>指标</th>
        <th>应拣总数</th>
        <th>实拣总数</th>
        <th>短拣总数</th>
        <th>已补发</th>
        <th>最终短拣</th>
      </tr>
      <tr>
        <td><strong>数量</strong></td>
        <td>{overall.get('total_expected', 0):,}</td>
        <td>{overall.get('total_picked', 0):,}</td>
        <td>{overall.get('total_short', 0):,}</td>
        <td>{overall.get('total_supplemented', 0):,}</td>
        <td><strong style="color:#ff4d4f">{overall.get('total_final_short', 0):,}</strong></td>
      </tr>
    </table>
  </div>

  <div class="charts-row">
    <div class="chart-box">
      <img src="{status_pie_b64}" alt="状态分布">
    </div>
    <div class="chart-box">
      <img src="{anomaly_bar_b64}" alt="异常统计">
    </div>
  </div>

  <div class="chart-box full" style="margin-bottom:20px;">
    <img src="{wave_bar_b64}" alt="各波次对比">
  </div>

  <div class="section">
    <h2>📋 各波次明细</h2>
    {wave_table_html}
  </div>

  <div class="section">
    <h2>⚠️ 异常明细</h2>
    {anomaly_sections_html}
  </div>

  <div class="chart-box full" style="margin-bottom:20px;">
    <img src="{reviewer_bar_b64}" alt="复核人工作量">
  </div>

  <div class="footer">
    本报告由拣货波次复盘分析工具自动生成 · 数据以明细CSV为准
  </div>
</body>
</html>"""
        return html

    @staticmethod
    def _build_wave_table(wave_summary: pd.DataFrame) -> str:
        """构建波次明细表格"""
        if wave_summary.empty:
            return '<p>暂无数据</p>'

        rows = []
        for _, row in wave_summary.iterrows():
            fulfill_rate = row['fulfill_rate_pct']
            rate_str = f"{fulfill_rate:.2f}%"
            if fulfill_rate >= 98:
                rate_tag = f'<span class="tag tag-success">{rate_str}</span>'
            elif fulfill_rate >= 90:
                rate_tag = f'<span class="tag tag-warning">{rate_str}</span>'
            else:
                rate_tag = f'<span class="tag tag-danger">{rate_str}</span>'

            final_short = row['total_final_short']
            short_display = f'<strong style="color:#ff4d4f">{final_short}</strong>' if final_short > 0 else str(final_short)

            rows.append(f"""<tr>
                <td>{row['wave_no']}</td>
                <td>{row['sku_count']}</td>
                <td>{row['total_expected']:,}</td>
                <td>{row['total_picked']:,}</td>
                <td>{short_display}</td>
                <td>{rate_tag}</td>
            </tr>""")

        return f"""<table>
        <tr>
          <th>波次号</th>
          <th>SKU数</th>
          <th>应拣总数</th>
          <th>实拣总数</th>
          <th>最终短拣</th>
          <th>履约率</th>
        </tr>
        {''.join(rows)}
      </table>"""

    @staticmethod
    def _build_anomaly_sections(anomalies: Dict[str, pd.DataFrame]) -> str:
        """构建各异常类型的明细区域"""
        name_map = {
            'short_not_supplemented': ('短拣未补', '短拣后未完成补发的SKU，需优先跟进', 'danger'),
            'reviewer_inconsistent': ('复核人不一致', '同一波次SKU由多人复核，需确认交接是否规范', 'warning'),
            'sku_cross_wave': ('SKU跨波次重复', '同一SKU出现在多个波次，需排查是否重复拣货', 'purple'),
            'over_pick': ('超拣', '实拣数量超过应拣，需确认是否多拣', 'info'),
        }

        sections = []
        for key, (title, desc, tag_type) in name_map.items():
            df = anomalies.get(key, pd.DataFrame())
            if df.empty:
                continue

            count = len(df)
            table_html = ReportGenerator._build_anomaly_table(key, df)

            sections.append(f"""
            <div class="anomaly-section">
              <h3>
                {title}
                <span class="anomaly-count">{count} 条</span>
              </h3>
              <p style="color:#999;margin-bottom:12px;font-size:13px;">{desc}</p>
              {table_html}
            </div>
            """)

        if not sections:
            return '<p>暂无异常数据</p>'

        return ''.join(sections)

    @staticmethod
    def _build_anomaly_table(anomaly_type: str, df: pd.DataFrame) -> str:
        """构建异常明细表"""
        if df.empty:
            return ''

        display_cols_map = {
            'short_not_supplemented': [
                ('wave_no', '波次号'), ('sku', 'SKU'), ('sku_name', '商品名称'),
                ('qty_expected', '应拣'), ('qty_picked', '实拣'),
                ('qty_short', '短拣'), ('qty_supplemented', '已补发'),
                ('qty_final_short', '未补发'), ('picker', '拣货员'),
            ],
            'reviewer_inconsistent': [
                ('wave_no', '波次号'), ('sku', 'SKU'), ('sku_name', '商品名称'),
                ('qty_picked', '实拣数'), ('reviewer_count', '复核人数'),
                ('reviewers', '复核人'), ('picker', '拣货员'),
            ],
            'sku_cross_wave': [
                ('sku', 'SKU'), ('wave_no', '波次号'), ('sku_name', '商品名称'),
                ('qty_expected', '应拣'), ('qty_picked', '实拣'),
                ('qty_supplemented', '补发'), ('status', '状态'),
                ('picker', '拣货员'),
            ],
            'over_pick': [
                ('wave_no', '波次号'), ('sku', 'SKU'), ('sku_name', '商品名称'),
                ('qty_expected', '应拣'), ('qty_picked', '实拣'),
                ('qty_over', '超拣数'), ('reviewers', '复核人'),
                ('picker', '拣货员'),
            ],
        }

        cols = display_cols_map.get(anomaly_type, [])
        if not cols:
            cols = [(c, c) for c in df.columns[:10]]

        header_html = ''.join(f'<th>{name}</th>' for _, name in cols)

        rows_html = []
        for _, row in df.iterrows():
            cells = []
            for col_key, _ in cols:
                if col_key in row.index:
                    cells.append(f'<td>{row[col_key]}</td>')
                else:
                    cells.append('<td>-</td>')
            rows_html.append(f'<tr>{"".join(cells)}</tr>')

        return f"""<table>
        <tr>{header_html}</tr>
        {''.join(rows_html)}
      </table>"""
