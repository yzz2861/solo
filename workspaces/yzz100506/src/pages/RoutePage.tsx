import { useState, useMemo, useEffect } from 'react'
import { Calendar, MapPin, Phone, Car, Bell, BellRing, Dog } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { timeToMinutes } from '@/utils/duration'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface GroupedPickup {
  area: string
  appointments: {
    id: string
    petName: string
    ownerName: string
    phone: string
    pickupAddress: string
    pickupTime: string
    groomerName: string
  }[]
}

export default function RoutePage() {
  const initSeed = useStore((s) => s.initSeed)
  const getAppointmentsByDate = useStore((s) => s.getAppointmentsByDate)
  const getPetById = useStore((s) => s.getPetById)
  const getOwnerById = useStore((s) => s.getOwnerById)
  const getGroomerById = useStore((s) => s.getGroomerById)

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set())
  const [notifiedAreas, setNotifiedAreas] = useState<Set<string>>(new Set())

  useEffect(() => {
    initSeed()
  }, [initSeed])

  const pickupAppointments = useMemo(
    () => getAppointmentsByDate(selectedDate).filter((apt) => apt.needsPickup),
    [getAppointmentsByDate, selectedDate]
  )

  const groupedPickups = useMemo<GroupedPickup[]>(() => {
    const enriched = pickupAppointments.map((apt) => {
      const pet = getPetById(apt.petId)
      const owner = getOwnerById(apt.ownerId)
      const groomer = getGroomerById(apt.groomerId)
      const area = apt.pickupAddress.slice(0, 3)
      return {
        id: apt.id,
        petName: pet?.name ?? '',
        ownerName: owner?.name ?? '',
        phone: owner?.phone ?? '',
        pickupAddress: apt.pickupAddress,
        pickupTime: apt.pickupTime,
        groomerName: groomer?.name ?? '',
        area,
      }
    })

    const map = new Map<string, GroupedPickup['appointments']>()
    for (const item of enriched) {
      const list = map.get(item.area) ?? []
      list.push(item)
      map.set(item.area, list)
    }

    return Array.from(map.entries()).map(([area, items]) => ({
      area,
      appointments: items.sort((a, b) => timeToMinutes(a.pickupTime) - timeToMinutes(b.pickupTime)),
    }))
  }, [pickupAppointments, getPetById, getOwnerById, getGroomerById])

  function notifyOwner(ownerName: string, pickupTime: string, aptId: string) {
    alert(`已通知 ${ownerName} 预计 ${pickupTime} 接驾`)
    setNotifiedIds((prev) => new Set(prev).add(aptId))
  }

  function notifyAllInArea(area: string, items: GroupedPickup['appointments']) {
    const names = items.map((i) => i.ownerName).join('、')
    alert(`已通知 ${names} 安排接驾`)
    setNotifiedAreas((prev) => new Set(prev).add(area))
    setNotifiedIds((prev) => {
      const next = new Set(prev)
      items.forEach((i) => next.add(i.id))
      return next
    })
  }

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setNotifiedIds(new Set())
              setNotifiedAreas(new Set())
            }}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Car className="w-4 h-4 text-brand-500" />
          <span>共 <strong className="text-gray-800">{pickupAppointments.length}</strong> 单接驾</span>
        </div>
      </div>

      {pickupAppointments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Dog className="w-16 h-16 mx-auto mb-3 opacity-40" />
            <p className="text-lg">今日暂无接驾安排</p>
            <p className="text-sm mt-1">选择其他日期查看</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedPickups.map((group, idx) => {
            const isAreaNotified = notifiedAreas.has(group.area)
            return (
              <div
                key={group.area}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3 bg-paw-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-brand-400 text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-brand-500" />
                      <span className="font-semibold text-gray-800">{group.area}</span>
                    </div>
                    <span className="text-xs text-gray-400">{group.appointments.length} 单</span>
                  </div>
                  <button
                    onClick={() => notifyAllInArea(group.area, group.appointments)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      isAreaNotified
                        ? 'bg-mint-50 text-mint-600 border-mint-200'
                        : 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
                    }`}
                  >
                    {isAreaNotified ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                    通知全部
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {group.appointments.map((item) => {
                    const isNotified = notifiedIds.has(item.id)
                    return (
                      <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-paw-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-800 text-sm">{item.petName}</span>
                            <span className="text-xs text-gray-400">{item.groomerName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{item.ownerName}</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {item.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.pickupAddress}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {item.pickupTime}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => notifyOwner(item.ownerName, item.pickupTime, item.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0 ml-3 ${
                            isNotified
                              ? 'bg-mint-50 text-mint-600 border-mint-200'
                              : 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
                          }`}
                        >
                          {isNotified ? <BellRing className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                          通知主人
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
