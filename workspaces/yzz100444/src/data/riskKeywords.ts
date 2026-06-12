import type { RiskKeyword } from '@/types';

export const riskKeywords: RiskKeyword[] = [
  { keyword: '误食', severity: 'high', category: '安全健康' },
  { keyword: '中毒', severity: 'high', category: '安全健康' },
  { keyword: '过敏', severity: 'high', category: '安全健康' },
  { keyword: '窒息', severity: 'high', category: '安全健康' },
  { keyword: '危险', severity: 'high', category: '安全健康' },
  { keyword: '受伤', severity: 'high', category: '安全健康' },
  { keyword: '安全', severity: 'high', category: '安全健康' },
  { keyword: '儿童', severity: 'high', category: '安全健康' },
  { keyword: '小孩', severity: 'high', category: '安全健康' },
  { keyword: '宝宝', severity: 'high', category: '安全健康' },
  { keyword: '有毒', severity: 'high', category: '安全健康' },
  { keyword: '有害', severity: 'high', category: '安全健康' },
  { keyword: '致癌', severity: 'high', category: '安全健康' },
  { keyword: '爆炸', severity: 'high', category: '安全健康' },
  { keyword: '起火', severity: 'high', category: '安全健康' },
  { keyword: '漏电', severity: 'high', category: '安全健康' },
  
  { keyword: '质量差', severity: 'medium', category: '质量问题' },
  { keyword: '假货', severity: 'medium', category: '质量问题' },
  { keyword: '劣质', severity: 'medium', category: '质量问题' },
  { keyword: '损坏', severity: 'medium', category: '质量问题' },
  { keyword: '破损', severity: 'medium', category: '质量问题' },
  { keyword: '故障', severity: 'medium', category: '质量问题' },
  { keyword: '售后', severity: 'medium', category: '售后服务' },
  { keyword: '客服', severity: 'medium', category: '售后服务' },
  { keyword: '退款', severity: 'medium', category: '售后服务' },
  { keyword: '退货', severity: 'medium', category: '售后服务' },
  { keyword: '投诉', severity: 'medium', category: '售后服务' },
  { keyword: '欺骗', severity: 'medium', category: '售后服务' },
  { keyword: '虚假', severity: 'medium', category: '售后服务' },
  { keyword: '夸大', severity: 'medium', category: '售后服务' },
  
  { keyword: '不好用', severity: 'low', category: '使用体验' },
  { keyword: '难用', severity: 'low', category: '使用体验' },
  { keyword: '不方便', severity: 'low', category: '使用体验' },
  { keyword: '复杂', severity: 'low', category: '使用体验' },
  { keyword: '太慢', severity: 'low', category: '使用体验' },
  { keyword: '太贵', severity: 'low', category: '价格体验' },
  { keyword: '不值', severity: 'low', category: '价格体验' },
  { keyword: '建议', severity: 'low', category: '用户建议' },
  { keyword: '希望', severity: 'low', category: '用户建议' },
  { keyword: '改善', severity: 'low', category: '用户建议' },
];

export const highRiskKeywords = riskKeywords.filter(k => k.severity === 'high').map(k => k.keyword);
export const mediumRiskKeywords = riskKeywords.filter(k => k.severity === 'medium').map(k => k.keyword);
export const lowRiskKeywords = riskKeywords.filter(k => k.severity === 'low').map(k => k.keyword);
