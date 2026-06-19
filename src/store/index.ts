import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Appointment,
  Member,
  Pet,
  Service,
  Groomer,
  RechargeRule,
  RechargeRecord,
  ConsumptionRecord,
  PointsRecord,
  ExchangeRecord,
  MonthlySummary,
  DailyStat,
  ServiceStat,
  RankedItem,
  AppointmentStatus,
  MemberLevel,
  PaymentMethod,
  PayType,
  FollowUpRecord,
} from '@/types';
import {
  initAppointments,
  initConsumptionRecords,
  initExchangeRecords,
  initGroomers,
  initMembers,
  initPets,
  initPointsRecords,
  initRechargeRecords,
  initRechargeRules,
  initServices,
  uidFn,
} from '@/data/mockData';
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  startOfDay,
  endOfDay,
  format,
  eachDayOfInterval,
  addMinutes,
  addHours,
} from 'date-fns';

let _smsIntervalStarted = false;

interface AppState {
  appointments: Appointment[];
  members: Member[];
  pets: Pet[];
  services: Service[];
  groomers: Groomer[];
  rechargeRules: RechargeRule[];
  rechargeRecords: RechargeRecord[];
  consumptionRecords: ConsumptionRecord[];
  pointsRecords: PointsRecord[];
  exchangeRecords: ExchangeRecord[];
  followUpRecords: FollowUpRecord[];
  initialized: boolean;
  smsEnabled: boolean;
  remindOffset: string;

  initData: () => void;
  resetAll: () => void;
  setSmsEnabled: (v: boolean) => void;
  setRemindOffset: (v: string) => void;
  processPendingSms: () => void;

  createAppointment: (data: {
    memberId: string;
    petId: string;
    serviceId: string;
    groomerId: string;
    startAt: string;
    endAt: string;
    notes?: string;
  }) => { success: boolean; id?: string; conflict?: Appointment };
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;
  checkConflict: (groomerId: string, startAt: Date, endAt: Date, excludeId?: string) => Appointment | null;
  completeAppointment: (id: string, payType: PayType) => { success: boolean; error?: string };

  createMember: (data: { name: string; phone: string; gender?: '男' | '女'; notes?: string }) => Member;
  updateMember: (id: string, data: Partial<Member>) => void;
  rechargeMember: (memberId: string, ruleId: string, paymentMethod: PaymentMethod) => RechargeRecord;

  createPet: (data: Omit<Pet, 'id'>) => Pet;
  updatePet: (id: string, data: Partial<Pet>) => void;

  createService: (data: Omit<Service, 'id'>) => Service;
  updateService: (id: string, data: Partial<Service>) => void;

  createRechargeRule: (data: Omit<RechargeRule, 'id'>) => RechargeRule;
  updateRechargeRule: (id: string, data: Partial<RechargeRule>) => void;
  deleteRechargeRule: (id: string) => void;

  exchangePoints: (memberId: string, itemType: 'service' | 'product', itemName: string, pointsCost: number, itemId?: string) => { success: boolean; error?: string };

  createFollowUp: (data: Omit<FollowUpRecord, 'id' | 'createdAt'>) => FollowUpRecord;
  getFollowUpsByMember: (memberId: string) => FollowUpRecord[];
  getFollowUpByAppointment: (appointmentId: string) => FollowUpRecord | undefined;

  getMonthlyRechargeStats: (year: number, month: number) => DailyStat[];
  getMonthlyServiceStats: (year: number, month: number) => ServiceStat[];
  getTopServices: (year: number, month: number, limit: number) => RankedItem[];
  getTopGroomers: (year: number, month: number, limit: number) => RankedItem[];
  getMonthlySummary: (year: number, month: number) => MonthlySummary;
}

