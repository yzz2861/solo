import { VoicePart, VoicePartInfo } from '../types';

export const voicePartList: VoicePartInfo[] = [
  { key: 'soprano', name: '女高音', color: 'bg-pink-100 text-pink-800' },
  { key: 'alto', name: '女低音', color: 'bg-purple-100 text-purple-800' },
  { key: 'tenor', name: '男高音', color: 'bg-blue-100 text-blue-800' },
  { key: 'bass', name: '男低音', color: 'bg-indigo-100 text-indigo-800' },
];

export const getVoicePartName = (part: VoicePart): string => {
  const info = voicePartList.find(v => v.key === part);
  return info ? info.name : part;
};

export const getVoicePartColor = (part: VoicePart): string => {
  const info = voicePartList.find(v => v.key === part);
  return info ? info.color : 'bg-gray-100 text-gray-800';
};

export const getVoicePartBadgeClass = (part: VoicePart): string => {
  const colorMap: Record<VoicePart, string> = {
    soprano: 'bg-pink-500',
    alto: 'bg-purple-500',
    tenor: 'bg-blue-500',
    bass: 'bg-indigo-500',
  };
  return colorMap[part];
};

export const voicePartOrder: VoicePart[] = ['soprano', 'alto', 'tenor', 'bass'];
