import type { ArchiveRecord, ExtractedField, FieldType } from '@/types';
import { generateId } from '@/utils/common';

const mockNames = [
  '张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十',
  '郑成功', '戚继光', '林则徐', '邓世昌', '孙中山', '黄兴', '宋教仁', '章太炎',
  '李大钊', '陈独秀', '鲁迅', '郭沫若', '矛盾', '巴金', '老舍', '曹禺',
  '張三', '李四', '王偉', '趙明', '陳亮', '劉強', '周傑', '吳京'
];

const mockDates = [
  '1956年10月15日',
  '1963年3月8日',
  '1978年12月18日',
  '1985年5月20日',
  '1992年9月1日',
  '2001年7月13日',
  '2008年8月8日',
  '2019年10月1日',
  '民國三十八年十月一日',
  '民國五十年三月八日',
  '1949-10-01',
  '1978/12/18',
  '2000.01.01'
];

const mockDocumentNumbers = [
  '人字第1234号',
  '档字第5678号',
  '案字第9012号',
  '政字第3456号',
  '经字第7890号',
  '外字第1122号',
  'HK-2023-00156',
  'BJ-1999-08877',
  'SH201005060023',
  'GZ-2015-A089'
];

const mockMaterialTypes = [
  '个人简历', '申请表', '证明材料', '合同协议', '判决书',
  '通知书', '决定', '证书', '介绍信', '登记表'
];

