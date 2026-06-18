import { useState, useEffect } from 'react';
import { 
  Hotel, 
  Users, 
  Bus, 
  Heart,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { RELATION_LABELS } from '@/types';
import { calculateAge } from '@/utils';

type TabType = 'rooming' | 'busing' | 'special-care';

export default function Rooming() {
  const { 
    trips, 
    registrations, 
    currentTripId, 
    setCurrentTrip,
    roomAssignments,
    busAssignments,
    autoRoomAssignment,
    autoBusAssignment
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('rooming');
  const [expandedRooms, setExpandedRooms] = useState<string[]>([]);
  const [expandedBuses, setExpandedBuses] = useState<string[]>([]);
  
  const currentTrip = trips.find(t => t.id === currentTripId);
  
  const tripRegistrations = registrations.filter(
    r => r.tripId === currentTripId && r.status !== 'cancelled' && r.status !== 'refunded'
  );
  
  const tripRoomAssignments = roomAssignments.filter(a => a.tripId === currentTripId);
  const tripBusAssignments = busAssignments.filter(a => a.tripId === currentTripId);
  
  const totalPeople = tripRegistrations.reduce((sum, r) => sum + r.members.length, 0);
  const totalRooms = tripRoomAssignments.length;
  const totalBuses = tripBusAssignments.length;

  useEffect(() => {
    if (currentTripId && tripRoomAssignments.length === 0) {
      autoRoomAssignment(currentTripId);
    }
    if (currentTripId && tripBusAssignments.length === 0) {
      autoBusAssignment(currentTripId);
    }
  }, [currentTripId]);

  const specialCareList = tripRegistrations.flatMap(reg => 
    reg.members
      .filter(m => m.health?.specialCare || m.health?.allergies || m.health?.medicalConditions)
      .map(member => ({
        id: member.id,
        name: member.name,
        gender: member.gender,
        relation: member.relation,
        family: reg.familyName,
        age: calculateAge(member.birthDate),
        specialCare: member.health?.specialCare,
        allergies: member.health?.allergies,
        medicalConditions: member.health?.medicalConditions,
        dietaryRestrictions: member.health?.dietaryRestrictions,
        roomNo: reg.roomNo,
      }))
  );

  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const toggleBus = (busId: string) => {
    setExpandedBuses(prev => 
      prev.includes(busId) 
        ? prev.filter(id => id !== busId)
        : [...prev, busId]
    );
  };

  const handlePrintSpecialCare = () => {
    window.print();
  };

  const handleAutoAssign = () => {
    if (currentTripId) {
      if (activeTab === 'rooming') {
        autoRoomAssignment(currentTripId);
      } else if (activeTab === 'busing') {
        autoBusAssignment(currentTripId);
      }
    }
  };

  const getMemberById = (memberId: string) => {
    for (const reg of tripRegistrations) {
      const member = reg.members.find(m => m.id === memberId);
      if (member) return { member, registration: reg };
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-800">分房分车管理</h1>
          <p className="text-warm-500 mt-1">
            {currentTrip?.name || '请选择团期'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-warm-500" />
            <select 
              value={currentTripId || ''}
              onChange={(e) => setCurrentTrip(e.target.value)}
              className="input min-w-[200px]"
            >
              <option value="">选择团期</option>
              {trips.map(trip => (
                <option key={trip.id} value={trip.id}>{trip.name}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={handleAutoAssign}
            className="btn-secondary"
            disabled={!currentTripId}
          >
            <RefreshCw size={16} />
            自动分配
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Users size={20} className="text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-800">{totalPeople}</p>
              <p className="text-xs text-warm-500">出行人数</p>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
              <Hotel size={20} className="text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-800">{totalRooms}</p>
              <p className="text-xs text-warm-500">房间数量</p>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bus size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-800">{totalBuses}</p>
              <p className="text-xs text-warm-500">车辆数量</p>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger-100 flex items-center justify-center">
              <Heart size={20} className="text-danger-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-800">{specialCareList.length}</p>
              <p className="text-xs text-warm-500">特殊照护</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-warm-100 p-1 rounded-xl w-fit">
        {[
          { id: 'rooming', label: '分房管理', icon: Hotel },
          { id: 'busing', label: '分车管理', icon: Bus },
          { id: 'special-care', label: '特殊照护', icon: Heart },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-warm-600 hover:text-warm-800'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'rooming' && (
        <div className="space-y-4 animate-fade-in">
          {tripRoomAssignments.length === 0 ? (
            <div className="card p-12 text-center">
              <Hotel size={48} className="mx-auto text-warm-300 mb-3" />
              <p className="text-warm-500 mb-4">暂无房间分配</p>
              <button 
                onClick={handleAutoAssign}
                className="btn-primary"
                disabled={!currentTripId}
              >
                自动分房
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tripRoomAssignments.map(room => {
                const isExpanded = expandedRooms.includes(room.id);
                const members = room.memberIds
                  .map(id => getMemberById(id))
                  .filter(Boolean);
                
                return (
                  <div key={room.id} className="card overflow-hidden">
                    <div 
                      className="p-4 cursor-pointer hover:bg-warm-50 transition-colors"
                      onClick={() => toggleRoom(room.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                            <Hotel size={22} className="text-primary-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-warm-800">{room.roomNo} 房</h3>
                            <p className="text-sm text-warm-500">{room.roomType} · {room.capacity}人间</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="badge-primary">{members.length}/{room.capacity}</span>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-warm-100">
                        <div className="space-y-3 mt-3">
                          {members.map((item: any, index: number) => (
                            <div key={index} className="flex items-center gap-3 p-2 bg-warm-50 rounded-lg">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                                item.member.relation === 'child' ? 'bg-primary-400' :
                                item.member.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
                              }`}>
                                {item.member.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-warm-800 text-sm">{item.member.name}</p>
                                <p className="text-xs text-warm-500">
                                  {RELATION_LABELS[item.member.relation]} · {item.registration.familyName}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {room.notes && (
                          <div className="mt-3 p-2 bg-primary-50 rounded-lg">
                            <p className="text-xs text-primary-700">{room.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'busing' && (
        <div className="space-y-4 animate-fade-in">
          {tripBusAssignments.length === 0 ? (
            <div className="card p-12 text-center">
              <Bus size={48} className="mx-auto text-warm-300 mb-3" />
              <p className="text-warm-500 mb-4">暂无车辆分配</p>
              <button 
                onClick={handleAutoAssign}
                className="btn-primary"
                disabled={!currentTripId}
              >
                自动分车
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tripBusAssignments.map(bus => {
                const isExpanded = expandedBuses.includes(bus.id);
                const members = bus.memberIds
                  .map(id => getMemberById(id))
                  .filter(Boolean);
                
                return (
                  <div key={bus.id} className="card overflow-hidden">
                    <div 
                      className="p-4 cursor-pointer hover:bg-warm-50 transition-colors"
                      onClick={() => toggleBus(bus.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Bus size={26} className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-warm-800 text-lg">{bus.busNo}</h3>
                            <p className="text-sm text-warm-500">
                              {members.length}/{bus.capacity} 人 · {bus.registrationIds.length} 个家庭
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-warm-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${(members.length / bus.capacity) * 100}%` }}
                            />
                          </div>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 pt-0 border-t border-warm-100">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                          {members.map((item: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-warm-50 rounded-lg">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${
                                item.member.relation === 'child' ? 'bg-primary-400' :
                                item.member.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
                              }`}>
                                {item.member.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-warm-800 text-sm truncate">{item.member.name}</p>
                                <p className="text-xs text-warm-500 truncate">{item.registration.familyName}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'special-care' && (
        <div className="space-y-4 animate-fade-in no-print-keep">
          <div className="flex items-center justify-between">
            <p className="text-warm-500">
              共 {specialCareList.length} 位需要特殊照护的成员
            </p>
            <button onClick={handlePrintSpecialCare} className="btn-primary">
              <Printer size={16} />
              打印照护单
            </button>
          </div>
          
          {specialCareList.length === 0 ? (
            <div className="card p-12 text-center">
              <Heart size={48} className="mx-auto text-success-300 mb-3" />
              <p className="text-warm-500">暂无需要特殊照护的成员</p>
            </div>
          ) : (
            <div className="space-y-4">
              {specialCareList.map((item, index) => (
                <div key={index} className="card p-5 border-l-4 border-l-danger-400">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        item.relation === 'child' ? 'bg-primary-400' :
                        item.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'
                      }`}>
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-warm-800 text-lg">{item.name}</h3>
                        <p className="text-sm text-warm-500">
                          {RELATION_LABELS[item.relation as keyof typeof RELATION_LABELS]} · {item.family} · {item.age}岁
                        </p>
                        {item.roomNo && (
                          <p className="text-sm text-primary-600 mt-1">
                            <Hotel size={14} className="inline mr-1" />
                            {item.roomNo} 房
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="badge-danger">需特殊照护</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item.specialCare && (
                      <div className="p-3 bg-primary-50 rounded-lg">
                        <p className="text-xs text-primary-600 font-medium mb-1">特殊照护</p>
                        <p className="text-sm text-primary-700">{item.specialCare}</p>
                      </div>
                    )}
                    {item.allergies && (
                      <div className="p-3 bg-danger-50 rounded-lg">
                        <p className="text-xs text-danger-600 font-medium mb-1">过敏史</p>
                        <p className="text-sm text-danger-700">{item.allergies}</p>
                      </div>
                    )}
                    {item.medicalConditions && (
                      <div className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-xs text-amber-600 font-medium mb-1">特殊疾病</p>
                        <p className="text-sm text-amber-700">{item.medicalConditions}</p>
                      </div>
                    )}
                    {item.dietaryRestrictions && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600 font-medium mb-1">饮食禁忌</p>
                        <p className="text-sm text-green-700">{item.dietaryRestrictions}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="print-only hidden">
            <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
              特殊照护名单
            </h2>
            <p style={{ marginBottom: '20px' }}>
              团期：{currentTrip?.name} | 共 {specialCareList.length} 人
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>姓名</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>家庭</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>年龄</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>房号</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>特殊照护</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>过敏</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>疾病</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>饮食</th>
                </tr>
              </thead>
              <tbody>
                {specialCareList.map((item, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.name}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.family}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.age}岁</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.roomNo || '-'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.specialCare || '-'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.allergies || '-'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.medicalConditions || '-'}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.dietaryRestrictions || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
