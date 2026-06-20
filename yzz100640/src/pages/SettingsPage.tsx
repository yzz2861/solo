import React, { useState, useEffect } from 'react';
import {
  Settings,
  Leaf,
  MapPin,
  Plus,
  Trash2,
  Save,
  UserCog,
  Database,
} from 'lucide-react';
import { CROP_LIBRARY, REGION_LIBRARY } from '@/data/mockData';
import type { CropLibraryItem, RegionLibraryItem } from '@/types';

export default function SettingsPage() {
  const [defaultRegion, setDefaultRegion] = useState('余杭区');
  const [resultLimit, setResultLimit] = useState('8');
  const [historyRetention, setHistoryRetention] = useState('6个月');

  const allCounties = REGION_LIBRARY.flatMap((r: RegionLibraryItem) => r.counties);

  const handleClearHistory = () => {
    if (window.confirm('确认清空所有问答历史记录？')) {
      localStorage.removeItem('qa_history');
      window.alert('已清空');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-bold text-leaf-800 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          系统设置
        </h1>
        <p className="text-sm text-leaf-500 mt-1">
          维护作物品种库、行政区划等基础数据，配置系统参数
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-stagger">
        <div className="card p-5">
          <h4 className="font-serif font-bold text-lg text-leaf-800 mb-1 flex items-center gap-2">
            <Leaf className="w-5 h-5" />
            作物品种库
          </h4>
          <p className="text-xs text-leaf-500 mb-4">
            配置本地主要作物与品种，用于筛选和条件匹配
          </p>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {CROP_LIBRARY.map((crop: CropLibraryItem) => (
              <div
                key={crop.name}
                className="rounded-lg border border-leaf-100 overflow-hidden"
              >
                <div className="flex items-center justify-between p-3 bg-leaf-50/60">
                  <span className="font-medium text-leaf-800">{crop.name}</span>
                  <span className="text-xs text-leaf-500">
                    {crop.varieties.length}个品种
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {crop.varieties.map((v) => (
                      <span key={v} className="chip-default">
                        {v}
                      </span>
                    ))}
                    <span className="chip-default hover:bg-leaf-100 cursor-pointer transition">
                      <Plus className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="text-xs text-leaf-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    主产区：{crop.regions.join('、')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h4 className="font-serif font-bold text-lg text-leaf-800 mb-1 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            行政区划库
          </h4>
          <p className="text-xs text-leaf-500 mb-4">
            配置服务范围的省、市、县三级行政区划
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {REGION_LIBRARY.map((region: RegionLibraryItem) => (
              <div
                key={`${region.province}-${region.city}`}
                className="p-3 rounded-lg bg-leaf-50/40 border border-leaf-100"
              >
                <p className="font-medium text-leaf-800 mb-1">
                  {region.province} - {region.city}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {region.counties.map((c) => (
                    <span key={c} className="chip-soil">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h4 className="font-serif font-bold text-lg text-leaf-800 mb-1 flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            账号与系统配置
          </h4>
          <p className="text-xs text-leaf-500 mb-4">
            用户信息、权限角色和系统默认参数
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-leaf-700">
                当前登录农技员
              </label>
              <input
                type="text"
                className="input bg-leaf-50/50 text-leaf-600"
                value="李农技"
                disabled
              />
              <label className="block text-sm font-medium text-leaf-700">
                所属单位
              </label>
              <input
                type="text"
                className="input bg-leaf-50/50 text-leaf-600"
                value="余杭区农业技术推广中心"
                disabled
              />
              <label className="block text-sm font-medium text-leaf-700">
                角色权限
              </label>
              <div className="flex gap-2">
                <span className="chip-default">农技员</span>
                <span className="chip-harvest">资料录入权</span>
                <span className="chip-sky">导出权限</span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-leaf-700">
                默认地区
              </label>
              <select
                className="select"
                value={defaultRegion}
                onChange={(e) => setDefaultRegion(e.target.value)}
              >
                {allCounties.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <label className="block text-sm font-medium text-leaf-700">
                资料检索结果条数上限
              </label>
              <select
                className="select"
                value={resultLimit}
                onChange={(e) => setResultLimit(e.target.value)}
              >
                <option value="5">5</option>
                <option value="8">8</option>
                <option value="10">10</option>
                <option value="15">15</option>
              </select>
              <label className="block text-sm font-medium text-leaf-700">
                问答历史保留时长
              </label>
              <select
                className="select"
                value={historyRetention}
                onChange={(e) => setHistoryRetention(e.target.value)}
              >
                <option value="3个月">3个月</option>
                <option value="6个月">6个月</option>
                <option value="12个月">12个月</option>
                <option value="永久">永久</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button type="button" className="btn-primary">
              <Save className="w-4 h-4" />
              保存设置
            </button>
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h4 className="font-serif font-bold text-lg text-leaf-800 mb-1 flex items-center gap-2">
            <Database className="w-5 h-5" />
            数据管理
          </h4>
          <p className="text-xs text-leaf-500 mb-4">
            导入导出系统所有数据（问答历史、经验库、采纳记录）
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary">
              <Database className="w-4 h-4" />
              导出所有数据
            </button>
            <button type="button" className="btn-secondary">
              <Database className="w-4 h-4" />
              导入数据备份
            </button>
            <button type="button" className="btn-danger" onClick={handleClearHistory}>
              <Trash2 className="w-4 h-4" />
              清空问答历史
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
