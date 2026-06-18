import { useMemo } from 'react';
import { useDataStore } from '../store/useDataStore';
import { useRoleAccess } from './useRoleAccess';
import { Alert, RiskLevel } from '../types';

export const useAlerts = () => {
  const { alerts, markAlertRead } = useDataStore();
  const { isLogistics, isCanteenManager, isNurseStation, isPurchaser, isNurse } = useRoleAccess();
  
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (isLogistics || isCanteenManager) return true;
      if (isNurseStation || isNurse) {
        return alert.type === 'shortage' || alert.type === 'verification';
      }
      if (isPurchaser) {
        return alert.type === 'shortage' || alert.type === 'waste';
      }
      return false;
    });
  }, [alerts, isLogistics, isCanteenManager, isNurseStation, isPurchaser, isNurse]);
  
  const unreadCount = useMemo(() => {
    return filteredAlerts.filter(a => !a.isRead).length;
  }, [filteredAlerts]);
  
  const highPriorityCount = useMemo(() => {
    return filteredAlerts.filter(a => 
      a.level === 'high' || a.level === 'critical'
    ).length;
  }, [filteredAlerts]);
  
  const alertsByType = useMemo(() => {
    const grouped: Record<string, Alert[]> = {
      waste: [],
      shortage: [],
      anomaly: [],
      verification: []
    };
    
    filteredAlerts.forEach(alert => {
      grouped[alert.type].push(alert);
    });
    
    return grouped;
  }, [filteredAlerts]);
  
  const alertsByLevel = useMemo(() => {
    const grouped: Record<RiskLevel, Alert[]> = {
      low: [],
      medium: [],
      high: [],
      critical: []
    };
    
    filteredAlerts.forEach(alert => {
      grouped[alert.level].push(alert);
    });
    
    return grouped;
  }, [filteredAlerts]);
  
  const markAllAsRead = () => {
    filteredAlerts.forEach(alert => {
      if (!alert.isRead) {
        markAlertRead(alert.id);
      }
    });
  };
  
  return {
    alerts: filteredAlerts,
    unreadCount,
    highPriorityCount,
    alertsByType,
    alertsByLevel,
    markAlertRead,
    markAllAsRead
  };
};
