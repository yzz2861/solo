import type { StudioScheme, SchemeExport } from '@/types/scheme';

const SCHEMES_KEY = 'studio_schemes';
const CURRENT_SCHEME_KEY = 'studio_current_scheme';

export const loadSchemesFromStorage = (): StudioScheme[] => {
  try {
    const data = localStorage.getItem(SCHEMES_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load schemes:', e);
  }
  return [];
};

export const saveSchemesToStorage = (schemes: StudioScheme[]): void => {
  try {
    localStorage.setItem(SCHEMES_KEY, JSON.stringify(schemes));
  } catch (e) {
    console.error('Failed to save schemes:', e);
  }
};

export const loadCurrentSchemeIdFromStorage = (): string | null => {
  try {
    return localStorage.getItem(CURRENT_SCHEME_KEY);
  } catch (e) {
    return null;
  }
};

export const saveCurrentSchemeIdToStorage = (id: string | null): void => {
  try {
    if (id) {
      localStorage.setItem(CURRENT_SCHEME_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_SCHEME_KEY);
    }
  } catch (e) {
    console.error('Failed to save current scheme:', e);
  }
};

export const exportSchemeToJson = (scheme: StudioScheme): string => {
  const exportData: SchemeExport = {
    version: '1.0',
    scheme,
  };
  return JSON.stringify(exportData, null, 2);
};

export const importSchemeFromJson = (json: string): StudioScheme | null => {
  try {
    const data = JSON.parse(json) as SchemeExport;
    if (data.version && data.scheme) {
      return {
        ...data.scheme,
        id: data.scheme.id || generateSchemeId(),
      };
    }
    return null;
  } catch (e) {
    console.error('Failed to import scheme:', e);
    return null;
  }
};

export const generateSchemeId = (): string => {
  return `scheme-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

export const downloadJsonFile = (filename: string, content: string): void => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
