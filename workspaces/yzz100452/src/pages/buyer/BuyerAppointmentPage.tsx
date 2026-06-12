import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock,
  User,
  Phone,
  StickyNote,
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { StatusTag } from '@/components/ui/StatusTag';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useCameraStore } from '@/store/cameraStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils/format';
import { cn } from '@/utils/cn';

const BRASS_GRADIENT = 'linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)';

const TIME_SLOT_OPTIONS = [
  { value: 'morning', label: '上午 (09:00 - 12:00)' },
  { value: 'afternoon', label: '下午 (13:00 - 17:00)' },
  { value: 'evening', label: '晚间 (17:00 - 20:00)' },
];

export default function BuyerAppointmentPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  const { equipments, addAppointment } = useCameraStore();
  const { currentUser } = useAuthStore();

  const equipment = useMemo(
    () => equipments.find((e) => e.id === equipmentId),
    [equipments, equipmentId]
  );

  const [formData, setFormData] = useState({
    buyerName: currentUser?.name || '',
    buyerPhone: currentUser?.phone || '',
    appointmentDate: '',
    appointmentTimeSlot: '',
    note: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const today = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.buyerName.trim()) {
      newErrors.buyerName = '请输入您的姓名';
    } else if (formData.buyerName.trim().length < 2) {
      newErrors.buyerName = '姓名至少2个字符';
    }

    if (!formData.buyerPhone.trim()) {
      newErrors.buyerPhone = '请输入手机号';
    } else if (!/^1[3-9]\d{9}$/.test(formData.buyerPhone.trim())) {
      newErrors.buyerPhone = '请输入正确的11位手机号';
    }

    if (!formData.appointmentDate) {
      newErrors.appointmentDate = '请选择看机日期';
    } else if (formData.appointmentDate < today) {
      newErrors.appointmentDate = '看机日期不能早于今天';
    }

    if (!formData.appointmentTimeSlot) {
      newErrors.appointmentTimeSlot = '请选择看机时段';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      addAppointment({
        equipmentId: equipment.id,
        buyerName: formData.buyerName.trim(),
        buyerPhone: formData.buyerPhone.trim(),
        appointmentDate: formData.appointmentDate,
        appointmentTimeSlot:
          TIME_SLOT_OPTIONS.find((t) => t.value === formData.appointmentTimeSlot)?.label ||
          formData.appointmentTimeSlot,
        note: formData.note.trim() || undefined,
        status: 'pending',
        createdBy: currentUser?.id,
      });

      setIsSubmitting(false);
      setShowSuccessModal(true);
    }, 600);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5 max-w-5xl mx-auto"
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={goBack}
        >
          返回
        </Button>
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-space-500 mb-1">
            BUYER · APPOINTMENT
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            看机预约
          </h1>
        </div>
      </div>

      {!equipment ? (
        <Card>
          <CardBody>
            <div className="py-16 flex flex-col items-center justify-center text-space-500">
              <AlertCircle className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-base mb-2">设备不存在</p>
              <Button variant="ghost" onClick={goBack} size="sm">
                返回设备列表
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:col-span-2"
          >
            <Card className="sticky top-6">
              <div className="relative">
                <div
                  className="aspect-[4/3] relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(160deg, #1e2532 0%, #151a24 45%, #0e1218 100%)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      className="w-28 h-28 text-brass-400/40"
                    >
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 35%, rgba(224,185,110,0.1) 0%, transparent 55%)',
                    }}
                  />

                  <div className="absolute top-3 left-3">
                    {equipment.defectGrade && (
                      <GradeBadge grade={equipment.defectGrade} showLabel />
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <StatusTag status={equipment.status} />
                  </div>
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: BRASS_GRADIENT }}
                />
              </div>

              <CardBody>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-space-100">
                    {equipment.brand} {equipment.model}
                  </h2>
                  <p className="text-[11px] font-mono text-space-500 mt-1">
                    SN: {equipment.serialNumber}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <InfoItem label="设备类型" value={
                    equipment.type === 'body' ? '机身' :
                    equipment.type === 'lens' ? '镜头' : '套机'
                  } />
                  <InfoItem label="成色等级" value={equipment.defectGrade || '未评级'} highlight />
                </div>

                <div className="p-4 rounded-lg bg-gradient-to-br from-brass-400/8 to-transparent border border-brass-500/15">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[11px] text-space-400 mb-1">当前售价</div>
                      <div
                        className="font-mono text-2xl font-bold tracking-tight"
                        style={{
                          background: BRASS_GRADIENT,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {formatPrice(equipment.currentPrice)}
                      </div>
                    </div>
                    {equipment.basePrice !== equipment.currentPrice && (
                      <div className="text-right">
                        <div className="text-[10px] text-space-500 mb-0.5">原价</div>
                        <div className="font-mono text-xs text-space-500 line-through">
                          {formatPrice(equipment.basePrice)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-space-700/40">
                  <div className="text-[11px] text-space-500 mb-2">
                    配件清单
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {equipment.accessories.length > 0 ? (
                      equipment.accessories.map((acc, i) => (
                        <Badge key={i} variant="neutral">
                          {acc}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-space-500">—</span>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card>
              <CardHeader
                title="预约信息"
                subtitle="请填写以下信息，店员将尽快与您联系确认"
              />
              <form onSubmit={handleSubmit}>
                <CardBody>
                  <div className="space-y-5">
                    <Stepper />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="姓名"
                        placeholder="请输入您的姓名"
                        value={formData.buyerName}
                        onChange={(e) => updateField('buyerName', e.target.value)}
                        leftIcon={<User className="w-4 h-4" />}
                        error={errors.buyerName}
                        required
                      />
                      <Input
                        label="手机号"
                        placeholder="请输入11位手机号"
                        type="tel"
                        maxLength={11}
                        value={formData.buyerPhone}
                        onChange={(e) =>
                          updateField('buyerPhone', e.target.value.replace(/\D/g, ''))
                        }
                        leftIcon={<Phone className="w-4 h-4" />}
                        error={errors.buyerPhone}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="看机日期"
                        type="date"
                        min={today}
                        value={formData.appointmentDate}
                        onChange={(e) => updateField('appointmentDate', e.target.value)}
                        leftIcon={<CalendarClock className="w-4 h-4" />}
                        error={errors.appointmentDate}
                        required
                      />
                      <Select
                        label="看机时段"
                        placeholder="请选择时段"
                        value={formData.appointmentTimeSlot}
                        onChange={(v) => updateField('appointmentTimeSlot', v)}
                        options={TIME_SLOT_OPTIONS}
                        error={errors.appointmentTimeSlot}
                        required
                      />
                    </div>

                    <div>
                      <label className="label-field flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-space-500" />
                        备注信息
                        <span className="text-[10px] text-space-500 font-normal">(选填)</span>
                      </label>
                      <div className="relative">
                        <textarea
                          placeholder="如有特殊需求请在此备注，例如：需要测试视频功能、希望搭配某镜头试拍等..."
                          value={formData.note}
                          onChange={(e) => updateField('note', e.target.value)}
                          rows={4}
                          className={cn(
                            'w-full input-field resize-none',
                            'bg-space-800/60 border border-space-600/50',
                            'focus:border-brass-500/50 focus:ring-2 focus:ring-brass-500/10',
                            'rounded-md px-3.5 py-2.5 text-sm text-space-100',
                            'placeholder:text-space-500',
                            'transition-all duration-200 outline-none'
                          )}
                        />
                        <div className="absolute bottom-2 right-3 text-[10px] font-mono text-space-600">
                          {formData.note.length}/200
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-md bg-signal-blue/5 border border-signal-blue/15">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-signal-blue flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-space-300 space-y-1">
                          <p className="font-medium text-signal-blue/90">
                            预约须知
                          </p>
                          <p>
                            • 提交后店员将在30分钟内电话确认，请保持手机畅通
                          </p>
                          <p>
                            • 看机请携带有效身份证件，到店后由店员陪同完成验机
                          </p>
                          <p>
                            • 如需取消或改期，请提前2小时联系店员
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
                <CardFooter>
                  <div className="flex items-center justify-between w-full">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goBack}
                    >
                      取消
                    </Button>
                    <Button
                      type="submit"
                      loading={isSubmitting}
                      icon={<Send className="w-4 h-4" />}
                      iconPosition="right"
                    >
                      提交预约
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        </div>
      )}

      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        closeOnOverlay={false}
        closeOnEsc={false}
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={() => navigate('/buyer/showroom')}
            >
              返回展厅
            </Button>
            <Button
              onClick={() => setShowSuccessModal(false)}
            >
              我知道了
            </Button>
          </div>
        }
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="py-6 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.05) 100%)',
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
            <CheckCircle2 className="w-9 h-9 text-signal-green" strokeWidth={2} />
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-lg font-bold text-space-100 mb-2"
          >
            预约已提交
          </motion.h3>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-sm text-space-400 mb-5"
          >
            店员将尽快与您联系确认
          </motion.p>

          {equipment && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="p-3.5 rounded-md bg-space-800/60 border border-space-700/50 text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                {equipment.defectGrade && (
                  <GradeBadge grade={equipment.defectGrade} size="sm" />
                )}
                <span className="text-sm font-medium text-space-100">
                  {equipment.brand} {equipment.model}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <AppointmentDetailRow
                  icon={<CalendarClock className="w-3.5 h-3.5" />}
                  label="看机日期"
                  value={formData.appointmentDate}
                />
                <AppointmentDetailRow
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="看机时段"
                  value={
                    TIME_SLOT_OPTIONS.find((t) => t.value === formData.appointmentTimeSlot)?.label ||
                    formData.appointmentTimeSlot
                  }
                />
                <AppointmentDetailRow
                  icon={<User className="w-3.5 h-3.5" />}
                  label="联系电话"
                  value={formData.buyerPhone}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </Modal>
    </motion.div>
  );
}

function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="p-2.5 rounded-md bg-space-800/50 border border-space-700/40">
      <div className="text-[10px] text-space-500 mb-1">{label}</div>
      <div
        className={cn(
          'text-xs font-medium',
          highlight ? 'text-brass-300' : 'text-space-200'
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Stepper() {
  const steps = [
    { label: '选择设备', done: true },
    { label: '填写信息', done: false, active: true },
    { label: '等待确认', done: false },
  ];

  return (
    <div className="flex items-center justify-between mb-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold',
                step.done
                  ? 'bg-signal-green/15 text-signal-green border border-signal-green/30'
                  : step.active
                  ? 'border-2 text-brass-200'
                  : 'bg-space-800 text-space-500 border border-space-700'
              )}
              style={step.active ? { borderColor: '#c9a96e', background: 'rgba(201,169,110,0.1)' } : {}}
            >
              {step.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                step.active ? 'text-brass-200' : step.done ? 'text-space-300' : 'text-space-500'
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'flex-1 mx-2 h-[2px] rounded-full',
                step.done ? 'bg-signal-green/50' : 'bg-space-700/60'
              )}
            >
              {step.done && (
                <ChevronRight className="w-3 h-3 text-signal-green/70 mx-auto -mt-1.5" />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AppointmentDetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-space-500 flex-shrink-0">{icon}</span>
      <span className="text-space-500 flex-shrink-0">{label}：</span>
      <span className="text-space-200 truncate">{value}</span>
    </div>
  );
}