const mockOcrTexts = [
  `姓名：张三
性别：男
出生日期：1956年10月15日
身份证号：110101195610150011
住址：北京市东城区王府井大街1号
工作单位：北京市第一中学
职务：教师
参加工作时间：1978年12月
入党时间：1980年7月
学历：大学本科
专业：汉语言文学
职称：高级教师
本人简历：
1963年9月-1969年7月 北京市第一小学 学生
1969年9月-1975年7月 北京市第一中学 学生
1975年8月-1978年8月 北京市顺义县 插队知青
1978年9月-1982年7月 北京大学中文系 学生
1982年8月-至今 北京市第一中学 教师

北京市第一中学
1995年5月20日
（公章）`,

  `申请报告
申请人：李四
申请日期：1963年3月8日
申请事项：关于解决住房困难的申请
尊敬的领导：
我叫李四，是本厂第三车间的工人。我家庭人口多，现有住房只有15平方米，居住十分困难。现根据国家有关政策，申请分配一套住房。
我参加工作20年来，一直勤勤恳恳，多次被评为先进工作者。希望领导能考虑我的实际困难，批准我的申请。
此致
敬礼
申请人：李四
1963年3月8日
车间意见：情况属实，同意上报。
车间主任：王建国 1963年3月10日
厂领导批示：
同意分配两居室住房一套。
厂长：赵刚
1963年3月15日
（公章）
人字第1234号`,

  `证明材料
兹证明王五同志，男，1978年12月18日出生，汉族，大学本科学历，1999年7月参加工作，2001年10月加入中国共产党。
该同志政治立场坚定，思想品德良好，工作认真负责，业务能力强，群众关系好。无任何违法违纪行为。
特此证明。
单位名称：中华人民共和国教育部
2008年8月8日
（公章）
档字第5678号
经办人：陈明
电话：010-66096114`,

  `房屋买卖合同
合同编号：房字第8888号
签订日期：2001年7月13日
甲方（卖方）：赵六
身份证号：110102195001010011
住址：北京市西城区西长安街1号
乙方（买方）：孙七
身份证号：110105197505050022
住址：北京市朝阳区建国门外大街1号
根据《中华人民共和国合同法》及有关法律、法规的规定，甲乙双方在平等、自愿、协商一致的基础上，就房屋买卖事宜达成如下协议：
一、房屋基本情况
甲方自愿将座落在北京市海淀区中关村大街1号的房屋（房屋所有权证号：京房权证海字第12345号）出售给乙方。该房屋建筑面积100平方米，使用面积80平方米。
二、房屋价格
双方约定上述房屋成交价格为人民币伍拾万元整（￥500,000.00）。
三、付款方式
乙方应在本合同签订之日起10日内，一次性将全部购房款支付给甲方。
四、房屋交付
甲方应在收到全部购房款后30日内，将房屋交付给乙方。
五、产权过户
双方应在本合同签订后60日内，共同到房屋管理部门办理产权过户手续。
六、违约责任
任何一方违反本合同约定，应向对方支付购房款的10%作为违约金。
七、争议解决
本合同在履行过程中发生的争议，由双方协商解决；协商不成的，可向房屋所在地人民法院起诉。
八、其他约定事项
九、本合同自双方签字之日起生效。本合同一式三份，甲乙双方各执一份，房屋管理部门存档一份。
甲方（签字）：赵六
乙方（签字）：孙七
见证人（签字）：周八
签订地点：北京市海淀区公证处
2001年7月13日
（公证处公章）`,

  `北京市海淀区人民法院
民事判决书
（2019）海民初字第10086号
原告：钱九，男，1965年5月5日出生，汉族，住北京市海淀区中关村大街1号。
委托代理人：郑律师，北京市某某律师事务所律师。
被告：吴十，男，1970年10月10日出生，汉族，住北京市朝阳区建国路88号。
原告钱九与被告吴十房屋买卖合同纠纷一案，本院受理后，依法组成合议庭，公开开庭进行了审理。原告钱九及其委托代理人郑律师、被告吴十到庭参加诉讼。本案现已审理终结。
原告诉称：2018年1月1日，原被告签订房屋买卖合同，约定原告购买被告所有的位于北京市海淀区中关村大街1号的房屋一套，价格500万元。原告依约支付了全部购房款，但被告至今未协助原告办理产权过户手续。故起诉要求被告继续履行合同，协助办理过户手续，并支付违约金50万元。
被告辩称：同意继续履行合同，但目前无法协助过户，因为房屋有银行抵押贷款未还清。
经审理查明：2018年1月1日，原被告签订房屋买卖合同...
本院认为：依法成立的合同，对当事人具有法律约束力...
判决如下：
一、被告吴十于本判决生效后十日内，协助原告钱九办理北京市海淀区中关村大街1号房屋的产权过户手续；
二、被告吴十于本判决生效后十日内，给付原告钱九违约金50万元。
如果未按本判决指定的期间履行给付金钱义务，应当依照《中华人民共和国民事诉讼法》第二百五十三条之规定，加倍支付迟延履行期间的债务利息。
案件受理费46,800元，由被告吴十负担（于本判决生效后七日内交纳）。
如不服本判决，可在判决书送达之日起十五日内，向本院递交上诉状，并按对方当事人的人数提出副本，上诉于北京市第一中级人民法院。
审判长：王明
审判员：李华
审判员：张伟
二〇一九年十月一日
书记员：刘小
（北京市海淀区人民法院公章）
案字第9012号
第1页 / 共5页`
];

const generateField = (
  recordId: string,
  fieldName: FieldType,
  value: string,
  confidence: number,
  isLowConfidence: boolean = false,
  isAmbiguous: boolean = false,
  ambiguousMatches?: string[]
): ExtractedField => ({
  id: generateId(),
  recordId,
  fieldName,
  ocrValue: value,
  confidence,
  isLowConfidence,
  source: 'ocr',
  isAmbiguous,
  ambiguousMatches
});

