import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Dog,
  User,
  Utensils,
  Pill,
  TreePine,
  MessageSquare,
} from 'lucide-react';
import { useBoardingStore } from '@/store/useBoardingStore';
import WarningBanner from '@/components/WarningBanner';
import type {
  PetBoarding,
  FeedingPlan,
  MedicationPlan,
  WalkPlan,
  PetType,
  Warning,
} from '@/types';
import { PET_TYPE_LABELS } from '@/types';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const emptyFeedingPlan = (): FeedingPlan => ({
  id: uid(),
  boardingId: '',
  foodType: '',
  portion: '',
  timeSlots: ['08:00'],
  notes: '',
});

const emptyMedicationPlan = (): MedicationPlan => ({
  id: uid(),
  boardingId: '',
  medicineName: '',
  dosage: '',
  unit: '',
  frequency: '每日1次',
  timeSlots: ['08:00'],
  notes: '',
});

const emptyWalkPlan = (): WalkPlan => ({
  id: uid(),
  boardingId: '',
  timeSlot: '09:00',
  durationMinutes: 30,
  requirements: '',
});

const today = () => new Date().toISOString().slice(0, 10);

export default function Register() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useBoardingStore();

  const existingBoarding = id ? store.boardings.find((b) => b.id === id) : null;

  const [pet, setPet] = useState<PetBoarding>(
    existingBoarding || {
      id: uid(),
      petName: '',
      petType: 'dog' as PetType,
      breed: '',
      age: 0,
      weight: 0,
      features: '',
      ownerName: '',
      ownerPhone: '',
      cageNumber: '',
      allergicFood: '',
      checkInDate: today(),
      expectedPickupDate: '',
      actualPickupDate: '',
      specialNotes: '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const existingFeedings = id
    ? store.feedingPlans.filter((p) => p.boardingId === id)
    : [];
  const existingMeds = id
    ? store.medicationPlans.filter((p) => p.boardingId === id)
    : [];
  const existingWalks = id
    ? store.walkPlans.filter((p) => p.boardingId === id)
    : [];

  const [feedings, setFeedings] = useState<FeedingPlan[]>(
    existingFeedings.length > 0 ? existingFeedings : [emptyFeedingPlan()]
  );
  const [meds, setMeds] = useState<MedicationPlan[]>(
    existingMeds.length > 0 ? existingMeds : []
  );
  const [walks, setWalks] = useState<WalkPlan[]>(
    existingWalks.length > 0 ? existingWalks : []
  );

  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    pet: true,
    owner: true,
    feeding: true,
    med: true,
    walk: true,
    notes: true,
  });

  const toggle = (key: string) =>
    setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const updatePet = useCallback(
    <K extends keyof PetBoarding>(key: K, value: PetBoarding[K]) => {
      setPet((p) => {
        const next = { ...p, [key]: value };
        const newWarnings = store.validateBoarding(next, id);
        setWarnings(newWarnings);
        return next;
      });
    },
    [store, id]
  );

  const validateMeds = useCallback(
    (currentMeds: MedicationPlan[]) => {
      const newWarnings = [...warnings.filter((w) => w.type !== 'missing_unit')];
      for (const med of currentMeds) {
        if (med.dosage && !med.unit) {
          newWarnings.push({
            type: 'missing_unit',
            message: `药品「${med.medicineName}」剂量 ${med.dosage} 缺少单位`,
            severity: 'error',
            relatedIds: [med.id],
          });
        }
      }
      setWarnings(newWarnings);
    },
    [warnings]
  );

  const handleSave = () => {
    const allWarnings = store.validateBoarding(pet, id);
    const medWarnings = meds
      .filter((m) => m.dosage && !m.unit)
      .map(
        (m): Warning => ({
          type: 'missing_unit',
          message: `药品「${m.medicineName}」剂量 ${m.dosage} 缺少单位`,
          severity: 'error',
          relatedIds: [m.id],
        })
      );
    const finalWarnings = [...allWarnings, ...medWarnings];
    setWarnings(finalWarnings);

    const hasErrors = finalWarnings.some((w) => w.severity === 'error');
    if (hasErrors) return;

    if (id) {
      store.updateBoarding(id, pet);
      store.feedingPlans
        .filter((p) => p.boardingId === id)
        .forEach((p) => store.removeFeedingPlan(p.id));
      store.medicationPlans
        .filter((p) => p.boardingId === id)
        .forEach((p) => store.removeMedicationPlan(p.id));
      store.walkPlans
        .filter((p) => p.boardingId === id)
        .forEach((p) => store.removeWalkPlan(p.id));
      store.removeTasksByBoardingId(id);
    } else {
      store.addBoarding(pet);
    }

    const boardingId = id || pet.id;
    feedings.forEach((f) => store.addFeedingPlan({ ...f, boardingId }));
    meds.forEach((m) => store.addMedicationPlan({ ...m, boardingId }));
    walks.forEach((w) => store.addWalkPlan({ ...w, boardingId }));

    feedings.forEach((f) => {
      f.timeSlots.forEach((ts) => {
        store.addTask({
          id: uid(),
          boardingId,
          taskType: 'feeding',
          title: `喂食 - ${pet.petName}`,
          description: `${f.foodType} ${f.portion}${f.notes ? ` (${f.notes})` : ''}`,
          scheduledTime: `${today()}T${ts}`,
          completedTime: '',
          status: 'pending',
          cageNumber: pet.cageNumber,
          petName: pet.petName,
          isAbnormal: false,
          abnormalReason: '',
        });
      });
    });

    meds.forEach((m) => {
      m.timeSlots.forEach((ts) => {
        store.addTask({
          id: uid(),
          boardingId,
          taskType: 'medication',
          title: `喂药 - ${pet.petName}`,
          description: `${m.medicineName} ${m.dosage}${m.unit} ${m.frequency}${m.notes ? ` (${m.notes})` : ''}`,
          scheduledTime: `${today()}T${ts}`,
          completedTime: '',
          status: 'pending',
          cageNumber: pet.cageNumber,
          petName: pet.petName,
          isAbnormal: false,
          abnormalReason: '',
        });
      });
    });

    walks.forEach((w) => {
      store.addTask({
        id: uid(),
        boardingId,
        taskType: 'walk',
        title: `遛放 - ${pet.petName}`,
        description: `${w.durationMinutes}分钟${w.requirements ? ` - ${w.requirements}` : ''}`,
        scheduledTime: `${today()}T${w.timeSlot}`,
        completedTime: '',
        status: 'pending',
        cageNumber: pet.cageNumber,
        petName: pet.petName,
        isAbnormal: false,
        abnormalReason: '',
      });
    });

    navigate('/board');
  };

  const dismissWarning = (index: number) => {
    setWarnings((p) => p.filter((_, i) => i !== index));
  };

  const SectionHeader = ({
    sectionKey,
    icon: Icon,
    title,
  }: {
    sectionKey: string;
    icon: React.ElementType;
    title: string;
  }) => (
    <button
      type="button"
      onClick={() => toggle(sectionKey)}
      className="w-full flex items-center gap-2 py-2 text-warm-700 font-semibold"
    >
      <Icon className="w-4 h-4 text-warm-500" />
      <span className="flex-1 text-left">{title}</span>
      {expanded[sectionKey] ? (
        <ChevronUp className="w-4 h-4 text-warm-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-warm-400" />
      )}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-bold text-warm-800">
          {id ? '编辑寄养记录' : '新寄养登记'}
        </h2>
        <button onClick={handleSave} className="btn-mint flex items-center gap-2">
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>

      <WarningBanner warnings={warnings} onDismiss={dismissWarning} />

      <div className="space-y-4">
        {/* Pet Info */}
        <div className="card">
          <SectionHeader sectionKey="pet" icon={Dog} title="宠物信息" />
          {expanded.pet && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="label-text">宠物名称 *</label>
                <input
                  className="input-field"
                  value={pet.petName}
                  onChange={(e) => updatePet('petName', e.target.value)}
                  placeholder="例如：旺财"
                />
              </div>
              <div>
                <label className="label-text">宠物类型</label>
                <select
                  className="input-field"
                  value={pet.petType}
                  onChange={(e) => updatePet('petType', e.target.value as PetType)}
                >
                  {Object.entries(PET_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">品种</label>
                <input
                  className="input-field"
                  value={pet.breed}
                  onChange={(e) => updatePet('breed', e.target.value)}
                  placeholder="例如：金毛"
                />
              </div>
              <div>
                <label className="label-text">年龄（岁）</label>
                <input
                  className="input-field"
                  type="number"
                  min={0}
                  value={pet.age || ''}
                  onChange={(e) => updatePet('age', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label-text">体重（kg）</label>
                <input
                  className="input-field"
                  type="number"
                  min={0}
                  step={0.1}
                  value={pet.weight || ''}
                  onChange={(e) => updatePet('weight', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label-text">笼位编号 *</label>
                <input
                  className="input-field"
                  value={pet.cageNumber}
                  onChange={(e) => updatePet('cageNumber', e.target.value)}
                  placeholder="例如：A-01"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-text">外貌特征</label>
                <input
                  className="input-field"
                  value={pet.features}
                  onChange={(e) => updatePet('features', e.target.value)}
                  placeholder="毛色、体型、特殊标记等"
                />
              </div>
            </div>
          )}
        </div>

        {/* Owner Info */}
        <div className="card">
          <SectionHeader sectionKey="owner" icon={User} title="主人信息" />
          {expanded.owner && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="label-text">主人姓名 *</label>
                <input
                  className="input-field"
                  value={pet.ownerName}
                  onChange={(e) => updatePet('ownerName', e.target.value)}
                  placeholder="例如：张先生"
                />
              </div>
              <div>
                <label className="label-text">联系电话 *</label>
                <input
                  className="input-field"
                  value={pet.ownerPhone}
                  onChange={(e) => updatePet('ownerPhone', e.target.value)}
                  placeholder="例如：13800138000"
                />
              </div>
              <div>
                <label className="label-text">入住日期</label>
                <input
                  className="input-field"
                  type="date"
                  value={pet.checkInDate}
                  onChange={(e) => updatePet('checkInDate', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">预计接回日期 *</label>
                <input
                  className="input-field"
                  type="date"
                  value={pet.expectedPickupDate}
                  onChange={(e) => updatePet('expectedPickupDate', e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">实际接回日期</label>
                <input
                  className="input-field"
                  type="date"
                  value={pet.actualPickupDate}
                  onChange={(e) => updatePet('actualPickupDate', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Feeding Plans */}
        <div className="card">
          <SectionHeader sectionKey="feeding" icon={Utensils} title="喂食计划" />
          {expanded.feeding && (
            <div className="space-y-4 mt-2">
              {feedings.map((f, fi) => (
                <div
                  key={f.id}
                  className="p-3 bg-warm-50 rounded-lg border border-warm-100"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label-text">食物类型</label>
                      <input
                        className="input-field"
                        value={f.foodType}
                        onChange={(e) => {
                          const next = [...feedings];
                          next[fi] = { ...f, foodType: e.target.value };
                          setFeedings(next);
                        }}
                        placeholder="例如：皇家狗粮"
                      />
                    </div>
                    <div>
                      <label className="label-text">份量</label>
                      <input
                        className="input-field"
                        value={f.portion}
                        onChange={(e) => {
                          const next = [...feedings];
                          next[fi] = { ...f, portion: e.target.value };
                          setFeedings(next);
                        }}
                        placeholder="例如：200g"
                      />
                    </div>
                    <div>
                      <label className="label-text">喂食时间</label>
                      <div className="flex flex-wrap gap-2">
                        {f.timeSlots.map((ts, tsi) => (
                          <input
                            key={tsi}
                            className="input-field w-24"
                            type="time"
                            value={ts}
                            onChange={(e) => {
                              const next = [...feedings];
                              const slots = [...f.timeSlots];
                              slots[tsi] = e.target.value;
                              next[fi] = { ...f, timeSlots: slots };
                              setFeedings(next);
                            }}
                          />
                        ))}
                        <button
                          type="button"
                          className="text-mint-400 hover:text-mint-500 text-sm"
                          onClick={() => {
                            const next = [...feedings];
                            next[fi] = {
                              ...f,
                              timeSlots: [...f.timeSlots, '12:00'],
                            };
                            setFeedings(next);
                          }}
                        >
                          + 时间
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label-text">过敏食物</label>
                      <input
                        className="input-field border-danger-200 focus:ring-danger-400"
                        value={pet.allergicFood}
                        onChange={(e) => updatePet('allergicFood', e.target.value)}
                        placeholder="例如：巧克力、葡萄"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label-text">备注</label>
                      <input
                        className="input-field"
                        value={f.notes}
                        onChange={(e) => {
                          const next = [...feedings];
                          next[fi] = { ...f, notes: e.target.value };
                          setFeedings(next);
                        }}
                        placeholder="特殊喂食要求"
                      />
                    </div>
                  </div>
                  {feedings.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFeedings((p) => p.filter((_, i) => i !== fi))
                      }
                      className="mt-2 text-danger-500 text-xs hover:underline"
                    >
                      删除此项
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFeedings((p) => [...p, emptyFeedingPlan()])}
                className="btn-outline text-sm flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                添加喂食计划
              </button>
            </div>
          )}
        </div>

        {/* Medication Plans */}
        <div className="card">
          <SectionHeader sectionKey="med" icon={Pill} title="喂药计划" />
          {expanded.med && (
            <div className="space-y-4 mt-2">
              {meds.map((m, mi) => (
                <div
                  key={m.id}
                  className="p-3 bg-warm-50 rounded-lg border border-warm-100"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label-text">药品名称 *</label>
                      <input
                        className="input-field"
                        value={m.medicineName}
                        onChange={(e) => {
                          const next = [...meds];
                          next[mi] = { ...m, medicineName: e.target.value };
                          setMeds(next);
                          validateMeds(next);
                        }}
                        placeholder="例如：驱虫药"
                      />
                    </div>
                    <div>
                      <label className="label-text">剂量 *</label>
                      <input
                        className={`input-field ${m.dosage && !m.unit ? 'border-danger-400 focus:ring-danger-400' : ''}`}
                        value={m.dosage}
                        onChange={(e) => {
                          const next = [...meds];
                          next[mi] = { ...m, dosage: e.target.value };
                          setMeds(next);
                          validateMeds(next);
                        }}
                        placeholder="例如：1"
                      />
                    </div>
                    <div>
                      <label className="label-text">单位 *</label>
                      <input
                        className={`input-field ${m.dosage && !m.unit ? 'border-danger-400 focus:ring-danger-400' : ''}`}
                        value={m.unit}
                        onChange={(e) => {
                          const next = [...meds];
                          next[mi] = { ...m, unit: e.target.value };
                          setMeds(next);
                          validateMeds(next);
                        }}
                        placeholder="例如：片、ml、颗"
                      />
                    </div>
                    <div>
                      <label className="label-text">频次</label>
                      <select
                        className="input-field"
                        value={m.frequency}
                        onChange={(e) => {
                          const next = [...meds];
                          next[mi] = { ...m, frequency: e.target.value };
                          setMeds(next);
                        }}
                      >
                        <option value="每日1次">每日1次</option>
                        <option value="每日2次">每日2次</option>
                        <option value="每日3次">每日3次</option>
                        <option value="隔日1次">隔日1次</option>
                        <option value="按需">按需</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-text">喂药时间</label>
                      <div className="flex flex-wrap gap-2">
                        {m.timeSlots.map((ts, tsi) => (
                          <input
                            key={tsi}
                            className="input-field w-24"
                            type="time"
                            value={ts}
                            onChange={(e) => {
                              const next = [...meds];
                              const slots = [...m.timeSlots];
                              slots[tsi] = e.target.value;
                              next[mi] = { ...m, timeSlots: slots };
                              setMeds(next);
                            }}
                          />
                        ))}
                        <button
                          type="button"
                          className="text-mint-400 hover:text-mint-500 text-sm"
                          onClick={() => {
                            const next = [...meds];
                            next[mi] = {
                              ...m,
                              timeSlots: [...m.timeSlots, '12:00'],
                            };
                            setMeds(next);
                          }}
                        >
                          + 时间
                        </button>
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label-text">备注</label>
                      <input
                        className="input-field"
                        value={m.notes}
                        onChange={(e) => {
                          const next = [...meds];
                          next[mi] = { ...m, notes: e.target.value };
                          setMeds(next);
                        }}
                        placeholder="特殊喂药要求"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMeds((p) => p.filter((_, i) => i !== mi));
                      validateMeds(meds.filter((_, i) => i !== mi));
                    }}
                    className="mt-2 text-danger-500 text-xs hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除此项
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMeds((p) => [...p, emptyMedicationPlan()])}
                className="btn-outline text-sm flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                添加喂药计划
              </button>
            </div>
          )}
        </div>

        {/* Walk Plans */}
        <div className="card">
          <SectionHeader sectionKey="walk" icon={TreePine} title="遛放安排" />
          {expanded.walk && (
            <div className="space-y-4 mt-2">
              {walks.map((w, wi) => (
                <div
                  key={w.id}
                  className="p-3 bg-warm-50 rounded-lg border border-warm-100"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label-text">遛放时间</label>
                      <input
                        className="input-field"
                        type="time"
                        value={w.timeSlot}
                        onChange={(e) => {
                          const next = [...walks];
                          next[wi] = { ...w, timeSlot: e.target.value };
                          setWalks(next);
                        }}
                      />
                    </div>
                    <div>
                      <label className="label-text">时长（分钟）</label>
                      <input
                        className="input-field"
                        type="number"
                        min={5}
                        step={5}
                        value={w.durationMinutes || ''}
                        onChange={(e) => {
                          const next = [...walks];
                          next[wi] = {
                            ...w,
                            durationMinutes: Number(e.target.value),
                          };
                          setWalks(next);
                        }}
                      />
                    </div>
                    <div>
                      <label className="label-text">特殊要求</label>
                      <input
                        className="input-field"
                        value={w.requirements}
                        onChange={(e) => {
                          const next = [...walks];
                          next[wi] = { ...w, requirements: e.target.value };
                          setWalks(next);
                        }}
                        placeholder="例如：不可接触其他犬只"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWalks((p) => p.filter((_, i) => i !== wi))}
                    className="mt-2 text-danger-500 text-xs hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除此项
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setWalks((p) => [...p, emptyWalkPlan()])}
                className="btn-outline text-sm flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                添加遛放安排
              </button>
            </div>
          )}
        </div>

        {/* Special Notes */}
        <div className="card">
          <SectionHeader sectionKey="notes" icon={MessageSquare} title="特殊备注" />
          {expanded.notes && (
            <div className="mt-2">
              <textarea
                className="input-field min-h-[100px]"
                value={pet.specialNotes}
                onChange={(e) => updatePet('specialNotes', e.target.value)}
                placeholder="记录其他需要注意的事项，如宠物性格特点、害怕的东西、特殊护理要求等..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
