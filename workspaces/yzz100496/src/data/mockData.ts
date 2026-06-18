import dayjs from 'dayjs';
import type { Trip, Registration, Reminder } from '@/types';
import { generateId, isIdExpired, calculateAgeOnDate, daysUntil } from '@/utils';

export const MOCK_TRIPS: Trip[] = [
  {
    id: 'trip-001',
    name: '三亚亲子海岛游 5天4晚',
    startDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(34, 'day').format('YYYY-MM-DD'),
    destination: '海南三亚',
    basePrice: 2980,
    minChildAge: 4,
    maxChildAge: 14,
    capacity: 30,
    status: 'upcoming',
    description: '阳光沙滩亲子之旅，含蜈支洲岛、南山文化苑',
  },
  {
    id: 'trip-002',
    name: '北京亲子研学游 6天5晚',
    startDate: dayjs().add(45, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(50, 'day').format('YYYY-MM-DD'),
    destination: '北京',
    basePrice: 3580,
    minChildAge: 6,
    maxChildAge: 16,
    capacity: 25,
    status: 'upcoming',
    description: '故宫、长城、清华北大名校探访',
  },
  {
    id: 'trip-003',
    name: '成都熊猫亲子游 4天3晚',
    startDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(18, 'day').format('YYYY-MM-DD'),
    destination: '四川成都',
    basePrice: 2380,
    minChildAge: 3,
    maxChildAge: 12,
    capacity: 20,
    status: 'upcoming',
    description: '大熊猫基地、都江堰、宽窄巷子',
  },
  {
    id: 'trip-004',
    name: '杭州自然探索营 5天4晚',
    startDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(64, 'day').format('YYYY-MM-DD'),
    destination: '浙江杭州',
    basePrice: 2680,
    minChildAge: 7,
    maxChildAge: 14,
    capacity: 24,
    status: 'upcoming',
    description: '西湖、西溪湿地、自然科学探索',
  },
];

export const MOCK_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-001',
    tripId: 'trip-001',
    tripName: '三亚亲子海岛游 5天4晚',
    departureDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    returnDate: dayjs().add(34, 'day').format('YYYY-MM-DD'),
    familyName: '张伟家庭',
    contactPhone: '13800138001',
    status: 'fully_paid',
    basePrice: 2980,
    totalAmount: 9540,
    depositAmount: 2862,
    finalPaymentAmount: 6678,
    finalPaymentDueDate: dayjs().add(23, 'day').format('YYYY-MM-DD'),
    members: [
      {
        id: 'mem-001',
        registrationId: 'reg-001',
        name: '张伟',
        relation: 'father',
        birthDate: '1985-05-12',
        gender: 'male',
        phone: '13800138001',
        isPrimary: true,
        idCard: {
          type: 'id_card',
          number: '110101198505121234',
          expiryDate: dayjs().add(365 * 5, 'day').format('YYYY-MM-DD'),
        },
      },
      {
        id: 'mem-002',
        registrationId: 'reg-001',
        name: '李娜',
        relation: 'mother',
        birthDate: '1987-08-23',
        gender: 'female',
        phone: '13900139002',
        isPrimary: false,
        idCard: {
          type: 'id_card',
          number: '110102198708235678',
          expiryDate: dayjs().add(365 * 3, 'day').format('YYYY-MM-DD'),
        },
      },
      {
        id: 'mem-003',
        registrationId: 'reg-001',
        name: '张明辉',
        relation: 'child',
        birthDate: dayjs().subtract(8, 'year').add(2, 'month').format('YYYY-MM-DD'),
        gender: 'male',
        isPrimary: false,
        idCard: {
          type: 'id_card',
          number: '110101201703151234',
          expiryDate: dayjs().add(365 * 2, 'day').format('YYYY-MM-DD'),
        },
        health: {
          allergies: '海鲜过敏',
          specialCare: '有哮喘，需随身携带喷雾剂',
        },
      },
    ],
    insurance: {
      planName: '标准保障计划',
      planType: 'standard',
      premiumPerPerson: 60,
      totalPremium: 180,
      insurer: '平安保险',
    },
    roomBooking: {
      roomType: '家庭房',
      roomCount: 1,
      roomPrice: 420,
      hasExtraBed: false,
    },
    contract: {
      status: 'signed',
      signedDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
      signedBy: '张伟',
      contractNo: 'HT202401001',
    },
    payments: [
      {
        id: 'pay-001',
        registrationId: 'reg-001',
        paymentType: 'deposit',
        amount: 2862,
        paymentMethod: 'wechat',
        paymentDate: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
        operator: '客服小王',
        receiptNumber: 'SK202401001',
      },
      {
        id: 'pay-002',
        registrationId: 'reg-001',
        paymentType: 'final',
        amount: 6678,
        paymentMethod: 'alipay',
        paymentDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
        operator: '客服小王',
        receiptNumber: 'SK202401002',
      },
    ],
    roomNo: '302',
    busNo: 'A车',
    createdAt: dayjs().subtract(10, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'reg-002',
    tripId: 'trip-001',
    tripName: '三亚亲子海岛游 5天4晚',
    departureDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    returnDate: dayjs().add(34, 'day').format('YYYY-MM-DD'),
    familyName: '王芳家庭',
    contactPhone: '13700137003',
    status: 'deposit_paid',
    basePrice: 2980,
    totalAmount: 6380,
    depositAmount: 1914,
    finalPaymentAmount: 4466,
    finalPaymentDueDate: dayjs().add(23, 'day').format('YYYY-MM-DD'),
    members: [
      {
        id: 'mem-004',
        registrationId: 'reg-002',
        name: '王芳',
        relation: 'mother',
        birthDate: '1988-11-15',
        gender: 'female',
        phone: '13700137003',
        isPrimary: true,
        idCard: {
          type: 'id_card',
          number: '310101198811159012',
          expiryDate: dayjs().add(365 * 4, 'day').format('YYYY-MM-DD'),
        },
      },
      {
        id: 'mem-005',
        registrationId: 'reg-002',
        name: '王思涵',
        relation: 'child',
        birthDate: dayjs().subtract(6, 'year').subtract(3, 'month').format('YYYY-MM-DD'),
        gender: 'female',
        isPrimary: false,
        idCard: {
          type: 'birth_certificate',
          number: '310101201809203456',
        },
        health: {
          dietaryRestrictions: '素食',
        },
      },
    ],
    insurance: {
      planName: '豪华保障计划',
      planType: 'premium',
      premiumPerPerson: 120,
      totalPremium: 240,
      insurer: '平安保险',
    },
    roomBooking: {
      roomType: '大床房',
      roomCount: 1,
      roomPrice: 320,
      hasExtraBed: false,
    },
    contract: {
      status: 'unsigned',
    },
    payments: [
      {
        id: 'pay-003',
        registrationId: 'reg-002',
        paymentType: 'deposit',
        amount: 1914,
        paymentMethod: 'bank_transfer',
        paymentDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
        operator: '客服小李',
        receiptNumber: 'SK202401003',
      },
    ],
    specialNotes: '孩子挑食，需要素食餐',
    roomNo: '205',
    busNo: 'A车',
    createdAt: dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'reg-003',
    tripId: 'trip-002',
    tripName: '北京亲子研学游 6天5晚',
    departureDate: dayjs().add(45, 'day').format('YYYY-MM-DD'),
    returnDate: dayjs().add(50, 'day').format('YYYY-MM-DD'),
    familyName: '陈强家庭',
    contactPhone: '13600136004',
    status: 'confirmed',
    basePrice: 3580,
    totalAmount: 10920,
    depositAmount: 3276,
    finalPaymentAmount: 7644,
    finalPaymentDueDate: dayjs().add(38, 'day').format('YYYY-MM-DD'),
    members: [
      {
        id: 'mem-006',
        registrationId: 'reg-003',
        name: '陈强',
        relation: 'father',
        birthDate: '1982-03-08',
        gender: 'male',
        phone: '13600136004',
        isPrimary: true,
        idCard: {
          type: 'id_card',
          number: '440101198203087890',
          expiryDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        },
      },
      {
        id: 'mem-007',
        registrationId: 'reg-003',
        name: '刘秀',
        relation: 'mother',
        birthDate: '1984-07-19',
        gender: 'female',
        phone: '13500135005',
        isPrimary: false,
        idCard: {
          type: 'id_card',
          number: '440102198407192345',
          expiryDate: dayjs().add(365 * 2, 'day').format('YYYY-MM-DD'),
        },
      },
      {
        id: 'mem-008',
        registrationId: 'reg-003',
        name: '陈思远',
        relation: 'child',
        birthDate: dayjs().subtract(10, 'year').subtract(5, 'month').format('YYYY-MM-DD'),
        gender: 'male',
        isPrimary: false,
        idCard: {
          type: 'id_card',
          number: '440101201502105678',
          expiryDate: dayjs().add(365, 'day').format('YYYY-MM-DD'),
        },
        health: {
          medicalConditions: '糖尿病',
          specialCare: '每天需注射胰岛素，需冷藏保存药品',
        },
      },
    ],
    insurance: {
      planName: '标准保障计划',
      planType: 'standard',
      premiumPerPerson: 60,
      totalPremium: 180,
      insurer: '平安保险',
    },
    roomBooking: {
      roomType: '三人间',
      roomCount: 1,
      roomPrice: 380,
      hasExtraBed: false,
    },
    contract: {
      status: 'signed',
      signedDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      signedBy: '陈强',
      contractNo: 'HT202401004',
    },
    payments: [],
    roomNo: '501',
    busNo: 'B车',
    createdAt: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'reg-004',
    tripId: 'trip-003',
    tripName: '成都熊猫亲子游 4天3晚',
    departureDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    returnDate: dayjs().add(18, 'day').format('YYYY-MM-DD'),
    familyName: '赵明家庭',
    contactPhone: '13400134006',
    status: 'cancelled',
    basePrice: 2380,
    totalAmount: 5060,
    depositAmount: 1518,
    finalPaymentAmount: 3542,
    finalPaymentDueDate: dayjs().add(8, 'day').format('YYYY-MM-DD'),
    members: [
      {
        id: 'mem-009',
        registrationId: 'reg-004',
        name: '赵明',
        relation: 'father',
        birthDate: '1986-09-25',
        gender: 'male',
        phone: '13400134006',
        isPrimary: true,
        idCard: {
          type: 'id_card',
          number: '510101198609256789',
          expiryDate: dayjs().add(365 * 6, 'day').format('YYYY-MM-DD'),
        },
      },
      {
        id: 'mem-010',
        registrationId: 'reg-004',
        name: '赵欣怡',
        relation: 'child',
        birthDate: dayjs().subtract(5, 'year').subtract(8, 'month').format('YYYY-MM-DD'),
        gender: 'female',
        isPrimary: false,
        idCard: {
          type: 'id_card',
          number: '510101201910151234',
          expiryDate: dayjs().add(365 * 3, 'day').format('YYYY-MM-DD'),
        },
      },
    ],
    insurance: {
      planName: '基础保障计划',
      planType: 'basic',
      premiumPerPerson: 30,
      totalPremium: 60,
      insurer: '平安保险',
    },
    roomBooking: {
      roomType: '标准双人房',
      roomCount: 1,
      roomPrice: 280,
      hasExtraBed: false,
    },
    contract: {
      status: 'signed',
      signedDate: dayjs().subtract(15, 'day').format('YYYY-MM-DD'),
      signedBy: '赵明',
      contractNo: 'HT202401005',
    },
    payments: [
      {
        id: 'pay-004',
        registrationId: 'reg-004',
        paymentType: 'deposit',
        amount: 1518,
        paymentMethod: 'wechat',
        paymentDate: dayjs().subtract(15, 'day').format('YYYY-MM-DD'),
        operator: '客服小王',
        receiptNumber: 'SK202401005',
      },
    ],
    refund: {
      id: 'ref-001',
      registrationId: 'reg-004',
      refundDate: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
      refundAmount: 759,
      deductionAmount: 759,
      deductionReason: '出发前15-29天，扣50%',
      refundMethod: 'wechat',
      status: 'completed',
      operator: '财务小张',
    },
    specialNotes: '孩子想看熊猫',
    createdAt: dayjs().subtract(20, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    id: 'reg-005',
    tripId: 'trip-001',
    tripName: '三亚亲子海岛游 5天4晚',
    departureDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
    returnDate: dayjs().add(34, 'day').format('YYYY-MM-DD'),
    familyName: '刘建国家庭',
    contactPhone: '13300133007',
    status: 'pending',
    basePrice: 2980,
    totalAmount: 12380,
    depositAmount: 3714,
    finalPaymentAmount: 8666,
    finalPaymentDueDate: dayjs().add(23, 'day').format('YYYY-MM-DD'),
    members: [
      {
        id: 'mem-011',
        registrationId: 'reg-005',
        name: '刘建国',
        relation: 'grandpa',
        birthDate: '1958-12-01',
        gender: 'male',
        phone: '13300133007',
        isPrimary: true,
        idCard: {
          type: 'id_card',
          number: '320101195812011234',
          expiryDate: dayjs().subtract(365, 'day').format('YYYY-MM-DD'),
        },
      },
      {
        id: 'mem-012',
        registrationId: 'reg-005',
        name: '张桂兰',
        relation: 'grandma',
        birthDate: '1960-05-15',
        gender: 'female',
        isPrimary: false,
        idCard: {
          type: 'id_card',
          number: '320102196005155678',
          expiryDate: dayjs().add(365 * 3, 'day').format('YYYY-MM-DD'),
        },
        health: {
          medicalConditions: '高血压、心脏病',
          specialCare: '行动不便，需安排低楼层房间',
        },
      },
      {
        id: 'mem-013',
        registrationId: 'reg-005',
        name: '刘子轩',
        relation: 'child',
        birthDate: dayjs().subtract(7, 'year').subtract(2, 'month').format('YYYY-MM-DD'),
        gender: 'male',
        isPrimary: false,
        idCard: {
          type: 'id_card',
          number: '320101201704203456',
          expiryDate: dayjs().add(365 * 4, 'day').format('YYYY-MM-DD'),
        },
      },
      {
        id: 'mem-014',
        registrationId: 'reg-005',
        name: '刘紫涵',
        relation: 'child',
        birthDate: dayjs().subtract(9, 'year').subtract(6, 'month').format('YYYY-MM-DD'),
        gender: 'female',
        isPrimary: false,
        idCard: {
          type: 'id_card',
          number: '320101201512107890',
          expiryDate: dayjs().add(365 * 3, 'day').format('YYYY-MM-DD'),
        },
      },
    ],
    insurance: {
      planName: '标准保障计划',
      planType: 'standard',
      premiumPerPerson: 60,
      totalPremium: 240,
      insurer: '平安保险',
    },
    roomBooking: {
      roomType: '家庭房',
      roomCount: 2,
      roomPrice: 420,
      hasExtraBed: false,
      sharingRequest: '祖孙同住，尽量安排相邻房间',
    },
    contract: {
      status: 'unsigned',
    },
    payments: [],
    specialNotes: '两位老人行动不便，请尽量安排低楼层或电梯方便的房间',
    busNo: 'B车',
    createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    updatedAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
  },
];

export function generateReminders(registrations: Registration[], trips: Trip[]): Reminder[] {
  const reminders: Reminder[] = [];

  for (const reg of registrations) {
    const trip = trips.find(t => t.id === reg.tripId);
    
    if (reg.status === 'cancelled' || reg.status === 'refunded' || reg.status === 'departed') {
      continue;
    }

    for (const member of reg.members) {
      if (member.idCard?.expiryDate) {
        const expiryCheck = isIdExpired(member.idCard.expiryDate, reg.departureDate, reg.returnDate);
        
        if (expiryCheck.expired) {
          reminders.push({
            id: generateId('rem'),
            type: 'id_expiry',
            level: 'error',
            title: `${member.name} 的证件已过期`,
            description: `${expiryCheck.message}，请及时更新证件信息`,
            registrationId: reg.id,
            registrationName: reg.familyName,
            relatedMemberId: member.id,
            relatedMemberName: member.name,
            date: member.idCard.expiryDate,
            createdAt: new Date().toISOString(),
            read: false,
          });
        } else if (expiryCheck.expiringSoon) {
          reminders.push({
            id: generateId('rem'),
            type: 'id_expiry',
            level: 'warning',
            title: `${member.name} 的证件即将过期`,
            description: `${expiryCheck.message}，建议提醒客户更新`,
            registrationId: reg.id,
            registrationName: reg.familyName,
            relatedMemberId: member.id,
            relatedMemberName: member.name,
            date: member.idCard.expiryDate,
            createdAt: new Date().toISOString(),
            read: false,
          });
        }
      } else {
        reminders.push({
          id: generateId('rem'),
          type: 'document_missing',
          level: 'warning',
          title: `${member.name} 缺少证件信息`,
          description: '请补录证件号码和有效期',
          registrationId: reg.id,
          registrationName: reg.familyName,
          relatedMemberId: member.id,
          relatedMemberName: member.name,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }

    if (trip) {
      for (const member of reg.members) {
        if (member.relation === 'child') {
          const age = calculateAgeOnDate(member.birthDate, trip.startDate);
          if (age < trip.minChildAge || age > trip.maxChildAge) {
            reminders.push({
              id: generateId('rem'),
              type: 'age_mismatch',
              level: 'error',
              title: `${member.name} 年龄不符合项目要求`,
              description: `孩子年龄 ${age} 岁，项目要求 ${trip.minChildAge}-${trip.maxChildAge}岁，请确认是否可以参团`,
              registrationId: reg.id,
              registrationName: reg.familyName,
              relatedMemberId: member.id,
              relatedMemberName: member.name,
              createdAt: new Date().toISOString(),
              read: false,
            });
          }
        }
      }
    }

    if (reg.contract.status !== 'signed' && reg.status !== 'pending') {
      const hasFinalPayment = reg.payments.some(p => p.paymentType === 'final' || p.amount >= reg.depositAmount);
      if (hasFinalPayment) {
        reminders.push({
          id: generateId('rem'),
          type: 'contract_unsigned',
          level: 'error',
          title: `${reg.familyName} 合同未签署但已收款`,
          description: '风险提醒：已收到款项但合同未签署，请尽快补签合同',
          registrationId: reg.id,
          registrationName: reg.familyName,
          createdAt: new Date().toISOString(),
          read: false,
        });
      } else {
        reminders.push({
          id: generateId('rem'),
          type: 'contract_unsigned',
          level: 'warning',
          title: `${reg.familyName} 合同待签署`,
          description: '请提醒客户签署电子合同',
          registrationId: reg.id,
          registrationName: reg.familyName,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }

    const daysUntilDeparture = daysUntil(reg.departureDate);
    if (daysUntilDeparture <= 7 && daysUntilDeparture > 0 && reg.status !== 'fully_paid') {
      reminders.push({
        id: generateId('rem'),
        type: 'final_payment_due',
        level: 'warning',
        title: `${reg.familyName} 尾款即将到期`,
        description: `距离出发还有 ${daysUntilDeparture} 天，尾款截止日：${reg.finalPaymentDueDate}`,
        registrationId: reg.id,
        registrationName: reg.familyName,
        date: reg.finalPaymentDueDate,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  }

  return reminders;
}
