import { SprintRecord, EventType, TrackType, TimingMethod, TRACK_TYPE_LABELS } from '@/types';

export function formatTimeDisplay(seconds: number, showMs: boolean = true): string {
  if (seconds < 60) {
    return showMs ? seconds.toFixed(2) + 's' : Math.floor(seconds) + 's';
  }
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}'${secs}"`;
}

export function formatWindSpeed(windSpeed?: number): string {
  if (windSpeed === undefined || windSpeed === null) return '未记录';
  const sign = windSpeed > 0 ? '+' : '';
  return `${sign}${windSpeed.toFixed(1)} m/s`;
}

export function formatWindDirection(windSpeed?: number): string {
  if (windSpeed === undefined || windSpeed === null) return '';
  if (windSpeed > 0) return '顺风';
  if (windSpeed < 0) return '逆风';
  return '无风';
}

export function formatAltitude(altitude: number): string {
  return `${altitude} m`;
}

export function formatTemperature(temp: number): string {
  return `${temp}°C`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

export function formatTrackType(type: TrackType): string {
  return TRACK_TYPE_LABELS[type];
}

export function formatTimingMethod(method: TimingMethod): string {
  return method === 'electronic' ? '电计时' : '手计时';
}

export function formatEvent(event: EventType): string {
  return event;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getCorrectionEncouragement(
  totalCorrection: number,
  factors: string[],
  isStudent: boolean = true
): { title: string; message: string; emoji: string } {
  const absCorrection = Math.abs(totalCorrection);
  
  if (absCorrection < 0.01) {
    return {
      title: isStudent ? '成绩接近真实水平 🎯' : '环境影响极小',
      message: isStudent
        ? '当前环境条件接近标准状态，你的成绩很能反映真实水平！继续保持训练节奏。'
        : '环境因素对成绩影响极小，数据参考价值高。',
      emoji: '⚖️',
    };
  }

  const isFaster = totalCorrection < 0;

  if (isFaster) {
    if (absCorrection >= 0.3) {
      return {
        title: isStudent ? '你的真实水平更强！🔥' : '修正后提升显著',
        message: isStudent
          ? `修正后成绩提升了 ${absCorrection.toFixed(2)} 秒！环境条件拖了你的后腿，你的真实实力比显示的更强。继续刻苦训练，成绩会更亮眼！`
          : `环境修正后成绩提升 ${absCorrection.toFixed(2)} 秒，运动员真实水平优于表观成绩。`,
        emoji: '🚀',
      };
    }
    if (absCorrection >= 0.1) {
      return {
        title: isStudent ? '发挥得不错！💪' : '修正后有所提升',
        message: isStudent
          ? `修正后提升了 ${absCorrection.toFixed(2)} 秒。你在不利条件下依然跑出了好成绩，说明状态很棒！`
          : `环境修正后成绩提升 ${absCorrection.toFixed(2)} 秒，运动员状态良好。`,
        emoji: '📈',
      };
    }
    return {
      title: isStudent ? '真实水平再快一点 ✨' : '小幅修正',
      message: isStudent
        ? `修正后提升了 ${absCorrection.toFixed(2)} 秒。继续加油，每一点进步都算数！`
        : `环境修正后成绩提升 ${absCorrection.toFixed(2)} 秒。`,
      emoji: '🌟',
    };
  }

  if (absCorrection <= 0.3) {
    return {
      title: isStudent ? '环境帮了点小忙 🌬️' : '环境有助益',
      message: isStudent
        ? `修正后慢了 ${absCorrection.toFixed(2)} 秒。环境条件对你有利，继续提升真实实力才是关键哦！`
        : `环境因素使表观成绩提升 ${absCorrection.toFixed(2)} 秒，修正后更接近真实水平。`,
      emoji: '�',
    };
  }
  return {
    title: isStudent ? '环境助力明显，继续提升！🏃' : '环境影响较大',
    message: isStudent
      ? `修正后慢了 ${absCorrection.toFixed(2)} 秒。这次成绩受益于环境条件，不要骄傲，继续扎实训练提升真实水平！`
      : `环境因素使表观成绩提升 ${absCorrection.toFixed(2)} 秒，建议结合多次训练成绩综合评估。`,
    emoji: '🌿',
  };
}

export function parseCSV(csvText: string): Partial<SprintRecord>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const records: Partial<SprintRecord>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 2) continue;

    const record: Partial<SprintRecord> = {};

    headers.forEach((header, idx) => {
      const value = values[idx]?.trim();
      if (!value) return;

      switch (header) {
        case 'date':
        case '日期':
          record.date = value;
          break;
        case 'event':
        case '项目':
          if (value === '100m' || value === '100米') record.event = '100m';
          else if (value === '200m' || value === '200米') record.event = '200m';
          break;
        case 'time':
        case '成绩':
        case 'time(s)':
          record.rawTime = parseFloat(value);
          break;
        case 'wind':
        case '风速':
        case 'windspeed':
          record.windSpeed = parseFloat(value);
          break;
        case 'altitude':
        case '海拔':
          record.altitude = parseFloat(value);
          break;
        case 'temperature':
        case '温度':
        case 'temp':
          record.temperature = parseFloat(value);
          break;
        case 'track':
        case '赛道':
          if (value.includes('塑胶')) record.trackType = 'synthetic';
          else if (value.includes('煤渣')) record.trackType = 'cinder';
          else if (value.includes('土')) record.trackType = 'dirt';
          else if (value.includes('聚氨酯')) record.trackType = 'tartan';
          break;
        case 'timing':
        case '计时':
          if (value.includes('电')) record.timingMethod = 'electronic';
          else if (value.includes('手')) record.timingMethod = 'manual';
          break;
        case 'name':
        case '姓名':
        case 'student':
          record.studentName = value;
          break;
        case 'note':
        case '备注':
          record.note = value;
          break;
      }
    });

    if (record.rawTime || record.event) {
      if (!record.date) record.date = new Date().toISOString().split('T')[0];
      if (!record.altitude) record.altitude = 0;
      if (!record.temperature) record.temperature = 20;
      if (!record.trackType) record.trackType = 'synthetic';
      if (!record.timingMethod) record.timingMethod = 'electronic';
      records.push(record);
    }
  }

  return records;
}
