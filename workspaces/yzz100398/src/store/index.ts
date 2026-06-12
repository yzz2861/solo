import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  Customer,
  Certificate,
  Measurement,
  WeightClass,
  CalibrationForm,
  AlertItem,
} from "@/types"
import {
  calculateCalibration,
  detectAlerts,
  generateId,
} from "@/lib/utils"

interface StoreState {
  form: CalibrationForm
  customers: Customer[]
  certificates: Certificate[]
  currentStep: number
  searchKeyword: string
}

interface StoreActions {
  updateForm: <K extends keyof CalibrationForm>(key: K, value: CalibrationForm[K]) => void
  setMeasurements: (arr: Measurement[]) => void
  addMeasurement: (m: Measurement) => void
  removeMeasurement: (index: number) => void
  computeAll: () => void
  saveAsNewCertificate: () => string
  updateCertificate: (id: string) => void
  deleteCertificate: (id: string) => void
  loadCertificateToForm: (id: string) => void
  loadCustomerFromForm: () => void
  setCurrentStep: (n: number) => void
  setSearchKeyword: (k: string) => void
}

function generateCertNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, "0")
  return `JL${year}${rand}`
}

function getDefaultMeasurements(): Measurement[] {
  return Array.from({ length: 10 }, (_, i) => ({
    index: i + 1,
    value: 0,
    unit: "g" as const,
  }))
}

function addYearsToDate(dateStr: string, years: number): string {
  const d = new Date(dateStr)
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().split("T")[0]
}

function validateWeightClass(
  weightClass: string,
  field: "weightClass" | "standardWeight.class"
): AlertItem | null {
  if (!weightClass) {
    return {
      level: "danger",
      code: "WEIGHT_CLASS_REQUIRED",
      msg: field === "weightClass" ? "被校准砝码准确度等级不能为空" : "标准砝码准确度等级不能为空",
      field,
    }
  }
  return null
}

const getInitialForm = (): CalibrationForm => {
  const today = new Date().toISOString().split("T")[0]
  return {
    customerId: "",
    customerName: "",
    customerContact: "",
    customerPhone: "",
    certNumber: generateCertNumber(),
    nominalValue: 0,
    nominalUnit: "g",
    weightClass: "F1",
    weightSerial: "",
    calibrationDate: today,
    nextRecalDate: addYearsToDate(today, 1),
    standardWeight: {
      class: "E1",
      nominalValue: 0,
      nominalUnit: "g",
      certNumber: "",
      expiryDate: "",
      correctionValue_mg: 0,
    },
    environment: {
      temperature_C: 20,
      humidity_RH: 50,
      recordedAt: new Date().toISOString(),
    },
    measurements: getDefaultMeasurements(),
    results: null,
    alerts: [],
  }
}

