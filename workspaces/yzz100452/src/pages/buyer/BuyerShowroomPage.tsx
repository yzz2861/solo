import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Search,
  Filter,
  Tag,
  Eye,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { StatusTag } from '@/components/ui/StatusTag';
import { Badge } from '@/components/ui/Badge';
import { useCameraStore } from '@/store/cameraStore';
import { formatPrice } from '@/utils/format';
import { cn } from '@/utils/cn';

const BRASS_GRADIENT = 'linear-gradient(135deg, #e0b96e 0%, #c9a96e 50%, #93703d 100%)';

export default function BuyerShowroomPage() {
  const navigate = useNavigate();
  const { equipments } = useCameraStore();

  const [brandFilter, setBrandFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const brandOptions = useMemo(() => {
    const unique = new Set<string>();
    equipments.forEach((e) => unique.add(e.brand));
    return Array.from(unique)
      .sort()
      .map((b) => ({ value: b, label: b }));
  }, [equipments]);

  const displayEquipments = useMemo(() => {
    return equipments
      .filter((e) => {
        if (e.status !== 'available' && e.status !== 'sold') return false;
        if (brandFilter && e.brand !== brandFilter) return false;
        if (gradeFilter && e.defectGrade !== gradeFilter) return false;
        if (minPrice && e.currentPrice < parseFloat(minPrice)) return false;
        if (maxPrice && e.currentPrice > parseFloat(maxPrice)) return false;
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase();
          const matchBrand = e.brand.toLowerCase().includes(keyword);
          const matchModel = e.model.toLowerCase().includes(keyword);
          const matchSerial = e.serialNumber.toLowerCase().includes(keyword);
          if (!matchBrand && !matchModel && !matchSerial) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'sold' && b.status !== 'sold') return 1;
        if (b.status === 'sold' && a.status !== 'sold') return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [equipments, brandFilter, gradeFilter, minPrice, maxPrice, searchKeyword]);

  const availableCount = displayEquipments.filter((e) => e.status === 'available').length;
  const soldCount = displayEquipments.filter((e) => e.status === 'sold').length;

  const handleAppointment = (equipmentId: string) => {
    navigate(`/buyer/appointment/${equipmentId}`);
  };

  const resetFilters = () => {
    setBrandFilter('');
    setMinPrice('');
    setMaxPrice('');
    setGradeFilter('');
    setSearchKeyword('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-space-500 mb-1.5">
            BUYER · SHOWROOM
          </div>
          <h1 className="text-2xl font-bold text-space-100 tracking-wide">
            设备展厅
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-space-400 px-3 py-1.5 rounded-md bg-space-800/60 border border-space-700">
          <Tag className="w-3.5 h-3.5 text-brass-400/70" />
          {availableCount} 台在售 · {soldCount} 台已售
        </div>
      </div>

      <Card>
        <CardHeader
          title="筛选条件"
          action={
            <Button variant="ghost" size="sm" onClick={resetFilters} icon={<X className="w-4 h-4" />}>
              重置筛选
            </Button>
        }
        />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <Input
                label="搜索设备"
                placeholder="品牌/型号/序列号"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              label="品牌"
              placeholder="全部品牌"
              value={brandFilter}
              onChange={setBrandFilter}
              options={brandOptions}
            />
            <Input
              label="最低价格"
              type="number"
              placeholder="¥"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <Input
              label="最高价格"
              type="number"
              placeholder="¥"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
            <Select
              label="成色等级"
              placeholder="全部等级"
              value={gradeFilter}
              onChange={setGradeFilter}
              options={[
                { value: 'S', label: 'S 全新级' },
                { value: 'A', label: 'A 优品级' },
                { value: 'B', label: 'B 良品级' },
                { value: 'C', label: 'C 使用级' },
                { value: 'D', label: 'D 瑕疵级' },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {displayEquipments.length === 0 ? (
        <Card>
          <CardBody>
            <div className="py-16 flex flex-col items-center justify-center text-space-500">
              <AlertCircle className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-base mb-2">暂无符合条件的设备</p>
              <p className="text-xs">请调整筛选条件</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayEquipments.map((eq, idx) => {
            const isSold = eq.status === 'sold';

            return (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                layout
              >
                <Card
                  className={cn(
                    'h-full group relative overflow-hidden',
                    isSold && 'opacity-60'
                  )}
                >
                  <div className="relative">
                    <div
                      className={cn(
                        'aspect-square relative overflow-hidden',
                        isSold && 'grayscale'
                      )}
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
                          className={cn(
                            'w-24 h-24 transition-all duration-500',
                            'text-brass-400/35 group-hover:text-brass-400/55 group-hover:scale-110'
                          )}
                        >
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      </div>
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle at 50% 40%, rgba(224,185,110,0.1) 0%, transparent 55%)',
                        }}
                      />

                      {isSold && (
                        <div className="absolute inset-0 bg-space-950/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <Badge
                            variant="neutral"
                            className="px-4 py-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            已售出
                          </Badge>
                        </div>
                      )}

                      <div className="absolute top-3 left-3 z-20">
                        {eq.defectGrade && (
                          <GradeBadge grade={eq.defectGrade} />
                        )}
                      </div>

                      <div className="absolute top-3 right-3 z-20">
                        <StatusTag status={eq.status} />
                      </div>
                    </div>

                    <div
                      className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 z-20"
                      style={{ background: BRASS_GRADIENT }}
                    />
                  </div>

                  <CardBody>
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-space-100 truncate group-hover:text-brass-200 transition-colors">
                        {eq.brand} {eq.model}
                      </h3>
                      <p className="text-[11px] font-mono text-space-500 mt-0.5 truncate">
                        {eq.serialNumber}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mb-4 pt-2">
                      <div>
                        <div className="text-[10px] text-space-500 mb-0.5">售价</div>
                        <div
                          className="font-mono text-xl font-bold"
                          style={{
                            background: BRASS_GRADIENT,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {formatPrice(eq.currentPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-space-500 mb-0.5">原价</div>
                        <div className="font-mono text-xs text-space-500 line-through">
                          {formatPrice(eq.basePrice)}
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      variant={isSold ? 'ghost' : 'primary'}
                      size="sm"
                      icon={isSold ? <Eye className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
                      disabled={isSold}
                      onClick={() => handleAppointment(eq.id)}
                    >
                      {isSold ? '查看详情' : '预约看机'}
                    </Button>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
