export function maskName(name: string): string {
  if (!name) return '同学';
  if (name.length <= 1) return '同学A';
  return name[0] + '同学';
}

export function maskStudentInfo(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  result = result.replace(/高一(\d+)班/g, '高一*班');
  result = result.replace(/高二(\d+)班/g, '高二*班');
  result = result.replace(/高三(\d+)班/g, '高三*班');
  result = result.replace(/初一(\d+)班/g, '初一*班');
  result = result.replace(/初二(\d+)班/g, '初二*班');
  result = result.replace(/初三(\d+)班/g, '初三*班');
  result = result.replace(/(\d+)年级(\d+)班/g, '*年级*班');
  result = result.replace(/(\d+)班/g, '*班');
  
  result = result.replace(/(学号|编号|ID)[:：]?\s*\d+/gi, '$1:***');
  
  result = result.replace(/1[3-9]\d{9}/g, '1**********');
  
  result = result.replace(/\d{4}[-/]\d{2}[-/]\d{2}/g, '****-**-**');
  
  result = result.replace(/(宿舍|寝室)[:：]?\s*\d+[号楼栋]?\s*\d+室/gi, '宿舍**');
  result = result.replace(/(宿舍|寝室)[:：]?\s*\d+/gi, '宿舍**');
  
  return result;
}

export function maskContent(content: string): string {
  if (!content) return '';
  
  let result = maskStudentInfo(content);
  
  const namePatterns = [
    /张[三丰]|李[四明]|王[五芳]|赵[六丽]/g,
    /同学[甲乙丙丁ABCD]/g,
  ];
  
  let counter = 0;
  result = result.replace(/(?:我|我的)[\u4e00-\u9fa5]{1,2}(?:同学|朋友|室友|老师|爸妈|父母|爸|妈|哥|姐|弟|妹)/g, (match) => {
    const suffix = match.match(/(同学|朋友|室友|老师|爸妈|父母|爸|妈|哥|姐|弟|妹)$/)?.[0] || '同学';
    const maskChar = String.fromCharCode(65 + (counter % 26));
    counter++;
    return `同学${maskChar}${suffix}`;
  });
  
  return result;
}
