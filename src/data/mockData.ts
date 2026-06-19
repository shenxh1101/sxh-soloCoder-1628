import {
  Groomer,
  Service,
  RechargeRule,
  Member,
  Pet,
  Appointment,
  RechargeRecord,
  ConsumptionRecord,
  PointsRecord,
  ExchangeRecord,
} from '@/types';
import { addDays, addHours, addMinutes, startOfDay, format, subDays } from 'date-fns';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const initGroomers = (): Groomer[] => [
  { id: 'g1', name: '小美', phone: '13800000001', isActive: true },
  { id: 'g2', name: '阿杰', phone: '13800000002', isActive: true },
  { id: 'g3', name: 'Lily', phone: '13800000003', isActive: true },
];

export const initServices = (): Service[] => [
  { id: 's1', name: '基础洗澡', category: '基础洗护', duration: 60, price: 88, isActive: true, pointsCost: 500 },
  { id: 's2', name: '精致洗澡', category: '基础洗护', duration: 90, price: 138, isActive: true, pointsCost: 800 },
  { id: 's3', name: '泰迪造型', category: '造型修剪', duration: 120, price: 198, isActive: true, pointsCost: 1200 },
  { id: 's4', name: '比熊造型', category: '造型修剪', duration: 150, price: 238, isActive: true, pointsCost: 1500 },
  { id: 's5', name: '金毛洗护', category: '基础洗护', duration: 120, price: 228, isActive: true, pointsCost: 1300 },
  { id: 's6', name: 'SPA护理', category: 'SPA护理', duration: 90, price: 288, isActive: true, pointsCost: 1800 },
  { id: 's7', name: '药浴护理', category: 'SPA护理', duration: 80, price: 168, isActive: true, pointsCost: 1000 },
];

export const initRechargeRules = (): RechargeRule[] => [
  {
    id: 'r1',
    amount: 300,
    bonusAmount: 0,
    bonusCredits: [{ serviceId: 's1', count: 1, serviceName: '基础洗澡' }],
    isActive: true,
    tag: '新手推荐',
  },
  {
    id: 'r2',
    amount: 500,
    bonusAmount: 100,
    bonusCredits: [{ serviceId: 's1', count: 3, serviceName: '基础洗澡' }],
    isActive: true,
    tag: '最受欢迎',
  },
  {
    id: 'r3',
    amount: 1000,
    bonusAmount: 800,
    bonusCredits: [{ serviceId: 's3', count: 5, serviceName: '泰迪造型' }],
    isActive: true,
    tag: '超级划算',
  },
];

export const initMembers = (): Member[] => [
  {
    id: 'm1',
    name: '张女士',
    phone: '13911110001',
    balance: 520,
    points: 1280,
    level: '金卡',
    serviceCredits: [{ serviceId: 's1', count: 2 }],
    createdAt: subDays(new Date(), 90).toISOString(),
  },
  {
    id: 'm2',
    name: '李先生',
    phone: '13911110002',
    balance: 300,
    points: 680,
    level: '银卡',
    serviceCredits: [],
    createdAt: subDays(new Date(), 45).toISOString(),
  },
  {
    id: 'm3',
    name: '王小姐',
    phone: '13911110003',
    balance: 1580,
    points: 3200,
    level: '钻石',
    serviceCredits: [
      { serviceId: 's1', count: 3 },
      { serviceId: 's3', count: 2 },
    ],
    createdAt: subDays(new Date(), 180).toISOString(),
  },
  {
    id: 'm4',
    name: '陈先生',
    phone: '13911110004',
    balance: 88,
    points: 150,
    level: '普通',
    serviceCredits: [],
    createdAt: subDays(new Date(), 15).toISOString(),
  },
];

export const initPets = (): Pet[] => [
  { id: 'p1', memberId: 'm1', name: '豆豆', breed: '泰迪', gender: '公', weight: 5.2, birthday: '2022-03-15', notes: '耳朵敏感，洗澡时请注意' },
  { id: 'p2', memberId: 'm2', name: '大黄', breed: '金毛', gender: '公', weight: 28, birthday: '2020-08-20', notes: '体型大，需要美容师阿杰' },
  { id: 'p3', memberId: 'm3', name: '棉花糖', breed: '比熊', gender: '母', weight: 4.5, birthday: '2021-12-01', notes: '爱美，喜欢扎小辫子' },
  { id: 'p4', memberId: 'm3', name: '奶糖', breed: '柯基', gender: '母', weight: 11, birthday: '2023-05-10' },
  { id: 'p5', memberId: 'm4', name: '黑妞', breed: '中华田园犬', gender: '母', weight: 8, birthday: '2023-01-01' },
];

const baseDate = startOfDay(new Date());