const uid = uidFn;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      appointments: [],
      members: [],
      pets: [],
      services: [],
      groomers: [],
      rechargeRules: [],
      rechargeRecords: [],
      consumptionRecords: [],
      pointsRecords: [],
      exchangeRecords: [],
      followUpRecords: [],
      initialized: false,
      smsEnabled: (() => {
        if (typeof window === 'undefined') return true;
        return localStorage.getItem('pet_sms_enabled') !== '0';
      })(),
      remindOffset: (() => {
        if (typeof window === 'undefined') return '2h';
        return localStorage.getItem('pet_remind_offset') || '2h';
      })(),

      setSmsEnabled: (v) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pet_sms_enabled', v ? '1' : '0');
        }
        set({ smsEnabled: v });
        get().processPendingSms();
      },

      setRemindOffset: (v) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pet_remind_offset', v);
        }
        set({ remindOffset: v });
        get().processPendingSms();
      },

      processPendingSms: () => {
        const s = get();
        if (!s.smsEnabled) return;

        const now = new Date();
        let threshold: Date;
        switch (s.remindOffset) {
          case '1h':
            threshold = addHours(now, 1);
            break;
          case '2h':
            threshold = addHours(now, 2);
            break;
          case '12h':
            threshold = addHours(now, 12);
            break;
          case '24h':
            threshold = addHours(now, 24);
            break;
          default:
            threshold = addHours(now, 2);
        }
        const lowerBound = addMinutes(now, -30);

        const updatedApts = s.appointments.map((a) => {
          if (a.status === 'cancelled') return a;
          if (a.smsStatus !== 'pending') return a;
          const startAt = new Date(a.startAt);
          if (startAt <= threshold && startAt >= lowerBound) {
            return { ...a, smsStatus: 'sent' as const };
          }
          return a;
        });

        if (updatedApts.some((a, i) => a.smsStatus !== s.appointments[i].smsStatus)) {
          set({ appointments: updatedApts });
        }
      },

      initData: () => {
        const s = get();
        if (s.initialized) return;
        const appointments = initAppointments();
        const members = initMembers();
        const pets = initPets();
        const services = initServices();
        const groomers = initGroomers();
        const rechargeRules = initRechargeRules();
        const rechargeRecords = initRechargeRecords();
        const consumptionRecords = initConsumptionRecords();
        const pointsRecords = initPointsRecords();
        const exchangeRecords = initExchangeRecords();

        let followUpRecords = s.followUpRecords.length > 0 ? s.followUpRecords : [];
        if (followUpRecords.length === 0) {
          const completedConsumptions = consumptionRecords.filter((c) => c.appointmentId).slice(0, 3);
          const mockConditions = [
            '毛发柔软无打结、指甲已修剪、精神状态良好，耳朵清洁无异味',
            '皮肤状态健康，毛发顺滑，脚底毛已清理，肛门腺已挤',
            '毛发有轻微打结已处理，指甲修剪整齐，活泼好动，配合度高',
          ];
          const mockFeedbacks = [
            '客户很满意，称赞美容师耐心细致，下次还想预约小美做造型',
            '整体服务很好，建议减少吹风温度，宠物有点怕热，下次想尝试SPA',
            '客户反馈洗澡很干净，造型可爱，建议增加吹干时间，耳朵还有点湿',
          ];
          const mockSuggestions = [
            '2周后洗澡，1个月后做造型修剪',
            '3周后药浴护理，注意皮肤保湿',
            '下月做SPA护理，平时注意每日梳毛',
          ];
          completedConsumptions.forEach((c, i) => {
            if (c.memberId && c.petId && c.appointmentId) {
              followUpRecords.push({
                id: uid(),
                memberId: c.memberId,
                petId: c.petId,
                appointmentId: c.appointmentId,
                petCondition: mockConditions[i % mockConditions.length],
                customerFeedback: mockFeedbacks[i % mockFeedbacks.length],
                nextCareSuggestion: mockSuggestions[i % mockSuggestions.length],
                createdAt: c.createdAt,
              });
            }
          });
        }

        set({
          appointments,
          members,
          pets,
          services,
          groomers,
          rechargeRules,
          rechargeRecords,
          consumptionRecords,
          pointsRecords,
          exchangeRecords,
          followUpRecords,
          initialized: true,
        });
        get().processPendingSms();
        if (!_smsIntervalStarted) {
          _smsIntervalStarted = true;
          setInterval(() => {
            get().processPendingSms();
          }, 60 * 1000);
        }
      },

      resetAll: () => {
        set({
          appointments: [],
          members: [],
          pets: [],
          services: [],
          groomers: [],
          rechargeRules: [],
          rechargeRecords: [],
          consumptionRecords: [],
          pointsRecords: [],
          exchangeRecords: [],
          followUpRecords: [],
          initialized: false,
        });
        get().initData();
      },

      checkConflict: (groomerId, startAt, endAt, excludeId) => {
        const s = get();
        const startTime = startAt.getTime();
        const endTime = endAt.getTime();
        return s.appointments.find((a) => {
          if (a.id === excludeId) return false;
          if (a.status === 'cancelled' || a.status === 'completed') return false;
          if (a.groomerId !== groomerId) return false;
          const aStart = new Date(a.startAt).getTime();
          const aEnd = new Date(a.endAt).getTime();
          return startTime < aEnd && endTime > aStart;
        });
      },

      createAppointment: (data) => {
        const s = get();
        const conflict = s.checkConflict(data.groomerId, new Date(data.startAt), new Date(data.endAt));
        if (conflict) return { success: false, conflict };

        const apt: Appointment = {
          id: uid(),
          ...data,
          status: 'confirmed',
          smsStatus: 'pending',
          createdAt: new Date().toISOString(),
        };
        set({ appointments: [apt, ...s.appointments] });
        get().processPendingSms();
        return { success: true, id: apt.id };
      },

      updateAppointment: (id, data) => {
        set((s) => ({
          appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...data } : a)),
        }));
      },

      cancelAppointment: (id) => {
        set((s) => ({
          appointments: s.appointments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'cancelled' as AppointmentStatus,
                  smsStatus: a.smsStatus === 'pending' ? 'disabled' : a.smsStatus,
                }
              : a
          ),
        }));
      },

      completeAppointment: (id, payType) => {
        const s = get();
        const apt = s.appointments.find((a) => a.id === id);
        if (!apt) return { success: false, error: '预约不存在' };
        const service = s.services.find((sv) => sv.id === apt.serviceId);
        const member = s.members.find((m) => m.id === apt.memberId);
        if (!service || !member) return { success: false, error: '数据异常' };

        let finalPayType = payType;
        let newBalance = member.balance;
        let newCredits = [...member.serviceCredits];

        if (payType === 'credit') {
          const idx = newCredits.findIndex((c) => c.serviceId === apt.serviceId && c.count > 0);
          if (idx >= 0) {
            newCredits[idx] = { ...newCredits[idx], count: newCredits[idx].count - 1 };
          } else if (newBalance >= service.price) {
            newBalance -= service.price;
            finalPayType = 'balance';
          } else {
            return { success: false, error: '余额或次数不足' };
          }
        } else if (payType === 'balance') {
          if (newBalance >= service.price) {
            newBalance -= service.price;
          } else {
            return { success: false, error: '余额不足，请选择其他支付方式' };
          }
        }

        const pointsEarned = service.price;
        const newPoints = member.points + pointsEarned;
        const level: MemberLevel = newPoints >= 3000 ? '钻石' : newPoints >= 1500 ? '金卡' : newPoints >= 500 ? '银卡' : '普通';

        const consumption: ConsumptionRecord = {
          id: uid(),
          memberId: apt.memberId,
          petId: apt.petId,
          appointmentId: apt.id,
          serviceId: apt.serviceId,
          groomerId: apt.groomerId,
          amount: service.price,
          payType: finalPayType,
          pointsEarned,
          createdAt: new Date().toISOString(),
          notes: apt.notes,
        };

        const pointsRec: PointsRecord = {
          id: uid(),
          memberId: apt.memberId,
          type: 'earn',
          points: pointsEarned,
          reason: `${service.name}消费积分`,
          refId: consumption.id,
          createdAt: new Date().toISOString(),
        };

        set((st) => ({
          appointments: st.appointments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: 'completed' as AppointmentStatus,
                  smsStatus: a.smsStatus === 'pending' ? 'disabled' : a.smsStatus,
                }
              : a
          ),
          members: st.members.map((m) =>
            m.id === apt.memberId ? { ...m, balance: newBalance, serviceCredits: newCredits, points: newPoints, level } : m
          ),
          consumptionRecords: [consumption, ...st.consumptionRecords],
          pointsRecords: [pointsRec, ...st.pointsRecords],
        }));
        return { success: true };
      },

      createMember: (data) => {
        const m: Member = {
          id: uid(),
          ...data,
          balance: 0,
          points: 0,
          level: '普通',
          serviceCredits: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ members: [m, ...s.members] }));
        return m;
      },

      updateMember: (id, data) => {
        set((s) => ({
          members: s.members.map((m) => (m.id === id ? { ...m, ...data } : m)),
        }));
      },

      rechargeMember: (memberId, ruleId, paymentMethod) => {
        const s = get();
        const rule = s.rechargeRules.find((r) => r.id === ruleId);
        const member = s.members.find((m) => m.id === memberId);
        if (!rule || !member) throw new Error('数据异常');

        const newBalance = member.balance + rule.amount + rule.bonusAmount;
        let newCredits = [...member.serviceCredits];
        for (const bc of rule.bonusCredits) {
          const idx = newCredits.findIndex((c) => c.serviceId === bc.serviceId);
          if (idx >= 0) {
            newCredits[idx] = { ...newCredits[idx], count: newCredits[idx].count + bc.count };
          } else {
            newCredits.push({ serviceId: bc.serviceId, count: bc.count });
          }
        }
        const newPoints = member.points + Math.floor(rule.amount / 10);
        const level: MemberLevel = newPoints >= 3000 ? '钻石' : newPoints >= 1500 ? '金卡' : newPoints >= 500 ? '银卡' : '普通';

        const rec: RechargeRecord = {
          id: uid(),
          memberId,
          ruleId,
          amount: rule.amount,
          bonusAmount: rule.bonusAmount,
          paymentMethod,
          createdAt: new Date().toISOString(),
        };

        const pointsRec: PointsRecord = {
          id: uid(),
          memberId,
          type: 'earn',
          points: Math.floor(rule.amount / 10),
          reason: '充值赠送积分',
          refId: rec.id,
          createdAt: new Date().toISOString(),
        };

        set((st) => ({
          members: st.members.map((m) =>
            m.id === memberId ? { ...m, balance: newBalance, serviceCredits: newCredits, points: newPoints, level } : m
          ),
          rechargeRecords: [rec, ...st.rechargeRecords],
          pointsRecords: [pointsRec, ...st.pointsRecords],
        }));
        return rec;
      },

      createPet: (data) => {
        const p: Pet = { id: uid(), ...data };
        set((s) => ({ pets: [p, ...s.pets] }));
        return p;
      },

      updatePet: (id, data) => {
        set((s) => ({
          pets: s.pets.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
      },

      createService: (data) => {
        const sv: Service = { id: uid(), ...data };
        set((s) => ({ services: [...s.services, sv] }));
        return sv;
      },

      updateService: (id, data) => {
        set((s) => ({
          services: s.services.map((sv) => (sv.id === id ? { ...sv, ...data } : sv)),
        }));
      },

      createRechargeRule: (data) => {
        const r: RechargeRule = { id: uid(), ...data };
        set((s) => ({ rechargeRules: [...s.rechargeRules, r] }));
        return r;
      },

      updateRechargeRule: (id, data) => {
        set((s) => ({
          rechargeRules: s.rechargeRules.map((r) => (r.id === id ? { ...r, ...data } : r)),
        }));
      },

      deleteRechargeRule: (id) => {
        set((s) => ({
          rechargeRules: s.rechargeRules.filter((r) => r.id !== id),
        }));
      },

      exchangePoints: (memberId, itemType, itemName, pointsCost, itemId) => {
        const s = get();
        const member = s.members.find((m) => m.id === memberId);
        if (!member) return { success: false, error: '会员不存在' };
        if (member.points < pointsCost) return { success: false, error: '积分不足' };

        const newPoints = member.points - pointsCost;
        const level: MemberLevel = newPoints >= 3000 ? '钻石' : newPoints >= 1500 ? '金卡' : newPoints >= 500 ? '银卡' : '普通';

        const exch: ExchangeRecord = {
          id: uid(),
          memberId,
          itemType,
          itemName,
          itemId,
          pointsCost,
          createdAt: new Date().toISOString(),
        };

        const pointsRec: PointsRecord = {
          id: uid(),
          memberId,
          type: 'spend',
          points: pointsCost,
          reason: `兑换${itemName}`,
          refId: exch.id,
          createdAt: new Date().toISOString(),
        };

        set((st) => ({
          members: st.members.map((m) => (m.id === memberId ? { ...m, points: newPoints, level } : m)),
          exchangeRecords: [exch, ...st.exchangeRecords],
          pointsRecords: [pointsRec, ...st.pointsRecords],
        }));
        return { success: true };
      },

      createFollowUp: (data) => {
        const s = get();
        const followUp: FollowUpRecord = {
          id: uid(),
          ...data,
          createdAt: new Date().toISOString(),
        };
        set((st) => ({
          followUpRecords: [followUp, ...st.followUpRecords],
        }));
        return followUp;
      },

      getFollowUpsByMember: (memberId) => {
        return get()
          .followUpRecords.filter((f) => f.memberId === memberId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getFollowUpByAppointment: (appointmentId) => {
        return get().followUpRecords.find((f) => f.appointmentId === appointmentId);
      },

      getMonthlyRechargeStats: (year, month) => {
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));
        const days = eachDayOfInterval({ start, end });
        const s = get();
        return days.map((d) => {
          const dayStart = startOfDay(d);
          const dayEnd = endOfDay(d);
          const dayRecords = s.rechargeRecords.filter((r) =>
            isWithinInterval(new Date(r.createdAt), { start: dayStart, end: dayEnd })
          );
          return {
            date: format(d, 'MM-dd'),
            amount: dayRecords.reduce((sum, r) => sum + r.amount + r.bonusAmount, 0),
            count: dayRecords.length,
          };
        });
      },

      getMonthlyServiceStats: (year, month) => {
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));
        const s = get();
        const inMonth = s.consumptionRecords.filter((c) =>
          isWithinInterval(new Date(c.createdAt), { start, end })
        );
        const map = new Map<string, ServiceStat>();
        for (const c of inMonth) {
          const sv = s.services.find((x) => x.id === c.serviceId);
          if (!sv) continue;
          const cur = map.get(c.serviceId) || { serviceId: c.serviceId, serviceName: sv.name, count: 0, amount: 0 };
          cur.count++;
          cur.amount += c.amount;
          map.set(c.serviceId, cur);
        }
        return Array.from(map.values());
      },

      getTopServices: (year, month, limit) => {
        return get()
          .getMonthlyServiceStats(year, month)
          .sort((a, b) => b.count - a.count)
          .slice(0, limit)
          .map((x) => ({ id: x.serviceId, name: x.serviceName, count: x.count, amount: x.amount }));
      },

      getTopGroomers: (year, month, limit) => {
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));
        const s = get();
        const inMonth = s.consumptionRecords.filter((c) =>
          isWithinInterval(new Date(c.createdAt), { start, end }) && c.groomerId
        );
        const map = new Map<string, RankedItem>();
        for (const c of inMonth) {
          if (!c.groomerId) continue;
          const g = s.groomers.find((x) => x.id === c.groomerId);
          if (!g) continue;
          const cur = map.get(c.groomerId) || { id: c.groomerId, name: g.name, count: 0, amount: 0 };
          cur.count++;
          cur.amount += c.amount;
          map.set(c.groomerId, cur);
        }
        return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, limit);
      },

      getMonthlySummary: (year, month) => {
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));
        const s = get();
        const recharges = s.rechargeRecords.filter((r) => isWithinInterval(new Date(r.createdAt), { start, end }));
        const services = s.consumptionRecords.filter((c) => isWithinInterval(new Date(c.createdAt), { start, end }));
        const newMembers = s.members.filter((m) => isWithinInterval(new Date(m.createdAt), { start, end }));
        return {
          totalRecharge: recharges.reduce((sum, r) => sum + r.amount + r.bonusAmount, 0),
          totalRechargeCount: recharges.length,
          totalService: services.reduce((sum, c) => sum + c.amount, 0),
          totalServiceCount: services.length,
          totalPointsEarned: s.pointsRecords
            .filter((p) => p.type === 'earn' && isWithinInterval(new Date(p.createdAt), { start, end }))
            .reduce((sum, p) => sum + p.points, 0),
          newMembers: newMembers.length,
        };
      },
    }),
    {
      name: 'pet-grooming-store',
      partialize: (state) => ({
        appointments: state.appointments,
        members: state.members,
        pets: state.pets,
        services: state.services,
        groomers: state.groomers,
        rechargeRules: state.rechargeRules,
        rechargeRecords: state.rechargeRecords,
        consumptionRecords: state.consumptionRecords,
        pointsRecords: state.pointsRecords,
        exchangeRecords: state.exchangeRecords,
        followUpRecords: state.followUpRecords,
        initialized: state.initialized,
        smsEnabled: state.smsEnabled,
        remindOffset: state.remindOffset,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.processPendingSms();
          if (!_smsIntervalStarted) {
            _smsIntervalStarted = true;
            setInterval(() => {
              state.processPendingSms();
            }, 60 * 1000);
          }
        }
      },
    }
  )
);

export { addMinutes };
