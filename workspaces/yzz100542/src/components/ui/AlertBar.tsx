import { useEffect, useState } from 'react'
import { AlertTriangle, Zap, EyeOff, Footprints, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { AlertItem } from '@/store/useStore'
import {
  calculateAllBlindZones,
  isPointInBlindZone,
  getWalkwayPolygon,
  polygonsOverlap,
  checkLineOfSightBlocked,
} from '@/utils/blindZoneCalc'

const alertIcons: Record<string, React.ReactNode> = {
  overspeed: <Zap className="w-4 h-4" />,
  blindspot: <EyeOff className="w-4 h-4" />,
  walkway_blocked: <Footprints className="w-4 h-4" />,
  view_blocked: <AlertTriangle className="w-4 h-4" />,
}

const alertMessages: Record<string, string> = {
  overspeed: '车速过快！建议降速至5km/h以下',
  blindspot: '指挥员已进入盲区！请立即调整站位',
  walkway_blocked: '行人通道被盲区覆盖！请调整通道位置',
  view_blocked: '围挡遮挡司机视线！请调整围挡位置',
}

export function useAlertDetection() {
  const { layout, isPlaying, animProgress, setAlerts } = useStore()

  useEffect(() => {
    const truck = layout.truck
    const turnAngle = isPlaying || animProgress > 0
      ? Math.min(animProgress * Math.PI / 0.7, Math.PI / 2)
      : 0

    const blindZones = calculateAllBlindZones(
      truck.x, truck.z, truck.rotation, turnAngle
    )

    const newAlerts: AlertItem[] = []

    if (truck.speed > 8) {
      newAlerts.push({
        id: 'overspeed',
        type: 'overspeed',
        severity: truck.speed > 12 ? 'danger' : 'warning',
        message: alertMessages.overspeed,
        active: true,
      })
    }

    const commanderInBlind = isPointInBlindZone(
      [layout.commander.x, layout.commander.z],
      blindZones
    )
    if (commanderInBlind) {
      newAlerts.push({
        id: 'blindspot',
        type: 'blindspot',
        severity: 'danger',
        message: alertMessages.blindspot,
        active: true,
      })
    }

    const walkwayPoly = getWalkwayPolygon(
      layout.walkway.x,
      layout.walkway.z,
      layout.walkway.rotation,
      layout.walkway.width,
      layout.walkway.length
    )
    if (
      polygonsOverlap(walkwayPoly, blindZones.sideZone) ||
      polygonsOverlap(walkwayPoly, blindZones.apillarZone) ||
      (blindZones.innerWheelZone.length > 0 && polygonsOverlap(walkwayPoly, blindZones.innerWheelZone))
    ) {
      newAlerts.push({
        id: 'walkway_blocked',
        type: 'walkway_blocked',
        severity: 'warning',
        message: alertMessages.walkway_blocked,
        active: true,
      })
    }

    const driverWorldX = truck.x + Math.sin(truck.rotation + Math.PI / 2) * 1.2
    const driverWorldZ = truck.z + Math.cos(truck.rotation + Math.PI / 2) * 1.2

    const gateVisible = !checkLineOfSightBlocked(
      driverWorldX, driverWorldZ,
      layout.gate.x, layout.gate.z,
      layout.barriers
    )
    if (!gateVisible) {
      newAlerts.push({
        id: 'view_blocked',
        type: 'view_blocked',
        severity: 'warning',
        message: alertMessages.view_blocked,
        active: true,
      })
    }

    setAlerts(newAlerts)
  }, [layout, isPlaying, animProgress, setAlerts])
}

export default function AlertBar() {
  const { alerts } = useStore()
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  useAlertDetection()

  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.id))

  if (visibleAlerts.length === 0) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-xl w-full px-4">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm
            animate-slideDown
            ${alert.severity === 'danger'
              ? 'bg-red-900/80 border border-red-500/50 text-red-100'
              : 'bg-yellow-900/80 border border-yellow-500/50 text-yellow-100'
            }
          `}
        >
          <span className={alert.severity === 'danger' ? 'text-red-400 animate-pulse' : 'text-yellow-400'}>
            {alertIcons[alert.type]}
          </span>
          <span className="text-sm flex-1">{alert.message}</span>
          <button
            onClick={() => setDismissedAlerts((prev) => new Set(prev).add(alert.id))}
            className="text-white/50 hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
