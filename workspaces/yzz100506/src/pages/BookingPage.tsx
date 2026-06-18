import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import {
  ChevronLeft, Save, Dog, Scissors, Truck, AlertTriangle,
  Clock, Plus
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import {
  SERVICE_CATALOG, SIZE_LABELS, PERSONALITY_LABELS,
  type PetSize, type PetPersonality, type ServiceType
} from '@/types'
import {
  calculateTotalDuration, addMinutesToTime, formatDuration,
  getServiceDuration
} from '@/utils/duration'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const SERVICE_ICONS: Record<ServiceType, typeof Scissors> = {
  wash: Dog,
  shave: Scissors,
  nail: Scissors,
  pickup: Truck,
}

interface FormAlert {
  severity: 'high' | 'medium' | 'low'
  message: string
  details?: string
}

export default function BookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: editId } = useParams<{ id: string }>()
  const isEditing = !!(editId && editId !== 'new')

  const pets = useStore(s => s.pets)
  const groomers = useStore(s => s.groomers)
  const addPet = useStore(s => s.addPet)
  const addOwner = useStore(s => s.addOwner)
  const addAppointment = useStore(s => s.addAppointment)
  const updateAppointment = useStore(s => s.updateAppointment)
  const getPetById = useStore(s => s.getPetById)
  const getOwnerById = useStore(s => s.getOwnerById)
  const getConflicts = useStore(s => s.getConflicts)
  const appointments = useStore(s => s.appointments)

  const [selectedPetId, setSelectedPetId] = useState('')
  const [petName, setPetName] = useState('')
  const [petBreed, setPetBreed] = useState('')
  const [petSize, setPetSize] = useState<PetSize>('small')
  const [petWeight, setPetWeight] = useState(0)
  const [petVaccinated, setPetVaccinated] = useState(false)
  const [petPersonality, setPetPersonality] = useState<PetPersonality>('calm')
  const [petAllergyNote, setPetAllergyNote] = useState('')
  const [petBiteWarning, setPetBiteWarning] = useState(false)

  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')

  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([])
  const [selectedGroomerId, setSelectedGroomerId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')

  const [needsPickup, setNeedsPickup] = useState(false)
  const [pickupTime, setPickupTime] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')

  const [notes, setNotes] = useState('')

  useEffect(() => {
    const g = searchParams.get('groomerId')
    const d = searchParams.get('date')
    const t = searchParams.get('time')
    if (g) setSelectedGroomerId(g)
    if (d) setDate(d)
    if (t) setStartTime(t)
  }, [searchParams])

  useEffect(() => {
    if (!isEditing || !editId) return
    const apt = appointments.find(a => a.id === editId)
    if (!apt) return
    const pet = getPetById(apt.petId)
    const owner = apt.ownerId ? getOwnerById(apt.ownerId) : undefined

    setSelectedPetId(apt.petId)
    if (pet) {
      setPetSize(pet.size)
      setPetWeight(pet.weight)
      setPetVaccinated(pet.vaccinated)
      setPetPersonality(pet.personality)
      setPetAllergyNote(pet.allergyNote)
      setPetBiteWarning(pet.biteWarning)
    }
    if (owner) {
      setOwnerName(owner.name)
      setOwnerPhone(owner.phone)
      setOwnerAddress(owner.address)
    }
    setSelectedServices(apt.services.map(s => s.type))
    setSelectedGroomerId(apt.groomerId)
    setDate(apt.date)
    setStartTime(apt.startTime)
    setNeedsPickup(apt.needsPickup)
    setPickupTime(apt.pickupTime)
    setPickupAddress(apt.pickupAddress)
    setNotes(apt.notes)
  }, [isEditing, editId, appointments, getPetById, getOwnerById])

  const currentPet = selectedPetId && selectedPetId !== 'new' ? getPetById(selectedPetId) : null
  const currentOwner = currentPet ? getOwnerById(currentPet.ownerId) : null
  const effectivePetSize: PetSize = currentPet?.size ?? petSize

  const totalDuration = useMemo(
    () => calculateTotalDuration(selectedServices, effectivePetSize),
    [selectedServices, effectivePetSize]
  )

  const endTime = useMemo(
    () => totalDuration > 0 ? addMinutesToTime(startTime, totalDuration) : '',
    [startTime, totalDuration]
  )

  const totalPrice = useMemo(() => {
    let total = 0
    for (const svc of selectedServices) {
      const catalog = SERVICE_CATALOG.find(c => c.type === svc)
      if (catalog) total += catalog.price
    }
    return total
  }, [selectedServices])

  const alerts = useMemo<FormAlert[]>(() => {
    const result: FormAlert[] = []
    if (effectivePetSize === 'large' && totalDuration > 0 && totalDuration < 90) {
      result.push({
        severity: 'high',
        message: '大型犬服务时长不足，建议至少90分钟',
        details: `当前时长 ${totalDuration} 分钟`,
      })
    }
    if (selectedGroomerId && date && startTime && endTime && totalDuration > 0) {
      const conflicts = getConflicts(
        selectedGroomerId, date, startTime, endTime,
        isEditing ? editId : undefined
      )
      if (conflicts.length > 0) {
        result.push({
          severity: 'high',
          message: '造型师时间重叠',
          details: `与 ${conflicts.length} 个预约时间冲突`,
        })
      }
    }
    if (selectedPetId && !(currentPet?.vaccinated ?? petVaccinated)) {
      result.push({
        severity: 'medium',
        message: '宠物未接种疫苗，请注意安全',
      })
    }
    if (selectedPetId && (currentPet?.biteWarning ?? petBiteWarning)) {
      result.push({
        severity: 'high',
        message: '宠物有咬人记录，请做好防护',
      })
    }
    return result
  }, [effectivePetSize, totalDuration, selectedGroomerId, date, startTime, endTime,
    getConflicts, isEditing, editId, currentPet, petVaccinated, petBiteWarning, selectedPetId])

  function toggleService(type: ServiceType) {
    setSelectedServices(prev =>
      prev.includes(type) ? prev.filter(s => s !== type) : [...prev, type]
    )
  }

  function handlePickupToggle() {
    const next = !needsPickup
    setNeedsPickup(next)
    if (next && !pickupAddress) {
      const addr = currentOwner?.address ?? ownerAddress
      if (addr) setPickupAddress(addr)
    }
  }

  function handleSave() {
    if (!selectedPetId) return
    if (!selectedGroomerId) return
    if (!date) return
    if (!startTime) return
    if (selectedServices.length === 0) return

    let petId = selectedPetId
    let ownerId = ''

    if (selectedPetId === 'new') {
      if (!petName || !ownerName || !ownerPhone) return
      const newOwnerId = uid()
      const newPetId = uid()
      addOwner({ id: newOwnerId, name: ownerName, phone: ownerPhone, address: ownerAddress })
      addPet({
        id: newPetId, name: petName, breed: petBreed, size: petSize,
        weight: petWeight, vaccinated: petVaccinated, personality: petPersonality,
        allergyNote: petAllergyNote, biteWarning: petBiteWarning, ownerId: newOwnerId,
      })
      petId = newPetId
      ownerId = newOwnerId
    } else {
      const pet = getPetById(selectedPetId)
      ownerId = pet?.ownerId ?? ''
    }

    const services = selectedServices.map(type => ({
      id: uid(),
      appointmentId: '',
      type,
      duration: getServiceDuration(type, effectivePetSize),
      price: SERVICE_CATALOG.find(s => s.type === type)?.price ?? 0,
    }))

    const aptId = isEditing ? editId! : uid()
    const appointmentPayload = {
      petId,
      groomerId: selectedGroomerId,
      date,
      startTime,
      endTime,
      estimatedDuration: totalDuration,
      status: 'pending' as const,
      pickupTime,
      pickupAddress,
      needsPickup,
      notes,
      ownerId,
      createdAt: new Date().toISOString(),
      services: services.map(s => ({ ...s, appointmentId: aptId })),
      assistants: [] as string[],
    }

    if (isEditing) {
      updateAppointment(editId!, appointmentPayload)
    } else {
      addAppointment({ id: aptId, ...appointmentPayload })
    }

    navigate('/')
  }

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-paw-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-brand-700" />
        </button>
        <h1 className="text-xl font-semibold text-brand-800 font-serif">
          {isEditing ? '编辑预约' : '新建预约'}
        </h1>
      </div>

      <div className="flex flex-col gap-5">
        <SectionCard title="宠物信息" icon={<Dog className="w-4 h-4" />}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">选择宠物</label>
              <select
                className="select-field"
                value={selectedPetId}
                onChange={e => setSelectedPetId(e.target.value)}
              >
                <option value="">请选择...</option>
                <option value="new">+ 新增宠物</option>
                {pets.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.breed})</option>
                ))}
              </select>
            </div>

            {currentPet && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoField label="品种" value={currentPet.breed} />
                <InfoField label="体型" value={SIZE_LABELS[currentPet.size]} />
                <InfoField label="体重" value={`${currentPet.weight}kg`} />
                <InfoField label="性格" value={PERSONALITY_LABELS[currentPet.personality]} />
                {currentPet.allergyNote && <InfoField label="过敏" value={currentPet.allergyNote} />}
              </div>
            )}

            {selectedPetId === 'new' && (
              <div className="space-y-3 border-t border-paw-200 pt-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">名字 *</label>
                    <input className="input-field" value={petName} onChange={e => setPetName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">品种</label>
                    <input className="input-field" value={petBreed} onChange={e => setPetBreed(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">体型</label>
                    <div className="flex gap-2">
                      {(['small', 'medium', 'large'] as PetSize[]).map(s => (
                        <label
                          key={s}
                          className={`flex-1 text-center px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                            petSize === s
                              ? 'bg-brand-500 text-white border-brand-500'
                              : 'bg-white text-brand-700 border-paw-300 hover:bg-paw-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="petSize"
                            className="sr-only"
                            checked={petSize === s}
                            onChange={() => setPetSize(s)}
                          />
                          {SIZE_LABELS[s]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">体重 (kg)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={petWeight || ''}
                      onChange={e => setPetWeight(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">性格</label>
                    <select
                      className="select-field"
                      value={petPersonality}
                      onChange={e => setPetPersonality(e.target.value as PetPersonality)}
                    >
                      {Object.entries(PERSONALITY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">过敏备注</label>
                    <input
                      className="input-field"
                      value={petAllergyNote}
                      onChange={e => setPetAllergyNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-brand-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-paw-300 text-brand-500 focus:ring-brand-400"
                      checked={petVaccinated}
                      onChange={e => setPetVaccinated(e.target.checked)}
                    />
                    已接种疫苗
                  </label>
                  <label className="flex items-center gap-2 text-sm text-brand-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-paw-300 text-coral-500 focus:ring-coral-400"
                      checked={petBiteWarning}
                      onChange={e => setPetBiteWarning(e.target.checked)}
                    />
                    咬人警告
                  </label>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="主人信息" icon={<Plus className="w-4 h-4" />}>
          {currentOwner ? (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <InfoField label="姓名" value={currentOwner.name} />
              <InfoField label="电话" value={currentOwner.phone} />
              <InfoField label="地址" value={currentOwner.address} />
            </div>
          ) : selectedPetId === 'new' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">姓名 *</label>
                  <input className="input-field" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">电话 *</label>
                  <input className="input-field" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">地址</label>
                <input className="input-field" value={ownerAddress} onChange={e => setOwnerAddress(e.target.value)} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-paw-400">请先选择宠物</p>
          )}
        </SectionCard>

        <SectionCard title="服务选择" icon={<Scissors className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_CATALOG.map(item => {
              const Icon = SERVICE_ICONS[item.type]
              const duration = getServiceDuration(item.type, effectivePetSize)
              const checked = selectedServices.includes(item.type)
              return (
                <label
                  key={item.type}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-brand-50 border-brand-400'
                      : 'bg-white border-paw-200 hover:bg-paw-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-paw-300 text-brand-500 focus:ring-brand-400"
                    checked={checked}
                    onChange={() => toggleService(item.type)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4 text-brand-600" />
                      <span className="text-sm font-medium text-brand-800">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-brand-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {duration}分钟
                      </span>
                      <span>&yen;{item.price}</span>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
          {totalDuration > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-brand-50 border border-brand-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-700">预计总时长</span>
                <span className="text-lg font-bold text-brand-600">{formatDuration(totalDuration)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-medium text-brand-700">预计总价</span>
                <span className="text-lg font-bold text-brand-600">&yen;{totalPrice}</span>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="造型师与时间" icon={<Clock className="w-4 h-4" />}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1">造型师</label>
              <div className="grid grid-cols-3 gap-2">
                {groomers.map(g => (
                  <label
                    key={g.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedGroomerId === g.id
                        ? 'bg-brand-50 border-brand-400'
                        : 'bg-white border-paw-200 hover:bg-paw-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="groomer"
                      className="sr-only"
                      checked={selectedGroomerId === g.id}
                      onChange={() => setSelectedGroomerId(g.id)}
                    />
                    <span className="text-xl">{g.avatar}</span>
                    <span className="text-sm font-medium text-brand-700">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">日期</label>
                <input
                  type="date"
                  className="input-field"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">开始时间</label>
                <input
                  type="time"
                  className="input-field"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">结束时间</label>
                <input
                  type="time"
                  className="input-field bg-paw-50"
                  value={endTime}
                  readOnly
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {alerts.length > 0 && (
          <div className="flex flex-col gap-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  alert.severity === 'high'
                    ? 'bg-coral-50 border-coral-400 text-coral-600'
                    : alert.severity === 'medium'
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-yellow-50 border-yellow-400 text-yellow-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.message}</p>
                  {alert.details && (
                    <p className="text-xs mt-0.5 opacity-80">{alert.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <SectionCard title="接送服务" icon={<Truck className="w-4 h-4" />}>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-brand-700 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-paw-300 text-brand-500 focus:ring-brand-400"
                checked={needsPickup}
                onChange={handlePickupToggle}
              />
              需要接送服务
            </label>
            {needsPickup && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">接送时间</label>
                  <input
                    type="time"
                    className="input-field"
                    value={pickupTime}
                    onChange={e => setPickupTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">接送地址</label>
                  <input
                    className="input-field"
                    value={pickupAddress}
                    onChange={e => setPickupAddress(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="备注" icon={<Scissors className="w-4 h-4" />}>
          <textarea
            className="input-field min-h-[80px] resize-y"
            placeholder="其他备注信息..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </SectionCard>

        <div className="flex justify-end gap-3">
          <button onClick={() => navigate('/')} className="btn-secondary">
            取消
          </button>
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isEditing ? '保存修改' : '创建预约'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, icon, children }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-brand-500">{icon}</span>
        <h2 className="text-sm font-semibold text-brand-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-paw-400">{label}</span>
      <p className="text-brand-800 font-medium">{value}</p>
    </div>
  )
}
