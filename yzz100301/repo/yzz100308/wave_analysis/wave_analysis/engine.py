"""
数据关联引擎
按波次号 + SKU 串起应拣、实拣、复核、补发四个环节的状态
"""
from typing import Dict, List, Tuple

import pandas as pd


class WaveAnalysisEngine:
    """波次分析引擎，整合多源数据并生成关联明细"""

    def __init__(self):
        self.wave_df = pd.DataFrame()
        self.review_df = pd.DataFrame()
        self.supplement_df = pd.DataFrame()
        self.merged_df = pd.DataFrame()

    def load_data(self, wave_df: pd.DataFrame, review_df: pd.DataFrame, supplement_df: pd.DataFrame):
        """加载三类数据"""
        self.wave_df = wave_df.copy()
        self.review_df = review_df.copy()
        self.supplement_df = supplement_df.copy()

    def _aggregate_by_wave_sku(self, df: pd.DataFrame, qty_col: str, extra_cols: List[str] = None) -> pd.DataFrame:
        """按 wave_no + sku 聚合数量"""
        if df.empty:
            return pd.DataFrame(columns=['wave_no', 'sku', qty_col])

        agg_dict = {qty_col: 'sum'}
        if extra_cols:
            for col in extra_cols:
                if col in df.columns:
                    agg_dict[col] = 'first'

        grouped = df.groupby(['wave_no', 'sku'], as_index=False).agg(agg_dict)
        return grouped

    def build_merged_detail(self) -> pd.DataFrame:
        """
        构建关联明细，以波次表为主表，左连接复核和补发数据
        
        字段说明:
        - qty_expected: 应拣数量
        - qty_picked: 实拣数量 (来自复核扫描)
        - qty_short: 短拣数量 = 应拣 - 实拣 (最小为0)
        - qty_supplemented: 已补发数量
        - qty_final_short: 最终短拣 = 短拣 - 已补发 (最小为0)
        - status: 状态 (完整/短拣已补/短拣未补/超拣)
        - reviewers: 复核人列表
        - reviewer_count: 复核人数
        """
        if self.wave_df.empty:
            self.merged_df = pd.DataFrame()
            return self.merged_df

        wave_agg = self._aggregate_by_wave_sku(
            self.wave_df, 'qty_expected',
            extra_cols=['sku_name', 'picker', 'warehouse', 'create_time']
        )

        review_agg = self._aggregate_by_wave_sku(self.review_df, 'qty_picked')

        review_details = self._get_review_details()

        supplement_agg = self._aggregate_by_wave_sku(
            self.supplement_df, 'qty_supplemented',
            extra_cols=['operator', 'reason']
        )

        merged = wave_agg.merge(review_agg, on=['wave_no', 'sku'], how='left')
        merged = merged.merge(review_details, on=['wave_no', 'sku'], how='left')
        merged = merged.merge(supplement_agg, on=['wave_no', 'sku'], how='left')

        merged['qty_picked'] = merged['qty_picked'].fillna(0).astype(int)
        merged['qty_supplemented'] = merged['qty_supplemented'].fillna(0).astype(int)
        merged['reviewer_count'] = merged['reviewer_count'].fillna(0).astype(int)
        merged['reviewers'] = merged['reviewers'].fillna('')

        merged['qty_short'] = (merged['qty_expected'] - merged['qty_picked']).clip(lower=0).astype(int)
        merged['qty_final_short'] = (merged['qty_short'] - merged['qty_supplemented']).clip(lower=0).astype(int)
        merged['qty_over'] = (merged['qty_picked'] - merged['qty_expected']).clip(lower=0).astype(int)

        merged['status'] = merged.apply(self._calc_status, axis=1)

        pick_rate = (merged['qty_picked'] / merged['qty_expected'] * 100).round(2)
        merged['pick_rate_pct'] = pick_rate
        fulfill_rate = ((merged['qty_expected'] - merged['qty_final_short']) / merged['qty_expected'] * 100).round(2)
        merged['fulfill_rate_pct'] = fulfill_rate

        self.merged_df = merged.sort_values(['wave_no', 'sku']).reset_index(drop=True)
        return self.merged_df

    def _get_review_details(self) -> pd.DataFrame:
        """获取每个波次-SKU的复核人详情"""
        if self.review_df.empty:
            return pd.DataFrame(columns=['wave_no', 'sku', 'reviewers', 'reviewer_count'])

        def agg_reviewers(group):
            reviewers = sorted(set(group['reviewer'].dropna().astype(str).tolist()))
            reviewers = [r for r in reviewers if r]
            return pd.Series({
                'reviewers': '、'.join(reviewers),
                'reviewer_count': len(reviewers),
                'first_review_time': group['review_time'].min() if 'review_time' in group.columns else '',
                'last_review_time': group['review_time'].max() if 'review_time' in group.columns else ''
            })

        result = self.review_df.groupby(['wave_no', 'sku']).apply(agg_reviewers).reset_index()
        return result

    @staticmethod
    def _calc_status(row) -> str:
        """计算单行状态"""
        if row['qty_over'] > 0:
            return '超拣'
        if row['qty_short'] == 0:
            return '完整'
        if row['qty_final_short'] == 0:
            return '短拣已补'
        return '短拣未补'

    def get_wave_summary(self) -> pd.DataFrame:
        """按波次汇总统计"""
        if self.merged_df.empty:
            return pd.DataFrame()

        wave_summary = self.merged_df.groupby('wave_no', as_index=False).agg(
            sku_count=('sku', 'nunique'),
            total_expected=('qty_expected', 'sum'),
            total_picked=('qty_picked', 'sum'),
            total_short=('qty_short', 'sum'),
            total_supplemented=('qty_supplemented', 'sum'),
            total_final_short=('qty_final_short', 'sum'),
            short_sku_count=('qty_short', lambda x: (x > 0).sum()),
            final_short_sku_count=('qty_final_short', lambda x: (x > 0).sum()),
        )

        wave_summary['pick_rate_pct'] = (
            wave_summary['total_picked'] / wave_summary['total_expected'] * 100
        ).round(2)
        wave_summary['fulfill_rate_pct'] = (
            (wave_summary['total_expected'] - wave_summary['total_final_short'])
            / wave_summary['total_expected'] * 100
        ).round(2)

        return wave_summary.sort_values('wave_no').reset_index(drop=True)

    def get_overall_summary(self) -> Dict:
        """获取总体汇总数据"""
        if self.merged_df.empty:
            return {}

        total_expected = int(self.merged_df['qty_expected'].sum())
        total_picked = int(self.merged_df['qty_picked'].sum())
        total_short = int(self.merged_df['qty_short'].sum())
        total_supplemented = int(self.merged_df['qty_supplemented'].sum())
        total_final_short = int(self.merged_df['qty_final_short'].sum())

        short_skus = int((self.merged_df['qty_short'] > 0).sum())
        final_short_skus = int((self.merged_df['qty_final_short'] > 0).sum())
        total_skus = int(self.merged_df['sku'].nunique())
        total_waves = int(self.merged_df['wave_no'].nunique())

        return {
            'total_waves': total_waves,
            'total_skus': total_skus,
            'total_lines': len(self.merged_df),
            'total_expected': total_expected,
            'total_picked': total_picked,
            'total_short': total_short,
            'total_supplemented': total_supplemented,
            'total_final_short': total_final_short,
            'short_sku_lines': short_skus,
            'final_short_sku_lines': final_short_skus,
            'pick_rate_pct': round(total_picked / total_expected * 100, 2) if total_expected > 0 else 0,
            'fulfill_rate_pct': round((total_expected - total_final_short) / total_expected * 100, 2) if total_expected > 0 else 0,
        }

    def get_reviewer_summary(self) -> pd.DataFrame:
        """按复核人汇总统计"""
        if self.review_df.empty:
            return pd.DataFrame(columns=['reviewer', 'wave_count', 'sku_count', 'total_picked'])

        reviewer_stats = self.review_df.groupby('reviewer', as_index=False).agg(
            wave_count=('wave_no', 'nunique'),
            sku_count=('sku', 'nunique'),
            total_picked=('qty_picked', 'sum'),
        )
        return reviewer_stats.sort_values('total_picked', ascending=False).reset_index(drop=True)