export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      form: getInitialForm(),
      customers: [],
      certificates: [],
      currentStep: 0,
      searchKeyword: "",

      updateForm: (key, value) =>
        set((state) => ({
          form: { ...state.form, [key]: value },
        })),

      setMeasurements: (arr) =>
        set((state) => ({
          form: { ...state.form, measurements: arr },
        })),

      addMeasurement: (m) =>
        set((state) => ({
          form: { ...state.form, measurements: [...state.form.measurements, m] },
        })),

      removeMeasurement: (index) =>
        set((state) => ({
          form: {
            ...state.form,
            measurements: state.form.measurements.filter((_, i) => i !== index),
          },
        })),

      computeAll: () => {
        const { form } = get()
        const results = calculateCalibration(form)
        const alerts = detectAlerts(form)
        set((state) => ({
          form: { ...state.form, results, alerts },
        }))
      },

      loadCustomerFromForm: () => {
        const { form, customers } = get()
        if (!form.customerName && !form.customerContact && !form.customerPhone) return

        let customerId = form.customerId
        if (!customerId) {
          customerId = generateId()
          const newCustomer: Customer = {
            id: customerId,
            name: form.customerName,
            contact: form.customerContact,
            phone: form.customerPhone,
            createdAt: new Date().toISOString(),
          }
          set({
            customers: [...customers, newCustomer],
            form: { ...get().form, customerId },
          })
        } else {
          const updatedCustomers = customers.map((c) => {
            if (c.id !== customerId) return c
            return {
              ...c,
              name: form.customerName,
              contact: form.customerContact,
              phone: form.customerPhone,
            }
          })
          set({ customers: updatedCustomers })
        }
      },

      saveAsNewCertificate: () => {
        const { form } = get()
        get().loadCustomerFromForm()
        const { customers } = get()

        const newAlerts: AlertItem[] = [...form.alerts]
        const wcAlert = validateWeightClass(form.weightClass, "weightClass")
        if (wcAlert) newAlerts.push(wcAlert)
        const swcAlert = validateWeightClass(form.standardWeight.class, "standardWeight.class")
        if (swcAlert) newAlerts.push(swcAlert)

        if (wcAlert || swcAlert) {
          set((state) => ({ form: { ...state.form, alerts: newAlerts } }))
          throw new Error("保存失败：砝码准确度等级不能为空")
        }

        const customerId = get().form.customerId
        const certId = generateId()
        const { certificates } = get()
        const results = form.results || calculateCalibration(form)
        const alerts = newAlerts.length > 0 ? newAlerts : detectAlerts(form)

        const newCertificate: Certificate = {
          id: certId,
          customerId,
          certNumber: form.certNumber,
          nominalValue: form.nominalValue,
          nominalUnit: form.nominalUnit,
          weightClass: form.weightClass as WeightClass,
          weightSerial: form.weightSerial,
          calibrationDate: form.calibrationDate,
          nextRecalDate: form.nextRecalDate,
          standardWeight: {
            ...form.standardWeight,
            class: form.standardWeight.class as WeightClass,
          },
          environment: { ...form.environment },
          measurements: form.measurements.map((m) => ({ ...m })),
          results,
          alerts,
          createdAt: new Date().toISOString(),
          status: results.isPass === null ? "" : results.isPass ? "合格" : "不合格",
        }

        set({ certificates: [...certificates, newCertificate] })
        return certId
      },

      updateCertificate: (id) => {
        const { form, certificates } = get()
        get().loadCustomerFromForm()

        const newAlerts: AlertItem[] = [...form.alerts]
        const wcAlert = validateWeightClass(form.weightClass, "weightClass")
        if (wcAlert) newAlerts.push(wcAlert)
        const swcAlert = validateWeightClass(form.standardWeight.class, "standardWeight.class")
        if (swcAlert) newAlerts.push(swcAlert)

        if (wcAlert || swcAlert) {
          set((state) => ({ form: { ...state.form, alerts: newAlerts } }))
          throw new Error("保存失败：砝码准确度等级不能为空")
        }

        const results = form.results || calculateCalibration(form)
        const alerts = newAlerts.length > 0 ? newAlerts : detectAlerts(form)

        const updatedCertificates = certificates.map((cert) => {
          if (cert.id !== id) return cert
          return {
            ...cert,
            customerId: form.customerId || cert.customerId,
            certNumber: form.certNumber,
            nominalValue: form.nominalValue,
            nominalUnit: form.nominalUnit,
            weightClass: form.weightClass as WeightClass,
            weightSerial: form.weightSerial,
            calibrationDate: form.calibrationDate,
            nextRecalDate: form.nextRecalDate,
            standardWeight: {
              ...form.standardWeight,
              class: form.standardWeight.class as WeightClass,
            },
            environment: { ...form.environment },
            measurements: form.measurements.map((m) => ({ ...m })),
            results,
            alerts,
            status:
              results.isPass === null
                ? cert.status ?? ""
                : results.isPass
                  ? "合格"
                  : "不合格",
          }
        })

        set({ certificates: updatedCertificates })
      },

      deleteCertificate: (id) =>
        set((state) => ({
          certificates: state.certificates.filter((cert) => cert.id !== id),
        })),

      loadCertificateToForm: (id) => {
        const { certificates, customers } = get()
        const cert = certificates.find((c) => c.id === id)
        if (!cert) return

        const customer = customers.find((c) => c.id === cert.customerId)
        set({
          form: {
            customerId: cert.customerId,
            customerName: customer?.name || "",
            customerContact: customer?.contact || "",
            customerPhone: customer?.phone || "",
            certNumber: cert.certNumber,
            nominalValue: cert.nominalValue,
            nominalUnit: cert.nominalUnit,
            weightClass: cert.weightClass,
            weightSerial: cert.weightSerial,
            calibrationDate: cert.calibrationDate,
            nextRecalDate: cert.nextRecalDate,
            standardWeight: {
              class: cert.standardWeight.class,
              nominalValue: cert.standardWeight.nominalValue,
              nominalUnit: cert.standardWeight.nominalUnit,
              certNumber: cert.standardWeight.certNumber,
              expiryDate: cert.standardWeight.expiryDate,
              correctionValue_mg: cert.standardWeight.correctionValue_mg,
            },
            environment: {
              temperature_C: cert.environment.temperature_C,
              humidity_RH: cert.environment.humidity_RH,
              recordedAt: cert.environment.recordedAt,
            },
            measurements: cert.measurements.map((m) => ({
              index: m.index,
              value: m.value,
              unit: m.unit,
            })),
            results: cert.results,
            alerts: cert.alerts,
          },
          currentStep: 0,
        })
      },

      setCurrentStep: (n) => set({ currentStep: n }),

      setSearchKeyword: (k) => set({ searchKeyword: k }),
    }),
    {
      name: "weight-calibration-store",
    },
  ),
)
