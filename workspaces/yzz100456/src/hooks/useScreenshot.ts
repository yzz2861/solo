import { useCallback } from 'react';
import { usePlanStore } from './usePlanStore';

export const useScreenshot = () => {
  const setScreenshot = usePlanStore((s) => s.setScreenshot);
  const canvasRef = usePlanStore((s) => s.canvasRef);

  const capture = useCallback((): string | null => {
    if (!canvasRef) return null;
    try {
      const dataUrl = canvasRef.toDataURL('image/png');
      setScreenshot(dataUrl);
      return dataUrl;
    } catch (e) {
      console.error('截图失败:', e);
      return null;
    }
  }, [canvasRef, setScreenshot]);

  const downloadAsFile = useCallback((filename = 'risk-screenshot.png') => {
    const data = capture();
    if (!data) return;
    const a = document.createElement('a');
    a.href = data;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [capture]);

  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    const data = capture();
    if (!data) return false;
    try {
      const blob = await (await fetch(data)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch (e) {
      console.error('复制剪贴板失败:', e);
      return false;
    }
  }, [capture]);

  return { capture, downloadAsFile, copyToClipboard };
};
