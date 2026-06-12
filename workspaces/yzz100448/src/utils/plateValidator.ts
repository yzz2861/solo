export function validatePlateNumber(plate: string): boolean {
  if (!plate || plate.length < 7 || plate.length > 8) return false;
  
  const plateUpper = plate.toUpperCase();
  
  const normalPattern = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-Z0-9]{5}$/;
  const newEnergyPattern = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{6}$/;
  const policePattern = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][0-9]{4}[警]$/;
  
  return normalPattern.test(plateUpper) || 
         newEnergyPattern.test(plateUpper) || 
         policePattern.test(plateUpper);
}

export function formatPlateNumber(plate: string): string {
  return plate.toUpperCase().replace(/\s/g, '');
}
