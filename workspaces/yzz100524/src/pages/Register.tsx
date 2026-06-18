import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Battery,
  ShieldAlert,
  Printer,
  CheckCircle,
  X,
  Phone,
  IdCard,
  MapPin,
  Clock,
  DollarSign,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatDateTime, formatMoney } from '@/utils/format';
import {
  INSURANCE_CLAUSE,
  PAYMENT_METHODS,
  ROUTES,
  VEHICLE_STATUS_LABEL,
} from '@/types';
import type { Vehicle, Customer, TestRide } from '@/types';
import { useToast } from '@/store/app';

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const show = useToast((s) => s.show);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [rideForPrint, setRideForPrint] = useState<TestRide | null>(null);

  const [customer, setCustomer] = useState<{
    id?: number;
    name: string;
    phone: string;
    id_card: string;
  }>({ name: '', phone: '', id_card: '' });
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [deposit, setDeposit] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [route, setRoute] = useState(ROUTES[0].value);
  const [customRoute, setCustomRoute] = useState('');
  const [duration, setDuration] = useState(30);
  const [startTime, setStartTime] = useState(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [insuranceConfirmed, setInsuranceConfirmed] = useState(false);
  const [newCustomer, setNewCustomer] = useState(false);

  useEffect(() => {
    api.vehicles.list().then(setVehicles).catch(() => {});
    api.customers.list().then(setCustomers).catch(() => {});

    const printId = params.get('print');
    if (printId) {
      api.testRides
        .list()
        .then((list) => {
          const r = list.find((x: TestRide) => x.id === Number(printId));
          if (r) {
            setRideForPrint(r);
            setTimeout(() => window.print(), 300);
          }
        })
        .catch(() => {});
    }
  }, [params]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) => c.name.includes(customerSearch) || c.phone.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const expectedReturn = useMemo(() => {
    const d = new Date(startTime);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() + duration * 60000);
  }, [startTime, duration]);

  const actualRoute = route === '自定义路线' ? customRoute : route;

  const handleSelectCustomer = (c: Customer) => {
    setCustomer({ id: c.id, name: c.name, phone: c.phone, id_card: c.id_card || '' });
    setCustomerSearch(c.name);
    setNewCustomer(false);
  };

  const validate = () => {
    if (!customer.name || !customer.phone) {
      show('请填写客户姓名和手机号', 'error');
      return false;
    }
    if (!vehicleId) {
      show('请选择试骑车辆', 'error');
      return false;
    }
    if (selectedVehicle && selectedVehicle.battery_level < 20) {
      show('该车辆电量不足 20%，无法安排试骑', 'error');
      return false;
    }
    if (!deposit || deposit <= 0) {
      show('请填写押金金额', 'error');
      return false;
    }
    if (!insuranceConfirmed) {
      show('请先确认保险责任条款', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      let cid = customer.id;
      if (!cid) {
        const res: any = await api.customers.create({
          name: customer.name,
          phone: customer.phone,
          id_card: customer.id_card,
        });
        cid = res.id;
      }

      const res: any = await api.testRides.create({
        customer_id: cid,
        vehicle_id: vehicleId,
        deposit_amount: deposit,
        deposit_payment_method: paymentMethod,
        route: actualRoute,
        planned_duration: duration,
        start_time: new Date(startTime).toISOString(),
        insurance_confirmed: insuranceConfirmed,
      });

      show('试骑登记成功', 'success');
      const r: any = {
        id: res.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        vehicle_model: selectedVehicle?.model,
        vehicle_frame: selectedVehicle?.frame_number,
        deposit_amount: deposit,
        deposit_payment_method: paymentMethod,
        route: actualRoute,
        planned_duration: duration,
        start_time: new Date(startTime).toISOString(),
        expected_return_time: expectedReturn.toISOString(),
        deposit_receipt_no: res.deposit_receipt_no || `TR${Date.now()}`,
        insurance_confirmed: 1,
      };
      setRideForPrint(r);
      setPrintMode(true);
    } catch (e: any) {
      show(e.message || '登记失败', 'error');
    }
    setSubmitting(false);
  };

  if (printMode && rideForPrint) {
    return <PrintReceipt ride={rideForPrint} customerName={customer.name} customerPhone={customer.phone} idCard={customer.id_card} onBack={() => navigate('/')} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft size={18} /> 返回
        </button>
        <div>
          <h1 className="text-2xl font-bold text-primary-500">试骑登记</h1>
          <p className="text-sm text-gray-500 mt-1">录入客户信息，选择车辆和路线</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-primary-500 mb-4 flex items-center gap-2">
              <UserPlus size={20} /> 客户信息
            </h2>

            {!newCustomer && !customer.id ? (
              <div className="space-y-3">
                <label className="label">搜索历史客户（姓名 / 手机号）</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="输入客户姓名或手机号"
                    className="input pl-10"
                  />
                </div>
                {customerSearch && (
                  <div className="border border-gray-200 rounded-lg divide-y max-h-60 overflow-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-sm text-gray-400 text-center">
                        未找到历史客户
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full p-3 flex items-center justify-between hover:bg-primary-50 text-left transition"
                        >
                          <div>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-gray-400">
                              {c.phone} {c.id_card ? `· ${c.id_card}` : ''}
                            </div>
                          </div>
                          {c.tags && (
                            <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                              {c.tags.split(',').filter(Boolean).map((t) => (
                                <span key={t} className="badge-blue">{t}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <button onClick={() => setNewCustomer(true)} className="btn-secondary w-full">
                  <UserPlus size={16} /> 新建客户档案
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-primary-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-primary-500">{customer.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>
                        {customer.id_card && (
                          <span className="flex items-center gap-1"><IdCard size={12} /> {customer.id_card}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCustomer({ name: '', phone: '', id_card: '' });
                      setCustomerSearch('');
                      setNewCustomer(false);
                    }}
                    className="text-gray-400 hover:text-danger"
                  >
                    <X size={18} />
                  </button>
                </div>

                {(newCustomer || !customer.id) && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="label">姓名 *</label>
                      <input
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        className="input"
                        placeholder="请输入客户姓名"
                      />
                    </div>
                    <div>
                      <label className="label">手机号 *</label>
                      <input
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        className="input"
                        placeholder="请输入手机号"
                      />
                    </div>
                    <div>
                      <label className="label">身份证号</label>
                      <input
                        value={customer.id_card}
                        onChange={(e) => setCustomer({ ...customer, id_card: e.target.value })}
                        className="input"
                        placeholder="可选"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-primary-500 mb-4 flex items-center gap-2">
              <Battery size={20} /> 选择车辆
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {vehicles.map((v) => {
                const disabled = v.battery_level < 20 || v.status !== 'available';
                const selected = vehicleId === v.id;
                const low = v.battery_level < 20;
                return (
                  <button
                    key={v.id}
                    disabled={disabled}
                    onClick={() => !disabled && setVehicleId(v.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : disabled
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-100 bg-white hover:border-primary-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-primary-500">{v.model}</div>
                      <span className={`badge ${low ? 'badge-red' : v.status === 'available' ? 'badge-green' : 'badge-gray'}`}>
                        {low ? '电量不足' : VEHICLE_STATUS_LABEL[v.status]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">车架号: {v.frame_number}</div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">电量</span>
                        <span className={low ? 'text-danger font-medium' : 'text-gray-600'}>
                          {v.battery_level}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            low ? 'bg-danger' : v.battery_level < 50 ? 'bg-warning' : 'bg-success'
                          }`}
                          style={{ width: `${v.battery_level}%` }}
                        />
                      </div>
                    </div>
                    {low && (
                      <div className="text-xs text-danger mt-2 flex items-center gap-1">
                        <Battery size={12} /> 低于 20% 无法试骑
                      </div>
                    )}
                    {selected && (
                      <div className="text-xs text-primary-500 mt-2 flex items-center gap-1">
                        <CheckCircle size={12} /> 已选择
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-primary-500 mb-4 flex items-center gap-2">
              <ShieldAlert size={20} /> 保险责任条款
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {INSURANCE_CLAUSE}
            </div>
            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={insuranceConfirmed}
                onChange={(e) => setInsuranceConfirmed(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-400"
              />
              <span className="text-sm font-medium text-gray-700">
                客户已阅读并确认以上保险责任条款
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card sticky top-6">
            <h2 className="text-lg font-semibold text-primary-500 mb-4">试骑信息</h2>

            <div className="space-y-4">
              <div>
                <label className="label flex items-center gap-1">
                  <DollarSign size={12} /> 押金金额（元）*
                </label>
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                  className="input text-lg font-semibold text-accent-600"
                  min={0}
                />
              </div>

              <div>
                <label className="label flex items-center gap-1">
                  <CreditCard size={12} /> 支付方式
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label flex items-center gap-1">
                  <MapPin size={12} /> 试骑路线
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="input"
                >
                  {ROUTES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {route === '自定义路线' && (
                  <input
                    value={customRoute}
                    onChange={(e) => setCustomRoute(e.target.value)}
                    placeholder="请输入自定义路线"
                    className="input mt-2"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1">
                    <Clock size={12} /> 开始时间
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    <Clock size={12} /> 试骑时长（分钟）
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="input"
                    min={10}
                    step={5}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">预计归还时间</div>
                <div className="font-semibold text-primary-500">
                  {expectedReturn ? formatDateTime(expectedReturn.toISOString()) : '-'}
                </div>
              </div>

              {selectedVehicle && (
                <div className="bg-primary-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">已选车辆</div>
                  <div className="font-semibold text-primary-500">{selectedVehicle.model}</div>
                  <div className="text-xs text-gray-500 mt-1">{selectedVehicle.frame_number}</div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-gray-100 space-y-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary w-full !py-3 text-base"
              >
                {submitting ? '登记中...' : '确认登记并打印确认单'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-ghost w-full"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>

      {rideForPrint && !printMode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-5 border-b flex items-center justify-between no-print">
              <h3 className="font-bold text-lg">试骑确认单预览</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="btn-primary">
                  <Printer size={16} /> 打印
                </button>
                <button onClick={() => navigate('/')} className="btn-secondary">
                  返回看板
                </button>
              </div>
            </div>
            <PrintReceipt ride={rideForPrint} customerName={customer.name} customerPhone={customer.phone} idCard={customer.id_card} />
          </div>
        </div>
      )}
    </div>
  );
}

interface PrintProps {
  ride: TestRide;
  customerName: string;
  customerPhone: string;
  idCard?: string;
  onBack?: () => void;
}

function PrintReceipt({ ride, customerName, customerPhone, idCard, onBack }: PrintProps) {
  return (
    <div className="p-8 print-area">
      <div className="text-center border-b-2 border-primary-500 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-primary-500">电动车试骑确认单</h1>
        <div className="text-sm text-gray-500 mt-2">押金收据编号: {ride.deposit_receipt_no}</div>
      </div>

      <div className="space-y-4 text-sm">
        <section>
          <div className="font-semibold text-primary-500 mb-2 border-l-4 border-primary-500 pl-2">客户信息</div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-gray-500">姓名：</span>{customerName || ride.customer_name}</div>
            <div><span className="text-gray-500">手机号：</span>{customerPhone || ride.customer_phone}</div>
            {idCard && <div className="col-span-2"><span className="text-gray-500">身份证：</span>{idCard}</div>}
          </div>
        </section>

        <section>
          <div className="font-semibold text-primary-500 mb-2 border-l-4 border-primary-500 pl-2">车辆信息</div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-gray-500">车型：</span>{ride.vehicle_model}</div>
            <div><span className="text-gray-500">车架号：</span>{ride.vehicle_frame}</div>
          </div>
        </section>

        <section>
          <div className="font-semibold text-primary-500 mb-2 border-l-4 border-primary-500 pl-2">试骑信息</div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-gray-500">开始时间：</span>{formatDateTime(ride.start_time)}</div>
            <div><span className="text-gray-500">预计归还：</span>{formatDateTime(ride.expected_return_time)}</div>
            <div><span className="text-gray-500">试骑时长：</span>{ride.planned_duration} 分钟</div>
            <div className="col-span-2"><span className="text-gray-500">试骑路线：</span>{ride.route || '-'}</div>
          </div>
        </section>

        <section>
          <div className="font-semibold text-primary-500 mb-2 border-l-4 border-primary-500 pl-2">押金信息</div>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-gray-500">押金金额：</span><span className="font-bold text-accent-600 text-lg">{formatMoney(ride.deposit_amount)}</span></div>
            <div>
              <span className="text-gray-500">支付方式：</span>
              {PAYMENT_METHODS.find((m) => m.value === ride.deposit_payment_method)?.label || ride.deposit_payment_method}
            </div>
          </div>
        </section>

        <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="font-semibold text-warning mb-2 flex items-center gap-1">
            <ShieldAlert size={16} /> 保险责任条款
          </div>
          <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{INSURANCE_CLAUSE}</div>
        </section>

        <div className="grid grid-cols-2 gap-6 pt-4">
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-8">客户签字确认</div>
            <div className="border-t border-gray-400 h-px" />
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-8">门店经办人</div>
            <div className="border-t border-gray-400 h-px" />
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pt-4">
          开单时间：{formatDateTime(ride.start_time)}
        </div>
      </div>

      {onBack && (
        <div className="mt-6 no-print text-center">
          <button onClick={onBack} className="btn-primary">
            <Printer size={16} /> 打印确认单
          </button>
        </div>
      )}
    </div>
  );
}