export const initAppointments = (): Appointment[] => [
  {
    id: 'a1',
    memberId: 'm1',
    petId: 'p1',
    serviceId: 's3',
    groomerId: 'g1',
    startAt: addHours(addDays(baseDate, 0), 10).toISOString(),
    endAt: addHours(addDays(baseDate, 0), 12).toISOString(),
    status: 'confirmed',
    notes: '造型保持上次风格',
    smsStatus: 'sent',
    createdAt: subDays(new Date(), 1).toISOString(),
  },
  {
    id: 'a2',
    memberId: 'm2',
    petId: 'p2',
    serviceId: 's5',
    groomerId: 'g2',
    startAt: addHours(addDays(baseDate, 0), 14).toISOString(),
    endAt: addHours(addDays(baseDate, 0), 16).toISOString(),
    status: 'pending',
    smsStatus: 'pending',
    createdAt: subDays(new Date(), 2).toISOString(),
  },
  {
    id: 'a3',
    memberId: 'm3',
    petId: 'p3',
    serviceId: 's4',
    groomerId: 'g3',
    startAt: addHours(addDays(baseDate, 0), 11).toISOString(),
    endAt: addHours(addMinutes(addDays(baseDate, 0), 30), 13).toISOString(),
    status: 'in_service',
    smsStatus: 'sent',
    createdAt: subDays(new Date(), 3).toISOString(),
  },
  {
    id: 'a4',
    memberId: 'm3',
    petId: 'p4',
    serviceId: 's1',
    groomerId: 'g1',
    startAt: addHours(addDays(baseDate, 1), 9).toISOString(),
    endAt: addHours(addDays(baseDate, 1), 10).toISOString(),
    status: 'confirmed',
    smsStatus: 'pending',
    createdAt: subDays(new Date(), 1).toISOString(),
  },
  {
    id: 'a5',
    memberId: 'm4',
    petId: 'p5',
    serviceId: 's1',
    groomerId: 'g2',
    startAt: addHours(addDays(baseDate, 1), 15).toISOString(),
    endAt: addHours(addDays(baseDate, 1), 16).toISOString(),
    status: 'pending',
    smsStatus: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'a6',
    memberId: 'm1',
    petId: 'p1',
    serviceId: 's6',
    groomerId: 'g3',
    startAt: addHours(addDays(baseDate, 2), 13).toISOString(),
    endAt: addHours(addDays(baseDate, 2), 14).toISOString(),
    status: 'confirmed',
    smsStatus: 'pending',
    notes: '做个SPA放松一下',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'a7',
    memberId: 'm2',
    petId: 'p2',
    serviceId: 's7',
    groomerId: 'g2',
    startAt: addHours(addDays(baseDate, 3), 10).toISOString(),
    endAt: addHours(addMinutes(addDays(baseDate, 3), 20), 11).toISOString(),
    status: 'pending',
    smsStatus: 'pending',
    createdAt: new Date().toISOString(),
  },
];

export const initRechargeRecords = (): RechargeRecord[] => {
  const records: RechargeRecord[] = [];
  for (let i = 0; i < 18; i++) {
    const day = Math.floor(Math.random() * 30);
    const ruleIdx = Math.floor(Math.random() * 3);
    const rules = initRechargeRules();
    const rule = rules[ruleIdx];
    const members = ['m1', 'm2', 'm3', 'm4'];
    records.push({
      id: uid(),
      memberId: members[Math.floor(Math.random() * members.length)],
      ruleId: rule.id,
      amount: rule.amount,
      bonusAmount: rule.bonusAmount,
      paymentMethod: (['微信', '支付宝', '现金'] as const)[Math.floor(Math.random() * 3)],
      createdAt: subDays(new Date(), day).toISOString(),
    });
  }
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const initConsumptionRecords = (): ConsumptionRecord[] => {
  const records: ConsumptionRecord[] = [];
  const services = initServices();
  const members = [
    { id: 'm1', pets: ['p1'] },
    { id: 'm2', pets: ['p2'] },
    { id: 'm3', pets: ['p3', 'p4'] },
    { id: 'm4', pets: ['p5'] },
  ];
  const groomers = ['g1', 'g2', 'g3'];
  const payTypes = ['balance', 'credit', 'wechat', 'cash'] as const;

  for (let i = 0; i < 35; i++) {
    const day = Math.floor(Math.random() * 30);
    const member = members[Math.floor(Math.random() * members.length)];
    const pet = member.pets[Math.floor(Math.random() * member.pets.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const payType = payTypes[Math.floor(Math.random() * payTypes.length)];
    records.push({
      id: uid(),
      memberId: member.id,
      petId: pet,
      serviceId: service.id,
      groomerId: groomers[Math.floor(Math.random() * groomers.length)],
      amount: service.price,
      payType,
      pointsEarned: service.price,
      createdAt: format(subDays(new Date(), day), 'yyyy-MM-dd') + ' ' + (9 + Math.floor(Math.random() * 8)) + ':' + String(Math.floor(Math.random() * 60)).padStart(2, '0') + ':00',
      notes: Math.random() > 0.7 ? '服务完成，客户满意' : undefined,
    });
  }
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const initPointsRecords = (): PointsRecord[] => {
  const records: PointsRecord[] = [];
  const consumptions = initConsumptionRecords();
  for (const c of consumptions) {
    records.push({
      id: uid(),
      memberId: c.memberId,
      type: 'earn',
      points: c.pointsEarned,
      reason: '服务消费积分',
      refId: c.id,
      createdAt: c.createdAt,
    });
  }
  const members = ['m1', 'm3'];
  for (let i = 0; i < 4; i++) {
    records.push({
      id: uid(),
      memberId: members[i % 2],
      type: 'spend',
      points: [500, 800, 1200][i % 3],
      reason: ['兑换基础洗澡', '兑换宠物零食礼包', '兑换精致洗澡'][i % 3],
      createdAt: subDays(new Date(), Math.floor(Math.random() * 25)).toISOString(),
    });
  }
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const initExchangeRecords = (): ExchangeRecord[] => [
  {
    id: uid(),
    memberId: 'm1',
    itemType: 'service',
    itemName: '基础洗澡',
    itemId: 's1',
    pointsCost: 500,
    createdAt: subDays(new Date(), 8).toISOString(),
  },
  {
    id: uid(),
    memberId: 'm3',
    itemType: 'product',
    itemName: '宠物零食礼包',
    pointsCost: 300,
    createdAt: subDays(new Date(), 15).toISOString(),
  },
  {
    id: uid(),
    memberId: 'm3',
    itemType: 'service',
    itemName: '精致洗澡',
    itemId: 's2',
    pointsCost: 800,
    createdAt: subDays(new Date(), 20).toISOString(),
  },
];

export const uidFn = uid;
