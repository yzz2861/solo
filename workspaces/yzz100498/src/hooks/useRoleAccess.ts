import { useMemo } from 'react';
import { useUserStore } from '../store/useUserStore';
import { UserRole } from '../types';

interface RoleAccess {
  canViewDashboard: boolean;
  canViewSalesAnalysis: boolean;
  canViewPreparation: boolean;
  canViewForecast: boolean;
  canViewSpecialMeals: boolean;
  canViewDataImport: boolean;
  canViewSettings: boolean;
  canVerifySpecialMeals: boolean;
  canEditWardCount: boolean;
  canViewCostAnalysis: boolean;
  canViewWasteAnalysis: boolean;
}

const rolePermissions: Record<UserRole, RoleAccess> = {
  logistics: {
    canViewDashboard: true,
    canViewSalesAnalysis: true,
    canViewPreparation: true,
    canViewForecast: true,
    canViewSpecialMeals: true,
    canViewDataImport: true,
    canViewSettings: true,
    canVerifySpecialMeals: false,
    canEditWardCount: false,
    canViewCostAnalysis: true,
    canViewWasteAnalysis: true
  },
  canteen_manager: {
    canViewDashboard: true,
    canViewSalesAnalysis: true,
    canViewPreparation: true,
    canViewForecast: true,
    canViewSpecialMeals: true,
    canViewDataImport: true,
    canViewSettings: false,
    canVerifySpecialMeals: false,
    canEditWardCount: false,
    canViewCostAnalysis: true,
    canViewWasteAnalysis: true
  },
  nurse_station: {
    canViewDashboard: true,
    canViewSalesAnalysis: true,
    canViewPreparation: false,
    canViewForecast: true,
    canViewSpecialMeals: true,
    canViewDataImport: true,
    canViewSettings: false,
    canVerifySpecialMeals: true,
    canEditWardCount: true,
    canViewCostAnalysis: false,
    canViewWasteAnalysis: false
  },
  purchaser: {
    canViewDashboard: true,
    canViewSalesAnalysis: false,
    canViewPreparation: false,
    canViewForecast: true,
    canViewSpecialMeals: false,
    canViewDataImport: false,
    canViewSettings: false,
    canVerifySpecialMeals: false,
    canEditWardCount: false,
    canViewCostAnalysis: true,
    canViewWasteAnalysis: false
  },
  nurse: {
    canViewDashboard: true,
    canViewSalesAnalysis: false,
    canViewPreparation: false,
    canViewForecast: true,
    canViewSpecialMeals: true,
    canViewDataImport: false,
    canViewSettings: false,
    canVerifySpecialMeals: true,
    canEditWardCount: true,
    canViewCostAnalysis: false,
    canViewWasteAnalysis: false
  }
};

export const useRoleAccess = () => {
  const { currentUser } = useUserStore();
  
  const access = useMemo(() => {
    if (!currentUser) {
      return {
        canViewDashboard: false,
        canViewSalesAnalysis: false,
        canViewPreparation: false,
        canViewForecast: false,
        canViewSpecialMeals: false,
        canViewDataImport: false,
        canViewSettings: false,
        canVerifySpecialMeals: false,
        canEditWardCount: false,
        canViewCostAnalysis: false,
        canViewWasteAnalysis: false
      };
    }
    return rolePermissions[currentUser.role];
  }, [currentUser]);
  
  const hasAccess = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  };
  
  return {
    currentUser,
    access,
    hasAccess,
    isLogistics: currentUser?.role === 'logistics',
    isCanteenManager: currentUser?.role === 'canteen_manager',
    isNurseStation: currentUser?.role === 'nurse_station',
    isPurchaser: currentUser?.role === 'purchaser',
    isNurse: currentUser?.role === 'nurse'
  };
};
