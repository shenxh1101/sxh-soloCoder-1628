export type AppointmentStatus = 'pending' | 'confirmed' | 'in_service' | 'completed' | 'cancelled';
export type MemberLevel = '普通' | '银卡' | '金卡' | '钻石';
export type ServiceCategory = '基础洗护' | '造型修剪' | 'SPA护理' | '其他';
export type PaymentMethod = '现金' | '微信' | '支付宝' | '刷卡';
export type PayType = 'balance' | 'credit' | 'cash' | 'wechat' | 'alipay';

export interface Groomer {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  duration: number;
  price: number;
  isActive: boolean;
  pointsCost?: number;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  gender?: '男' | '女';
  notes?: string;
  balance: number;
  points: number;
  level: MemberLevel;
  serviceCredits: { serviceId: string; count: number }[];
  createdAt: string;
}

export interface Pet {
  id: string;
  memberId: string;
  name: string;
  breed: string;
  gender: '公' | '母';
  birthday?: string;
  weight?: number;
  avatar?: string;
  notes?: string;
  careNotes?: string;
  preferences?: string[];
}

export interface Appointment {
  id: string;
  memberId: string;
  petId: string;
  serviceId: string;
  groomerId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  notes?: string;
  smsStatus: 'pending' | 'sent' | 'failed' | 'disabled';
  createdAt: string;
}

export interface RechargeRule {
  id: string;
  amount: number;
  bonusAmount: number;
  bonusCredits: { serviceId: string; count: number; serviceName?: string }[];
  isActive: boolean;
  tag?: string;
}

export interface RechargeRecord {
  id: string;
  memberId: string;
  ruleId?: string;
  amount: number;
  bonusAmount: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface FollowUpRecord {
  id: string;
  memberId: string;
  petId: string;
  appointmentId: string;
  petCondition: string;
  customerFeedback: string;
  nextCareSuggestion: string;
  createdAt: string;
  hasIssue: boolean;
  issueType?: 'unsatisfied' | 'pet_abnormal' | 'other';
  issueDescription?: string;
  issueStatus: 'open' | 'processing' | 'resolved';
  issueResolution?: string;
  issueHandledAt?: string;
}

export interface ConsumptionRecord {
  id: string;
  memberId: string;
  petId: string;
  appointmentId?: string;
  serviceId: string;
  groomerId?: string;
  amount: number;
  payType: PayType;
  pointsEarned: number;
  createdAt: string;
  notes?: string;
  followUpId?: string;
}

export interface PointsRecord {
  id: string;
  memberId: string;
  type: 'earn' | 'spend';
  points: number;
  reason: string;
  refId?: string;
  createdAt: string;
}

export interface ExchangeRecord {
  id: string;
  memberId: string;
  itemType: 'service' | 'product';
  itemName: string;
  itemId?: string;
  pointsCost: number;
  createdAt: string;
}

export interface DailyStat {
  date: string;
  amount: number;
  count: number;
}

export interface ServiceStat {
  serviceId: string;
  serviceName: string;
  count: number;
  amount: number;
}

export interface RankedItem {
  id: string;
  name: string;
  count: number;
  amount: number;
}

export interface MonthlySummary {
  totalRecharge: number;
  totalRechargeCount: number;
  totalService: number;
  totalServiceCount: number;
  totalPointsEarned: number;
  newMembers: number;
}
