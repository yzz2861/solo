import html2canvas from 'html2canvas';

export async function captureElement(element: HTMLElement): Promise<string> {
  try {
    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      backgroundColor: '#0D3B2E',
    });
    return canvas.toDataURL();
  } catch {
    return '';
  }
}
