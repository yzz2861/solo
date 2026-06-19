import React, { useState, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  X,
  Camera,
  Image as ImageIcon,
  Search,
  ChevronDown,
  Filter,
  FileText,
  AlertCircle,
  Info,
  Tag,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import {
  getWasteReasonLabel,
  getWasteReasonColor,
  getTimeSlotLabel,
  formatDate,
} from '../../../utils/formatters';
import type { WasteReason, TimeSlot, WasteRecord } from '../../../types';

interface WasteItem {
  productId: string;
  quantity: number;
  reason: WasteReason;
  timeSlot: TimeSlot;
  photos: string[];
  remark?: string;
}

const wasteReasons: { value: WasteReason; label: string; color: string }[] = [
  { value: 'expired', label: '过期', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'poorQuality', label: '品相不佳', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'customerReturn', label: '顾客退回', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'systemReturn', label: '系统退货', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'unknown', label: '原因空白', color: 'bg-slate-100 text-slate-500 border-slate-200' },
];

const timeSlots: { value: TimeSlot; label: string }[] = [
  { value: 'morning', label: '早餐 (06-09)' },
  { value: 'noon', label: '午餐 (11-13:30)' },
  { value: 'afternoon', label: '下午茶 (14-17)' },
  { value: 'evening', label: '晚餐 (17:30-20:30)' },
  { value: 'night', label: '夜宵 (21-24)' },
];

export default function WasteReportPage() {
  const { state, addWasteRecord, getProductById, getStoreWaste, getCategoryById } = useApp();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>('evening');
  const [selectedReason, setSelectedReason] = useState<WasteReason>('expired');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  const wasteRecords = getStoreWaste();
  const today = formatDate(new Date());

  const filteredProducts = useMemo(() => {
    let products = state.products;
    if (selectedCategory) {
      products = products.filter(p => p.categoryId === selectedCategory);
    }
    if (searchQuery) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return products;
  }, [state.products, selectedCategory, searchQuery]);

  const todayRecords = useMemo(() => {
    return wasteRecords.filter(r => r.date === today);
  }, [wasteRecords, today]);

  const addProduct = (productId: string) => {
    const existing = wasteItems.findIndex(
      item => item.productId === productId && item.reason === selectedReason && item.timeSlot === selectedTimeSlot
    );

    if (existing >= 0) {
      const newItems = [...wasteItems];
      newItems[existing].quantity += 1;
      setWasteItems(newItems);
    } else {
      setWasteItems([
        ...wasteItems,
        {
          productId,
          quantity: 1,
          reason: selectedReason,
          timeSlot: selectedTimeSlot,
          photos: [],
        },
      ]);
    }
    setShowProductPicker(false);
    setSearchQuery('');
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...wasteItems];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    setWasteItems(newItems);
  };

  const removeItem = (index: number) => {
    setWasteItems(wasteItems.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || activeItemIndex === null) return;

    const newItems = [...wasteItems];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newItems[activeItemIndex].photos.push(event.target.result as string);
          setWasteItems([...newItems]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (itemIndex: number, photoIndex: number) => {
    const newItems = [...wasteItems];
    newItems[itemIndex].photos.splice(photoIndex, 1);
    setWasteItems(newItems);
  };

  const submitWaste = () => {
    if (wasteItems.length === 0) {
      alert('请至少添加一项报损商品');
      return;
    }

    wasteItems.forEach(item => {
      addWasteRecord({
        storeId: state.currentStoreId,
        productId: item.productId,
        date: today,
        timeSlot: item.timeSlot,
        quantity: item.quantity,
        reason: item.reason,
        photoUrls: item.photos,
        isSystemReturn: item.reason === 'systemReturn',
        remark: item.remark,
      });
    });

    setWasteItems([]);
    alert('报损记录已提交！');
    setActiveTab('history');
  };

  const totalWasteQty = wasteItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">报损上报</h1>
          <p className="text-gray-500 mt-1">记录今日报损商品，上传照片留证</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-card p-1">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'new'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            新建报损
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            历史记录
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">选择报损时段</h3>
              <div className="flex flex-wrap gap-2">
                {timeSlots.map(slot => (
                  <button
                    key={slot.value}
                    onClick={() => setSelectedTimeSlot(slot.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedTimeSlot === slot.value
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">选择报损原因</h3>
              <div className="flex flex-wrap gap-2">
                {wasteReasons.map(reason => (
                  <button
                    key={reason.value}
                    onClick={() => setSelectedReason(reason.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                      selectedReason === reason.value
                        ? `${reason.color} border-current shadow-md`
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
              {selectedReason === 'systemReturn' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">系统退货说明</p>
                    <p className="text-blue-600 mt-1">
                      系统退货指因临期等原因由总部系统自动发起的退货，不计入门店考核。
                      请配合上传商品照片以便总部复核。
                    </p>
                  </div>
                </div>
              )}
              {selectedReason === 'unknown' && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">原因空白提醒</p>
                    <p className="text-yellow-600 mt-1">
                      建议尽量填写明确的报损原因，便于后续分析和改进。
                      原因空白的记录会被标记并在督导报告中体现。
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">添加报损商品</h3>
                <button
                  onClick={() => setShowProductPicker(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  添加商品
                </button>
              </div>

              {wasteItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>暂无报损商品</p>
                  <p className="text-sm mt-1">点击上方按钮添加报损商品</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wasteItems.map((item, index) => {
                    const product = getProductById(item.productId);
                    if (!product) return null;

                    return (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-xl p-4 hover:border-primary-200 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center text-xl">
                              🍱
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{product.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getWasteReasonColor(item.reason)}`}>
                                  {getWasteReasonLabel(item.reason)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {getTimeSlotLabel(item.timeSlot)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(index)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQuantity(index, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                              <span className="text-lg font-medium">-</span>
                            </button>
                            <span className="w-12 text-center font-semibold text-lg text-gray-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(index, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                              <span className="text-lg font-medium">+</span>
                            </button>
                            <span className="text-sm text-gray-500 ml-2">{product.unit}</span>
                          </div>
                          <button
                            onClick={() => {
                              setActiveItemIndex(index);
                              fileInputRef.current?.click();
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Camera className="w-4 h-4" />
                            {item.photos.length > 0 ? `${item.photos.length}张照片` : '上传照片'}
                          </button>
                        </div>

                        {item.photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                            {item.photos.map((photo, pIndex) => (
                              <div key={pIndex} className="relative group">
                                <img
                                  src={photo}
                                  alt="报损照片"
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => removePhoto(index, pIndex)}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {item.reason === 'systemReturn' && item.remark && (
                          <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded-lg p-2">
                            系统备注：{item.remark}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-card p-5 sticky top-6">
              <h3 className="font-semibold text-gray-800 mb-4">报损汇总</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">商品种类</span>
                  <span className="font-semibold text-gray-800">{wasteItems.length} 种</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">报损总数</span>
                  <span className="font-semibold text-xl text-red-600">{totalWasteQty} 件</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">上传照片</span>
                  <span className="font-semibold text-gray-800">
                    {wasteItems.reduce((sum, item) => sum + item.photos.length, 0)} 张
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500 mb-3">按原因分布</div>
                <div className="space-y-2">
                  {wasteReasons.map(reason => {
                    const count = wasteItems.filter(i => i.reason === reason.value).length;
                    const pct = wasteItems.length > 0 ? (count / wasteItems.length) * 100 : 0;
                    return (
                      <div key={reason.value} className="flex items-center gap-2">
                        <div className="w-20 text-xs text-gray-500">{reason.label}</div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-8 text-xs text-right text-gray-600">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  促销与报损说明
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-700 mb-1">买一赠一</div>
                    <p className="text-green-600">
                      买一赠一活动可有效降低报损。活动期间的销量提升不计入报损考核。
                    </p>
                  </div>
                  <div className="p-2.5 bg-purple-50 rounded-lg">
                    <div className="font-medium text-purple-700 mb-1">临时团购</div>
                    <p className="text-purple-600">
                      临期商品发起团购可批量清货。团购销量在报损分析中会单独标注。
                    </p>
                  </div>
                  <div className="p-2.5 bg-yellow-50 rounded-lg">
                    <div className="font-medium text-yellow-700 mb-1">时段折扣</div>
                    <p className="text-yellow-600">
                      晚间时段折扣是减少当日报损的主要手段，建议根据销售情况灵活调整。
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={submitWaste}
                disabled={wasteItems.length === 0}
                className="w-full mt-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                提交报损记录
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                提交后数据将进入分析系统，支持追溯
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">历史报损记录</h3>
            <p className="text-sm text-gray-500 mt-1">今日共 {todayRecords.length} 条报损记录</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">商品</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">数量</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">原因</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">照片</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayRecords.slice(0, 20).map(record => {
                  const product = getProductById(record.productId);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getTimeSlotLabel(record.timeSlot)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{product?.name}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-red-600">
                        {record.quantity} {product?.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getWasteReasonColor(record.reason)}`}>
                          {getWasteReasonLabel(record.reason)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {record.photoUrls.length > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-blue-600">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-sm">{record.photoUrls.length}张</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {record.isSystemReturn ? '系统退货' : record.remark || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {todayRecords.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>今日暂无报损记录</p>
            </div>
          )}
        </div>
      )}

      {showProductPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">选择商品</h3>
                <button
                  onClick={() => setShowProductPicker(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索商品名称..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 text-sm"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    selectedCategory === null
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                {state.categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-lg">
                      🍱
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{product.name}</div>
                      <div className="text-xs text-gray-400">
                        {getCategoryById(product.categoryId)?.name} · ¥{product.price}/{product.unit}
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-gray-300" />
                  </button>
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  没有找到匹配的商品
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  );
}
