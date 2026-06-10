"""
异常检测模块
检测三类异常：短拣未补、复核人不一致、同SKU跨波次重复
"""
from typing import Dict, List

import pandas as pd


class AnomalyDetector:
    """异常检测器"""

    def __init__(self, engine):
        self.engine = engine
        self.anomalies = {}

    def detect_all(self) -> Dict[str, pd.DataFrame]:
        """检测所有类型的异常"""
        self.anomalies['short_not_supplemented'] = self.detect_short_not_supplemented()
        self.anomalies['reviewer_inconsistent'] = self.detect_reviewer_inconsistent()
        self.anomalies['sku_cross_wave'] = self.detect_sku_cross_wave()
        self.anomalies['over_pick'] = self.detect_over_pick()
        return self.anomalies

    def detect_short_not_supplemented(self) -> pd.DataFrame:
        """
        检测短拣未补异常
        
        条件: 最终短拣数量 > 0
        """
        df = self.engine.merged_df
        if df.empty:
            return pd.DataFrame()

        result = df[df['qty_final_short'] > 0].copy()
        result = result[[
            'wave_no', 'sku', 'sku_name', 'qty_expected', 'qty_picked',
            'qty_short', 'qty_supplemented', 'qty_final_short',
            'picker', 'warehouse'
        ]].sort_values(['wave_no', 'sku']).reset_index(drop=True)

        result.insert(0, 'anomaly_type', '短拣未补')
        return result

    def detect_reviewer_inconsistent(self) -> pd.DataFrame:
        """
        检测复核人不一致异常
        
        条件: 同一个波次+SKU组合有多个不同的复核人
        """
        df = self.engine.merged_df
        if df.empty:
            return pd.DataFrame()

        result = df[(df['reviewer_count'] > 1) & (df['reviewers'] != '')].copy()
        result = result[[
            'wave_no', 'sku', 'sku_name', 'qty_picked',
            'reviewers', 'reviewer_count', 'picker'
        ]].sort_values(['wave_no', 'sku']).reset_index(drop=True)

        result.insert(0, 'anomaly_type', '复核人不一致')
        return result

    def detect_sku_cross_wave(self) -> pd.DataFrame:
        """
        检测同SKU跨波次重复异常
        
        条件: 同一个SKU出现在多个波次中，需重点关注是否重复拣货
        """
        df = self.engine.merged_df
        if df.empty:
            return pd.DataFrame()

        sku_wave_count = df.groupby('sku')['wave_no'].nunique()
        cross_wave_skus = sku_wave_count[sku_wave_count > 1].index.tolist()

        if not cross_wave_skus:
            return pd.DataFrame()

        result = df[df['sku'].isin(cross_wave_skus)].copy()
        result = result[[
            'wave_no', 'sku', 'sku_name', 'qty_expected', 'qty_picked',
            'qty_supplemented', 'status', 'picker'
        ]].sort_values(['sku', 'wave_no']).reset_index(drop=True)

        wave_counts = result.groupby('sku')['wave_no'].nunique().to_dict()
        result['wave_count'] = result['sku'].map(wave_counts)

        result.insert(0, 'anomaly_type', 'SKU跨波次重复')
        return result

    def detect_over_pick(self) -> pd.DataFrame:
        """
        检测超拣异常
        
        条件: 实拣数量 > 应拣数量
        """
        df = self.engine.merged_df
        if df.empty:
            return pd.DataFrame()

        result = df[df['qty_over'] > 0].copy()
        result = result[[
            'wave_no', 'sku', 'sku_name', 'qty_expected', 'qty_picked',
            'qty_over', 'reviewers', 'picker'
        ]].sort_values(['wave_no', 'sku']).reset_index(drop=True)

        result.insert(0, 'anomaly_type', '超拣')
        return result

    def get_anomaly_summary(self) -> Dict:
        """获取异常汇总"""
        summary = {}
        for name, df in self.anomalies.items():
            summary[name] = {
                'count': len(df),
                'description': self._get_anomaly_description(name),
            }
        return summary

    @staticmethod
    def _get_anomaly_description(name: str) -> str:
        descriptions = {
            'short_not_supplemented': '短拣后未完成补发的SKU明细',
            'reviewer_inconsistent': '同一波次SKU由多人复核，需确认是否存在交接问题',
            'sku_cross_wave': '同一SKU出现在多个波次，需排查是否重复拣货',
            'over_pick': '实拣数量超过应拣数量的异常记录',
        }
        return descriptions.get(name, '')

    def export_anomalies_csv(self, output_dir: str) -> Dict[str, str]:
        """导出所有异常明细为CSV文件"""
        import os
        os.makedirs(output_dir, exist_ok=True)

        file_paths = {}
        for name, df in self.anomalies.items():
            if not df.empty:
                filepath = os.path.join(output_dir, f'anomaly_{name}.csv')
                df.to_csv(filepath, index=False, encoding='utf-8-sig')
                file_paths[name] = filepath
        return file_paths

    def export_all_anomalies_csv(self, output_path: str) -> str:
        """将所有异常合并导出为一个CSV文件"""
        import os
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        all_anomalies = []
        for df in self.anomalies.values():
            if not df.empty:
                all_anomalies.append(df)

        if all_anomalies:
            combined = pd.concat(all_anomalies, ignore_index=True)
            combined.to_csv(output_path, index=False, encoding='utf-8-sig')
            return output_path
        return ''