export const generateMockRecords = (projectId: string, count: number = 20): ArchiveRecord[] => {
  const records: ArchiveRecord[] = [];
  
  for (let i = 0; i < count; i++) {
    const recordId = generateId();
    const nameIndex = i % mockNames.length;
    const dateIndex = i % mockDates.length;
    const numIndex = i % mockDocumentNumbers.length;
    const typeIndex = i % mockMaterialTypes.length;
    const ocrIndex = i % mockOcrTexts.length;
    
    const nameConfidence = i % 5 === 0 ? 0.45 : (0.75 + Math.random() * 0.2);
    const dateConfidence = i % 4 === 0 ? 0.35 : (0.8 + Math.random() * 0.15);
    const numConfidence = i % 6 === 0 ? 0.4 : (0.7 + Math.random() * 0.25);
    const pageConfidence = i % 8 === 0 ? 0.5 : (0.85 + Math.random() * 0.1);
    const typeConfidence = i % 10 === 0 ? 0.55 : (0.75 + Math.random() * 0.2);
    
    const fields: ExtractedField[] = [
      generateField(
        recordId,
        'name',
        mockNames[nameIndex],
        nameConfidence,
        nameConfidence < 0.6,
        nameIndex > 15,
        nameIndex > 15 ? [mockNames[(nameIndex + 3) % mockNames.length]] : undefined
      ),
      generateField(
        recordId,
        'date',
        mockDates[dateIndex],
        dateConfidence,
        dateConfidence < 0.6
      ),
      generateField(
        recordId,
        'documentNumber',
        mockDocumentNumbers[numIndex],
        numConfidence,
        numConfidence < 0.6,
        i % 7 === 0,
        i % 7 === 0 ? [mockDocumentNumbers[(numIndex + 2) % mockDocumentNumbers.length]] : undefined
      ),
      generateField(
        recordId,
        'pageNumber',
        (i + 1).toString(),
        pageConfidence,
        pageConfidence < 0.6
      ),
      generateField(
        recordId,
        'materialType',
        mockMaterialTypes[typeIndex],
        typeConfidence,
        typeConfidence < 0.6
      )
    ];
    
    const overallConfidence = fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length;
    
    let pageNumber = i + 1;
    if (i === 5) pageNumber = 7;
    if (i === 12) pageNumber = 15;
    
    const record: ArchiveRecord = {
      id: recordId,
      projectId,
      photoPath: `photos/档案照片_${String(i + 1).padStart(4, '0')}.jpg`,
      photoFileName: `档案照片_${String(i + 1).padStart(4, '0')}.jpg`,
      ocrText: mockOcrTexts[ocrIndex],
      overallConfidence,
      status: i < 5 ? 'corrected' : (i < 10 ? 'reviewing' : 'pending'),
      pageNumber,
      fields,
      hasMissingPage: i === 5 || i === 12,
      missingPageReason: i === 5 ? '页码跳号，缺失第6页' : (i === 12 ? '页码跳号，缺失第13-14页' : undefined),
      hasSameNameWarning: i === 0 || i === 16,
      sameNameRecordIds: i === 0 ? [records[16]?.id] : (i === 16 ? [records[0]?.id] : undefined),
      createdAt: Date.now() - (count - i) * 1000 * 60,
      updatedAt: Date.now() - (count - i) * 1000 * 60,
      reviewNotes: i === 2 ? '已与原件核对，确认无误' : undefined
    };
    
    records.push(record);
    
    if (i === 0 && records[16]) {
      records[0].sameNameRecordIds = [records[16].id];
    }
  }
  
  return records;
};

export const generateMockProject = () => {
  const projectId = generateId();
  const records = generateMockRecords(projectId, 20);
  
  const lowConfidenceCount = records.filter(r => r.fields.some(f => f.isLowConfidence)).length;
  const missingPageCount = records.filter(r => r.hasMissingPage).length;
  
  return {
    project: {
      id: projectId,
      name: '1990-2000年度人事档案数字化项目',
      description: '某单位1990年至2000年期间人事档案材料数字化校对项目，共包含20份档案材料。',
      recordCount: records.length,
      lowConfidenceCount,
      missingPageCount,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 3600000,
      lastImportedAt: Date.now() - 7200000,
      status: 'ready' as const,
      progress: 35
    },
    records
  };
};

export default {
  generateMockRecords,
  generateMockProject
};
