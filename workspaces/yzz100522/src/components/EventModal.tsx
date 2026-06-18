import { AlertTriangle, X, Ambulance, Bed, Users, UserPlus } from 'lucide-react';
import type { SpecialEvent } from '../types';
import { cn } from '../lib/utils';

interface EventModalProps {
  event: SpecialEvent;
  onDismiss: () => void;
}

const eventTypeConfig: Record<string, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  resource_reduce: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  new_casualty: { icon: UserPlus, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  condition_worsen: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
  transport_arrive: { icon: Ambulance, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
};

const eventTypeLabels: Record<string, string> = {
  resource_reduce: '资源变动',
  new_casualty: '新增伤员',
  condition_worsen: '病情恶化',
  transport_arrive: '救援到达',
};

export default function EventModal({ event, onDismiss }: EventModalProps) {
  const config = eventTypeConfig[event.type] || eventTypeConfig.resource_reduce;
  const Icon = config.icon;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-slideUp">
        <div className={cn('px-6 py-4', config.bgColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-full bg-white', config.color)}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className={cn('font-bold text-lg', config.color)}>
                  ⚡ {eventTypeLabels[event.type] || '突发事件'}
                </h3>
                <p className="text-sm text-gray-600">请立即评估并调整方案</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-black/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 text-lg mb-4 font-medium">
            {event.description}
          </p>
          
          {event.resourceChange && (
            <div className="space-y-2 bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 mb-2">资源变化：</p>
              {event.resourceChange.stretchers !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Bed size={16} className="text-orange-500" />
                  <span className="text-gray-600">担架:</span>
                  <span className={cn('font-bold', event.resourceChange.stretchers > 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {event.resourceChange.stretchers > 0 ? '+' : ''}{event.resourceChange.stretchers}
                  </span>
                </div>
              )}
              {event.resourceChange.medics !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Users size={16} className="text-blue-500" />
                  <span className="text-gray-600">医护:</span>
                  <span className={cn('font-bold', event.resourceChange.medics > 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {event.resourceChange.medics > 0 ? '+' : ''}{event.resourceChange.medics}
                  </span>
                </div>
              )}
              {event.resourceChange.ambulances !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Ambulance size={16} className="text-red-500" />
                  <span className="text-gray-600">救护车:</span>
                  <span className={cn('font-bold', event.resourceChange.ambulances > 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {event.resourceChange.ambulances > 0 ? '+' : ''}{event.resourceChange.ambulances}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {event.newCasualty && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm font-medium text-amber-800 mb-1">🆕 新发现伤员</p>
              <p className="text-amber-700">{event.newCasualty.name}，{event.newCasualty.age}岁</p>
              <p className="text-sm text-amber-600 mt-1">{event.newCasualty.injuryDescription}</p>
            </div>
          )}
          
          <button
            onClick={onDismiss}
            className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
          >
            知道了，重新评估
          </button>
        </div>
      </div>
    </div>
  );
}
