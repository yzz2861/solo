const STORAGE_KEY = 'reverb_estimator_schemes_v1';
const MAX_SCHEMES = 5;

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

function defaultScheme(name = '默认方案') {
  return {
    id: uuid(),
    name,
    createdAt: Date.now(),
    units: 'metric',
    room: { L: 5.0, W: 4.0, H: 2.8 },
    surfaces: {
      north:   { materialId: 'gypsum_board_12mm', coverage: 1.0 },
      south:   { materialId: 'gypsum_board_12mm', coverage: 1.0 },
      east:    { materialId: 'gypsum_board_12mm', coverage: 1.0 },
      west:    { materialId: 'gypsum_board_12mm', coverage: 1.0 },
      floor:   { materialId: 'wood_floor',         coverage: 1.0 },
      ceiling: { materialId: 'suspended_gypsum',   coverage: 1.0 }
    },
    curtains: [],
    furniture: [],
    purpose: 'voice_studio',
    customTargetRT: null
  };
}

function loadSchemes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    console.warn('Failed to parse saved schemes', e);
    return [];
  }
}

function saveSchemes(schemes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes.slice(0, MAX_SCHEMES)));
    return true;
  } catch (e) {
    console.warn('Failed to save', e);
    return false;
  }
}

function addScheme(scheme) {
  const arr = loadSchemes();
  if (arr.length >= MAX_SCHEMES) {
    return { ok: false, reason: `最多保存 ${MAX_SCHEMES} 套方案，请先删除一套` };
  }
  scheme.id = scheme.id || uuid();
  scheme.createdAt = scheme.createdAt || Date.now();
  arr.push(scheme);
  saveSchemes(arr);
  return { ok: true, scheme };
}

function updateScheme(id, patch) {
  const arr = loadSchemes();
  const idx = arr.findIndex(s => s.id === id);
  if (idx < 0) return null;
  arr[idx] = { ...arr[idx], ...patch, id };
  saveSchemes(arr);
  return arr[idx];
}

function deleteScheme(id) {
  const arr = loadSchemes().filter(s => s.id !== id);
  saveSchemes(arr);
  return arr;
}

function cloneScheme(sourceId, newName) {
  const arr = loadSchemes();
  const source = arr.find(s => s.id === sourceId);
  if (!source) return null;
  if (arr.length >= MAX_SCHEMES) {
    return { ok: false, reason: `最多保存 ${MAX_SCHEMES} 套方案` };
  }
  const copy = JSON.parse(JSON.stringify(source));
  copy.id = uuid();
  copy.name = newName || (source.name + ' 副本');
  copy.createdAt = Date.now();
  arr.push(copy);
  saveSchemes(arr);
  return { ok: true, scheme: copy };
}

function exportJSON(schemes, filename = 'reverb_schemes.json') {
  const blob = new Blob([JSON.stringify(schemes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('文件结构错误');
        resolve(data);
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
