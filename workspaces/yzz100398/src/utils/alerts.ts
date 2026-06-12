import type {
  AlertItem,
  AlertLevel,
  Measurement,
  StandardWeight,
  Environment,
  Unit,
  WeightClass,
} from "../types";

export interface DetectAlertsPartial {
  measurements?: Measurement[];
  standardWeight?: StandardWeight;
  environment?: Environment;
  nominalValue?: number;
  nominalUnit?: Unit;
  weightClass?: WeightClass;
  weightSerial?: string;
  certNumber?: string;
  customerId?: string;
  calibrationDate?: string;
}

interface RequiredFieldSpec {
  key: string;
  label: string;
  getValue: (p: DetectAlertsPartial) => unknown;
}

const REQUIRED_FIELDS: RequiredFieldSpec[] = [
  {
    key: "nominalValue",
    label: "标称值",
    getValue: (p) => p.nominalValue,
  },
  {
    key: "nominalUnit",
    label: "标称单位",
    getValue: (p) => p.nominalUnit,
  },
  {
    key: "weightClass",
    label: "准确度等级",
    getValue: (p) => p.weightClass,
  },
  {
    key: "weightSerial",
    label: "砝码编号",
    getValue: (p) => p.weightSerial,
  },
  {
    key: "certNumber",
    label: "证书编号",
    getValue: (p) => p.certNumber,
  },
  {
    key: "customerId",
    label: "客户信息",
    getValue: (p) => p.customerId,
  },
  {
    key: "calibrationDate",
    label: "校准日期",
    getValue: (p) => p.calibrationDate,
  },
  {
    key: "environment.temperature_C",
    label: "环境温度",
    getValue: (p) => p.environment?.temperature_C,
  },
  {
    key: "environment.humidity_RH",
    label: "环境湿度",
    getValue: (p) => p.environment?.humidity_RH,
  },
  {
    key: "standardWeight.class",
    label: "标准砝码等级",
    getValue: (p) => p.standardWeight?.class,
  },
  {
    key: "standardWeight.nominalValue",
    label: "标准砝码标称值",
    getValue: (p) => p.standardWeight?.nominalValue,
  },
  {
    key: "standardWeight.certNumber",
    label: "标准砝码证书号",
    getValue: (p) => p.standardWeight?.certNumber,
  },
  {
    key: "standardWeight.expiryDate",
    label: "标准砝码有效期",
    getValue: (p) => p.standardWeight?.expiryDate,
  },
];

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (typeof value === "number") return !isFinite(value);
  return false;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d;
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return (utcB - utcA) / MS_PER_DAY;
}

function makeAlert(
  level: AlertLevel,
  code: string,
  msg: string,
  field: string
): AlertItem {
  return { level, code, msg, field };
}

function localMean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function localStdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const avg = localMean(values);
  let sumSq = 0;
  for (const v of values) {
    const d = v - avg;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (n - 1));
}

export function detectAlerts(partial: DetectAlertsPartial): AlertItem[] {
  const alerts: AlertItem[] = [];
  const today = new Date();

  for (const spec of REQUIRED_FIELDS) {
    const value = spec.getValue(partial);
    if (isEmpty(value)) {
      alerts.push(
        makeAlert(
          "danger",
          "MISSING_REQUIRED",
          `必填字段"${spec.label}"为空`,
          spec.key
        )
      );
    }
  }

  const measurements = partial.measurements ?? [];
  const validMeasurements = measurements.filter(
    (m) => isFinite(m.value) && m.value > 0
  );

  if (validMeasurements.length < 6) {
    alerts.push(
      makeAlert(
        "warning",
        "MEASURE_COUNT_LOW",
        `有效测量数据仅 ${validMeasurements.length} 组，建议不少于 6 组`,
        "measurements"
      )
    );
  }

  if (validMeasurements.length >= 2) {
    const units = new Set(validMeasurements.map((m) => m.unit));
    if (units.size > 1) {
      alerts.push(
        makeAlert(
          "info",
          "UNIT_MIXED",
          `测量数据中包含多种单位: ${Array.from(units).join(", ")}`,
          "measurements"
        )
      );
    }
  }

  if (partial.environment && isFinite(partial.environment.temperature_C)) {
    const t = partial.environment.temperature_C;
    if (t < 18 || t > 23) {
      alerts.push(
        makeAlert(
          "warning",
          "TEMP_OUT_OF_RANGE",
          `环境温度 ${t}°C 超出推荐范围 (18-23°C)`,
          "environment.temperature_C"
        )
      );
    }
  }

  if (partial.environment && isFinite(partial.environment.humidity_RH)) {
    const rh = partial.environment.humidity_RH;
    if (rh < 30 || rh > 60) {
      alerts.push(
        makeAlert(
          "warning",
          "HUMIDITY_OUT_OF_RANGE",
          `环境湿度 ${rh}% RH 超出推荐范围 (30-60%)`,
          "environment.humidity_RH"
        )
      );
    }
  }

  if (partial.standardWeight?.expiryDate) {
    const expiry = parseDate(partial.standardWeight.expiryDate);
    if (expiry) {
      const daysToExpiry = daysBetween(today, expiry);
      if (daysToExpiry < 0) {
        alerts.push(
          makeAlert(
            "danger",
            "STD_CERT_EXPIRED",
            `标准砝码证书已过期 ${-daysToExpiry} 天`,
            "standardWeight.expiryDate"
          )
        );
      } else if (daysToExpiry < 30) {
        alerts.push(
          makeAlert(
            "warning",
            "STD_CERT_EXPIRE_SOON",
            `标准砝码证书将在 ${daysToExpiry} 天后过期`,
            "standardWeight.expiryDate"
          )
        );
      }
    }
  }

  if (validMeasurements.length >= 3) {
    const values = validMeasurements.map((m) => m.value);
    const avg = localMean(values);
    const sd = localStdDev(values);
    if (sd > 0) {
      let hasOutlier = false;
      for (const m of validMeasurements) {
        const dev = Math.abs(m.value - avg);
        if (dev > 3 * sd) {
          hasOutlier = true;
          break;
        }
      }
      if (hasOutlier) {
        alerts.push(
          makeAlert(
            "warning",
            "DEVIATION_LARGE",
            "存在测量值与均值偏差超过 3 倍标准差，请检查是否为离群值",
            "measurements"
          )
        );
      }
    }
  }

  return alerts;
}
