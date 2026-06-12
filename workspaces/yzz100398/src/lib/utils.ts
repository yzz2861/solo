import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CalibrationForm, CalibrationResults, AlertItem, WeightClass, StandardWeight } from "@/types"
import { calculateCalibration as coreCalculate } from "@/utils/calculation"
import { detectAlerts as coreDetectAlerts } from "@/utils/alerts"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateCalibration(form: CalibrationForm): CalibrationResults {
  if (form.weightClass === "" || form.standardWeight.class === "") {
    return {
      correction_mg: 0,
      u_combined_mg: 0,
      U_expanded_mg: 0,
      k_factor: 2,
      contributions: [],
      tolerance_mg: 0,
      isPass: null,
      mean_mg: 0,
      std_mg: 0,
    }
  }
  return coreCalculate({
    nominalValue: form.nominalValue,
    nominalUnit: form.nominalUnit,
    weightClass: form.weightClass,
    standardWeight: {
      ...form.standardWeight,
      class: form.standardWeight.class as WeightClass,
    },
    environment: form.environment,
    measurements: form.measurements,
  })
}

export function detectAlerts(form: CalibrationForm): AlertItem[] {
  return coreDetectAlerts({
    measurements: form.measurements,
    standardWeight: form.standardWeight.class !== "" ? ({ ...form.standardWeight, class: form.standardWeight.class as WeightClass } as StandardWeight) : undefined,
    environment: form.environment,
    nominalValue: form.nominalValue,
    nominalUnit: form.nominalUnit,
    weightClass: form.weightClass !== "" ? form.weightClass : undefined,
    weightSerial: form.weightSerial,
    certNumber: form.certNumber,
    customerId: form.customerId,
    calibrationDate: form.calibrationDate,
  })
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}
