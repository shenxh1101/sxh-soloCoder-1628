import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  LayoutGrid,
  List,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  Wallet,
  Ticket,
  Banknote,
  MessageCircle,
  CreditCard as CreditCardIcon,
  AlertCircle,
  Filter,
  Pencil,
  Scissors,
  User,
  Clock,
  CalendarDays as CalendarDaysIcon,
  Star,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { computeAllPetCareCycles, getLastServiceRecord } from '@/utils/careCycle';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isWithinInterval,
  startOfDay,
  endOfDay,
  subDays,
  addDays,
  differenceInMinutes,
  addMinutes,
  parseISO,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Appointment, AppointmentStatus, PayType, Pet, Member, Service, Groomer, ServiceCategory, FollowUpRecord, ConsumptionRecord } from '@/types';

const statusConfig: Record<AppointmentStatus, { label: string; className: string; bg: string }> = {
  pending: { label: '待确认', className: 'bg-petal-100 text-petal-400 border-petal-200', bg: 'bg-petal-300' },
  confirmed: { label: '已确认', className: 'bg-sage-100 text-sage-600 border-sage-200', bg: 'bg-sage-400' },
  in_service: { label: '服务中', className: 'bg-terracotta-100 text-terracotta-500 border-terracotta-200', bg: 'bg-terracotta-400' },
  completed: { label: '已完成', className: 'bg-gray-100 text-gray-500 border-gray-200', bg: 'bg-gray-400' },
  cancelled: { label: '已取消', className: 'bg-gray-100 text-gray-400 border-gray-200', bg: 'bg-gray-300' },
};

const statusFilters: { key: AppointmentStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'in_service', label: '服务中' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

const payOptions: { key: PayType; label: string; icon: typeof Wallet; color: string; desc: string }[] = [
  { key: 'balance', label: '余额', icon: Wallet, color: 'bg-sage-500 hover:bg-sage-600', desc: '直接从会员余额扣除' },
  { key: 'credit', label: '次卡', icon: Ticket, color: 'bg-sky2-400 hover:bg-sky2-300', desc: '使用剩余服务次数' },
  { key: 'cash', label: '现金', icon: Banknote, color: 'bg-terracotta-400 hover:bg-terracotta-500', desc: '线下现金收款' },
  { key: 'wechat', label: '微信', icon: MessageCircle, color: 'bg-green-500 hover:bg-green-600', desc: '扫码支付' },
  { key: 'alipay', label: '支付宝', icon: CreditCardIcon, color: 'bg-blue-500 hover:bg-blue-600', desc: '扫码支付' },
];

type ViewMode = 'month' | 'week' | 'day';
type MainView = 'calendar' | 'list' | 'repurchase';
type RepurchaseStatus = 'overdue' | 'due_soon' | 'later' | 'booked';
type RepurchaseGroupBy = 'none' | 'groomer' | 'service' | 'status';

interface RepurchaseCardData {
  pet: Pet;
  member: Member;
  lastService: {
    service: Service;
    appointment?: Appointment;
    consumption?: ConsumptionRecord;
    groomer?: Groomer;
    date: Date;
    amount: number;
  } | null;
  lastFollowUp: FollowUpRecord | null;
  nextSuggestionDate: Date | null;
  suggestionSource: 'follow_up' | 'system' | null;
  futureAppointment: Appointment | null;
  status: RepurchaseStatus;
  serviceCategory: ServiceCategory;
}

const repurchaseStatusConfig: Record<RepurchaseStatus, { label: string; className: string }> = {
  overdue: { label: '已过期', className: 'bg-petal-100 text-petal-600 border-petal-200' },
  due_soon: { label: '7天内', className: 'bg-terracotta-100 text-terracotta-600 border-terracotta-200' },
  later: { label: '稍后', className: 'bg-sage-100 text-sage-600 border-sage-200' },
  booked: { label: '已预约', className: 'bg-sky2-100 text-sky2-600 border-sky2-200' },
};

const quickFilterOptions: { key: 'all' | 'pending' | 'booked' | 'overdue'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待跟进' },
  { key: 'booked', label: '已预约' },
  { key: 'overdue', label: '已过期' },
];

type FinderFn<T> = (id: string) => T | undefined;

function getAvatar(name: string) {
  const colors = [
    'bg-petal-200 text-petal-600',
    'bg-sage-200 text-sage-700',
    'bg-terracotta-200 text-terracotta-600',
    'bg-sky2-200 text-sky2-600',
    'bg-cream-300 text-sage-700',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function Avatar({ name, className }: { name: string; className?: string }) {
  const color = getAvatar(name);
  const initial = name.charAt(0);
  return (
    <div className={cn('flex items-center justify-center rounded-full font-medium shrink-0', color, className)}>
      {initial}
    </div>
  );
}

function computeRepurchaseData(
  pets: Pet[],
  members: Member[],
  appointments: Appointment[],
  consumptionRecords: ConsumptionRecord[],
  services: Service[],
  groomers: Groomer[],
  followUpRecords: FollowUpRecord[]
): RepurchaseCardData[] {
  const now = new Date();
  const result: RepurchaseCardData[] = [];

  const groomerSimple = groomers.map((g) => ({ id: g.id, name: g.name }));
  const careCycles = computeAllPetCareCycles(
    pets,
    members,
    consumptionRecords,
    followUpRecords,
    services,
    groomerSimple
  );

  for (const cycle of careCycles) {
    const pet = pets.find((p) => p.id === cycle.petId);
    const member = members.find((m) => m.id === cycle.memberId);
    if (!pet || !member) continue;

    const lastConsumption = getLastServiceRecord(pet.id, consumptionRecords);
    const lastServiceObj = lastConsumption
      ? services.find((s) => s.id === lastConsumption.serviceId)
      : null;
    const lastGroomer = lastConsumption?.groomerId
      ? groomers.find((g) => g.id === lastConsumption.groomerId)
      : undefined;

    let lastService: RepurchaseCardData['lastService'] = null;
    if (lastConsumption && lastServiceObj) {
      lastService = {
        service: lastServiceObj,
        consumption: lastConsumption,
        groomer: lastGroomer,
        date: new Date(lastConsumption.createdAt),
        amount: lastConsumption.amount,
      };
    }

    const petFollowUps = followUpRecords
      .filter((f) => f.petId === pet.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const lastFollowUp = petFollowUps[0] ?? null;

    const futureAppointment =
      appointments.find(
        (a) =>
          a.petId === pet.id &&
          (a.status === 'confirmed' || a.status === 'pending') &&
          new Date(a.startAt) > now
      ) ?? null;

    let status: RepurchaseStatus;
    if (futureAppointment) {
      status = 'booked';
    } else if (cycle.status === 'overdue') {
      status = 'overdue';
    } else if (cycle.status === 'due_soon') {
      status = 'due_soon';
    } else {
      status = 'later';
    }

    const serviceCategory: ServiceCategory = lastService?.service.category ?? '其他';

    result.push({
      pet,
      member,
      lastService,
      lastFollowUp,
      nextSuggestionDate: cycle.nextSuggestedDate,
      suggestionSource: cycle.source === 'followup' ? 'follow_up' : 'system',
      futureAppointment,
      status,
      serviceCategory,
    });
  }

  return result.sort((a, b) => {
    const statusOrder: Record<RepurchaseStatus, number> = {
      overdue: 0,
      due_soon: 1,
      later: 2,
      booked: 3,
    };
    const orderA = statusOrder[a.status];
    const orderB = statusOrder[b.status];
    if (orderA !== orderB) return orderA - orderB;
    if (a.nextSuggestionDate && b.nextSuggestionDate) {
      return a.nextSuggestionDate.getTime() - b.nextSuggestionDate.getTime();
    }
    return 0;
  });
}

interface AppointmentEditModalProps {
  open: boolean;
  appointment: Appointment | null;
  services: Service[];
  groomers: Groomer[];
  members: Member[];
  pets: Pet[];
  onClose: () => void;
  onSave: (id: string, data: Partial<Appointment>) => Promise<boolean>;
}

function AppointmentEditModal({
  open,
  appointment,
  services,
  groomers,
  members,
  pets,
  onClose,
  onSave,
}: AppointmentEditModalProps) {
  const activeServices = services.filter((s) => s.isActive);
  const activeGroomers = groomers.filter((g) => g.isActive);

  const [serviceId, setServiceId] = useState('');
  const [groomerId, setGroomerId] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      setServiceId(appointment.serviceId);
      setGroomerId(appointment.groomerId);
      setDateStr(format(parseISO(appointment.startAt), 'yyyy-MM-dd'));
      setTimeStr(format(parseISO(appointment.startAt), 'HH:mm'));
      setConflictError(null);
      setSaving(false);
    }
  }, [open, appointment]);

  const currentService = services.find((s) => s.id === appointment?.serviceId);
  const selectedService = services.find((s) => s.id === serviceId);
  const duration = selectedService?.duration ?? currentService?.duration ?? 60;

  const member = appointment ? members.find((m) => m.id === appointment.memberId) : undefined;
  const pet = appointment ? pets.find((p) => p.id === appointment.petId) : undefined;

  const computeEndAt = () => {
    const start = new Date(`${dateStr}T${timeStr}`);
    return addMinutes(start, duration);
  };

  const timeOptions: string[] = [];
  for (let h = 9; h <= 20; h++) {
    timeOptions.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 20) timeOptions.push(`${String(h).padStart(2, '0')}:30`);
  }

  const handleSave = async () => {
    if (!appointment) return;
    setConflictError(null);
    setSaving(true);
    const startAt = new Date(`${dateStr}T${timeStr}`);
    const endAt = computeEndAt();
    if (isNaN(startAt.getTime())) {
      setConflictError('请选择有效的日期和时间');
      setSaving(false);
      return;
    }
    const success = await onSave(appointment.id, {
      serviceId,
      groomerId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    });
    if (!success) {
      const conflict = useAppStore.getState().checkConflict(groomerId, startAt, endAt, appointment.id);
      if (conflict) {
        setConflictError(
          `⏰ 时间冲突：该美容师在${format(new Date(conflict.startAt), 'HH:mm')}-${format(new Date(conflict.endAt), 'HH:mm')}已有预约，请调整`
        );
      } else {
        setConflictError('保存失败，请稍后重试');
      }
      setSaving(false);
    }
  };

  if (!open || !appointment) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-sage-700/30 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-2xl2 bg-white p-6 shadow-card-hover max-h-[90vh] overflow-y-auto"
        >
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-sage-700 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-sky2-500" />
                编辑预约 #{appointment.id.slice(-6)}
              </h3>
              <p className="mt-1 text-xs text-sage-400">修改预约信息，保存前自动检测冲突</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sage-400 transition-colors hover:bg-cream-100 hover:text-sage-600"
            >
              <X size={18} />
            </button>
          </div>

          {conflictError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 rounded-xl bg-petal-50 border border-petal-200 p-3 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-petal-500 shrink-0 mt-0.5" />
              <span className="text-sm text-petal-600 font-medium">{conflictError}</span>
            </motion.div>
          )}

          <div className="space-y-5">
            <div className="rounded-xl bg-cream-50 p-4 border border-cream-200">
              <div className="text-xs font-medium text-sage-500 mb-2">客户信息（不可修改）</div>
              <div className="flex items-center gap-3">
                <Avatar name={member?.name ?? '?'} className="w-10 h-10" />
                <div>
                  <div className="text-sm font-semibold text-sage-700">
                    👤 {member?.name ?? '未知客户'} · 🐾 {pet?.name ?? '未知宠物'}
                  </div>
                  <div className="text-xs text-sage-400">
                    {pet?.breed ?? ''} {member?.phone ?? ''}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">
                <Scissors className="w-4 h-4 inline mr-1.5 -mt-0.5 text-sage-500" />
                服务项目
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-white text-sage-700 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all"
              >
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - ¥{s.price}（{s.duration}分钟）
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-sage-700 mb-2">
                <User className="w-4 h-4 inline mr-1.5 -mt-0.5 text-sage-500" />
                美容师
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeGroomers.map((g) => {
                  const selected = groomerId === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setGroomerId(g.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                        selected
                          ? 'border-sky2-400 bg-sky2-50 shadow-soft'
                          : 'border-sage-100 bg-white hover:border-sage-200 hover:bg-cream-50',
                      )}
                    >
                      <Avatar name={g.name} className="w-10 h-10" />
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-sm font-semibold truncate',
                          selected ? 'text-sky2-600' : 'text-sage-700',
                        )}>
                          {g.name}
                        </div>
                        <div className="text-xs text-sage-400 truncate">{g.phone}</div>
                      </div>
                      {selected && <CheckCircle2 className="w-4 h-4 text-sky2-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  <CalendarDaysIcon className="w-4 h-4 inline mr-1.5 -mt-0.5 text-sage-500" />
                  日期
                </label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-white text-sage-700 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5 text-sage-500" />
                  开始时间
                </label>
                <select
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-sage-200 bg-white text-sage-700 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all"
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-cream-50 p-4 border border-cream-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-sage-500">服务时长</span>
                <span className="font-medium text-sage-700">{duration} 分钟</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-sage-500">预计结束（自动计算）</span>
                <span className="font-semibold text-terracotta-500">
                  {format(computeEndAt(), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-sage-200 text-sm font-medium text-sage-600 hover:bg-sage-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-soft transition-colors',
                saving ? 'bg-sky2-300 cursor-not-allowed' : 'bg-sky2-500 hover:bg-sky2-600'
              )}
            >
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface CompletePaymentModalProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  members: Member[];
  services: Service[];
  pets: Pet[];
  completeAppointment: (id: string, payType: PayType) => { success: boolean; error?: string };
  createFollowUp: (data: { memberId: string; petId: string; appointmentId: string; petCondition: string; customerFeedback: string; nextCareSuggestion: string }) => void;
  showToast: (text: string) => void;
}

const quickSuggestions = ['2周后洗澡', '1个月后造型', '3周后药浴'];

function CompletePaymentModal({
  open,
  onClose,
  appointment,
  members,
  services,
  pets,
  completeAppointment,
  createFollowUp,
  showToast,
}: CompletePaymentModalProps) {
  const [selectedPayType, setSelectedPayType] = useState<PayType | null>(null);
  const [completeMsg, setCompleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [petCondition, setPetCondition] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [nextCareSuggestion, setNextCareSuggestion] = useState('');
  const [customSuggestion, setCustomSuggestion] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(true);

  useEffect(() => {
    if (open) {
      setSelectedPayType(null);
      setCompleteMsg(null);
      setPetCondition('');
      setCustomerFeedback('');
      setNextCareSuggestion('');
      setCustomSuggestion(false);
      setFollowUpOpen(true);
    }
  }, [open]);

  const member = appointment ? members.find((m) => m.id === appointment.memberId) : undefined;
  const service = appointment ? services.find((s) => s.id === appointment.serviceId) : undefined;
  const pet = appointment ? pets.find((p) => p.id === appointment.petId) : undefined;

  const creditCount = member && service
    ? member.serviceCredits.find((c) => c.serviceId === service.id)?.count ?? 0
    : 0;
  const balanceDisabled = (member?.balance ?? 0) < (service?.price ?? 0);
  const creditDisabled = creditCount <= 0;

  const payTypeLabel: Record<PayType, string> = {
    balance: '余额',
    credit: '次卡',
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
  };

  const newBalance = selectedPayType === 'balance' && service
    ? (member?.balance ?? 0) - service.price
    : member?.balance ?? 0;
  const newCredits = selectedPayType === 'credit' ? creditCount - 1 : creditCount;

  const hasFollowUpContent = petCondition.trim() || customerFeedback.trim() || nextCareSuggestion.trim();

  const handleConfirm = () => {
    if (!selectedPayType || !appointment || !service || !member || !pet) return;
    const res = completeAppointment(appointment.id, selectedPayType);
    if (res.success) {
      if (hasFollowUpContent) {
        createFollowUp({
          memberId: appointment.memberId,
          petId: appointment.petId,
          appointmentId: appointment.id,
          petCondition: petCondition.trim(),
          customerFeedback: customerFeedback.trim(),
          nextCareSuggestion: nextCareSuggestion.trim(),
        });
        setCompleteMsg({ type: 'success', text: '服务完成，回访已记录' });
        showToast('服务完成，回访已记录');
      } else {
        setCompleteMsg({ type: 'success', text: '服务完成，消费记录已生成 🎉' });
        showToast('预约更新成功');
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setCompleteMsg({ type: 'error', text: res.error ?? '操作失败' });
      setTimeout(() => setCompleteMsg(null), 2000);
    }
  };

  if (!open || !appointment || !service || !member) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-sage-700/30 backdrop-blur-sm p-4"
        onClick={() => !completeMsg && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl rounded-2xl2 bg-white p-6 shadow-card-hover max-h-[90vh] overflow-y-auto"
        >
          {completeMsg ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className={cn(
                'flex h-16 w-16 items-center justify-center rounded-full',
                completeMsg.type === 'success' ? 'bg-sage-100' : 'bg-petal-100',
              )}>
                {completeMsg.type === 'success' ? (
                  <CheckCircle2 size={32} className="text-sage-500" />
                ) : (
                  <XCircle size={32} className="text-petal-400" />
                )}
              </div>
              <p className="mt-4 text-lg font-semibold text-sage-700">{completeMsg.text}</p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-sage-700 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-terracotta-400" />
                    完成服务 - 收银结算
                  </h3>
                  <p className="mt-1 text-xs text-sage-400">请选择支付方式并确认结算明细</p>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sage-400 transition-colors hover:bg-cream-100 hover:text-sage-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-sm font-semibold text-sage-600 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    支付方式
                  </h4>
                  <div className="space-y-2.5">
                    {payOptions.map((opt) => {
                      const isSelected = selectedPayType === opt.key;
                      const isDisabled =
                        (opt.key === 'balance' && balanceDisabled) ||
                        (opt.key === 'credit' && creditDisabled);
                      return (
                        <button
                          key={opt.key}
                          onClick={() => !isDisabled && setSelectedPayType(opt.key)}
                          disabled={isDisabled}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-200 border-2',
                            isDisabled
                              ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                              : isSelected
                                ? cn('border-transparent text-white shadow-soft', opt.color)
                                : 'border-sage-100 bg-white hover:border-sage-200 hover:bg-cream-50',
                          )}
                        >
                          <div className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                            isSelected ? 'bg-white/25' : isDisabled ? 'bg-gray-100' : 'bg-cream-100',
                          )}>
                            <opt.icon
                              size={22}
                              style={{ color: isSelected ? 'white' : isDisabled ? '#9ca3af' : '#16a34a' }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              'text-sm font-semibold',
                              isSelected ? 'text-white' : 'text-sage-700',
                            )}>
                              {opt.label}
                              {opt.key === 'balance' && balanceDisabled && (
                                <span className="ml-2 text-xs font-normal opacity-75">（余额不足）</span>
                              )}
                              {opt.key === 'credit' && creditDisabled && (
                                <span className="ml-2 text-xs font-normal opacity-75">（无可用次数）</span>
                              )}
                            </div>
                            <div className={cn(
                              'text-xs opacity-80',
                              isSelected ? 'text-white/80' : 'text-sage-400',
                            )}>
                              {opt.desc}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <h4 className="text-sm font-semibold text-sage-600 flex items-center gap-2 mb-4">
                    <Star className="w-4 h-4" />
                    结算明细
                  </h4>
                  {selectedPayType ? (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl2 bg-gradient-to-br from-cream-50 to-sage-50 border border-sage-100 p-5 shadow-soft"
                    >
                      <div className="flex items-center gap-3 pb-4 border-b border-sage-100/80">
                        <div className="w-12 h-12 rounded-xl bg-terracotta-100 flex items-center justify-center">
                          <Scissors className="w-6 h-6 text-terracotta-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sage-800">{service.name}</div>
                          <div className="text-xs text-sage-400">
                            {member.name} - {pet?.name ?? '未知宠物'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-sage-400">服务金额</div>
                          <div className="text-2xl font-bold text-terracotta-500">¥{service.price}</div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-sage-500">支付方式</span>
                          <span className="font-medium text-sage-700">
                            {payTypeLabel[selectedPayType]}支付
                          </span>
                        </div>

                        {selectedPayType === 'balance' && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-sage-500">扣减余额</span>
                            <span className="font-semibold text-petal-500">- ¥{service.price}</span>
                          </div>
                        )}

                        {selectedPayType === 'credit' && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-sage-500">扣减次数</span>
                            <span className="font-semibold text-sky2-600">
                              {service.name} x 1（剩{newCredits}次）
                            </span>
                          </div>
                        )}

                        {(selectedPayType === 'cash' || selectedPayType === 'wechat' || selectedPayType === 'alipay') && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-sage-500">支付差额</span>
                            <span className="font-semibold text-terracotta-500">
                              {payTypeLabel[selectedPayType]} ¥{service.price}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm pt-2 border-t border-sage-100/60">
                          <span className="text-sage-500 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-terracotta-400" />
                            本次获得积分
                          </span>
                          <span className="font-bold text-terracotta-500">+ {service.price} 分</span>
                        </div>

                        <div className="rounded-xl bg-white/80 p-3.5 mt-2 border border-sage-100/80">
                          <div className="text-xs font-medium text-sage-500 mb-2">会员余额变动</div>
                          <div className="flex items-center justify-center gap-4">
                            <div className="text-center">
                              <div className="text-[11px] text-sage-400 mb-0.5">扣款前</div>
                              <div className={cn(
                                'text-lg font-bold',
                                selectedPayType === 'balance' ? 'text-sage-600' : 'text-sage-700',
                              )}>
                                ¥{member.balance}
                              </div>
                              {selectedPayType === 'credit' && (
                                <div className="text-[11px] text-sky2-500 mt-0.5">次卡 {creditCount} 次</div>
                              )}
                            </div>
                            <ArrowRight className={cn(
                              'w-5 h-5',
                              selectedPayType === 'balance' ? 'text-petal-400' : 'text-sage-300',
                            )} />
                            <div className="text-center">
                              <div className="text-[11px] text-sage-400 mb-0.5">扣款后</div>
                              <div className={cn(
                                'text-lg font-bold',
                                selectedPayType === 'balance' ? 'text-petal-500' : 'text-sage-700',
                              )}>
                                ¥{newBalance}
                              </div>
                              {selectedPayType === 'credit' && (
                                <div className="text-[11px] text-sky2-600 mt-0.5">次卡 {newCredits} 次</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="rounded-2xl2 border-2 border-dashed border-sage-200 p-10 text-center">
                      <Wallet className="w-10 h-10 mx-auto text-sage-300 mb-3" />
                      <p className="text-sm text-sage-400 font-medium">请在左侧选择支付方式</p>
                      <p className="text-xs text-sage-300 mt-1">选择后将在此显示完整结算明细</p>
                    </div>
                  )}

                  <div className="mt-5 rounded-2xl2 border border-sage-100 bg-cream-50/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFollowUpOpen(!followUpOpen)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-cream-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <span className="text-sm font-semibold text-sage-700">服务回访</span>
                        {hasFollowUpContent && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-terracotta-100 text-terracotta-500 font-medium">
                            已填写
                          </span>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-5 h-5 text-sage-400 transition-transform duration-200',
                          followUpOpen && 'rotate-90'
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {followUpOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-sage-600 mb-1.5">
                                🐾 宠物状态
                              </label>
                              <textarea
                                value={petCondition}
                                onChange={(e) => setPetCondition(e.target.value)}
                                rows={2}
                                placeholder="如：毛发柔软无打结、指甲已修剪、精神状态良好"
                                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-sage-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-sage-600 mb-1.5">
                                💬 客户反馈
                              </label>
                              <textarea
                                value={customerFeedback}
                                onChange={(e) => setCustomerFeedback(e.target.value)}
                                rows={2}
                                placeholder="如：客户很满意、下次想尝试造型、建议减少洗澡频率"
                                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-sage-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent resize-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-sage-600 mb-1.5">
                                📅 下次建议护理
                              </label>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {quickSuggestions.map((s) => {
                                  const selected = nextCareSuggestion === s && !customSuggestion;
                                  return (
                                    <button
                                      type="button"
                                      key={s}
                                      onClick={() => {
                                        setNextCareSuggestion(s);
                                        setCustomSuggestion(false);
                                      }}
                                      className={cn(
                                        'px-3 py-1.5 text-xs rounded-full font-medium transition-all border-2',
                                        selected
                                          ? 'bg-terracotta-400 text-white border-terracotta-400 shadow-soft'
                                          : 'bg-white text-sage-600 border-sage-200 hover:border-sage-300 hover:bg-cream-100'
                                      )}
                                    >
                                      {s}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => setCustomSuggestion(true)}
                                  className={cn(
                                    'px-3 py-1.5 text-xs rounded-full font-medium transition-all border-2',
                                    customSuggestion
                                      ? 'bg-sage-500 text-white border-sage-500 shadow-soft'
                                      : 'bg-white text-sage-600 border-sage-200 hover:border-sage-300 hover:bg-cream-100'
                                  )}
                                >
                                  ✏️ 自定义
                                </button>
                              </div>
                              {customSuggestion && (
                                <textarea
                                  value={nextCareSuggestion}
                                  onChange={(e) => setNextCareSuggestion(e.target.value)}
                                  rows={2}
                                  placeholder="输入自定义的下次护理建议..."
                                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-sage-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent resize-none"
                                />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={handleConfirm}
                    disabled={!selectedPayType}
                    className={cn(
                      'mt-5 w-full py-3.5 rounded-xl text-sm font-semibold transition-all shadow-soft',
                      selectedPayType
                        ? 'bg-sage-500 hover:bg-sage-600 text-white hover:-translate-y-0.5'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                    )}
                  >
                    {selectedPayType
                      ? `确认支付 ¥${service.price}（${payTypeLabel[selectedPayType]}）`
                      : '请选择支付方式'}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AppointmentList() {
  const navigate = useNavigate();
  const appointments = useAppStore((s) => s.appointments);
  const members = useAppStore((s) => s.members);
  const pets = useAppStore((s) => s.pets);
  const services = useAppStore((s) => s.services);
  const groomers = useAppStore((s) => s.groomers);
  const consumptionRecords = useAppStore((s) => s.consumptionRecords);
  const followUpRecords = useAppStore((s) => s.followUpRecords);
  const cancelAppointment = useAppStore((s) => s.cancelAppointment);
  const completeAppointment = useAppStore((s) => s.completeAppointment);
  const createFollowUp = useAppStore((s) => s.createFollowUp);
  const updateAppointment = useAppStore((s) => s.updateAppointment);
  const checkConflict = useAppStore((s) => s.checkConflict);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [mainView, setMainView] = useState<MainView>('calendar');
  const [cursor, setCursor] = useState(new Date());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [groomerFilter, setGroomerFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<ServiceCategory | 'all'>('all');
  const [focusedDay, setFocusedDay] = useState<Date | null>(null);
  const [hoverDay, setHoverDay] = useState<Date | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [completeModal, setCompleteModal] = useState<Appointment | null>(null);
  const [editModal, setEditModal] = useState<Appointment | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [repurchaseSearch, setRepurchaseSearch] = useState('');
  const [repurchaseGroupBy, setRepurchaseGroupBy] = useState<RepurchaseGroupBy>('none');
  const [repurchaseQuickFilter, setRepurchaseQuickFilter] = useState<'all' | 'pending' | 'booked' | 'overdue'>('all');
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  const getPet: FinderFn<Pet> = (id) => pets.find((p) => p.id === id);
  const getMember: FinderFn<Member> = (id) => members.find((m) => m.id === id);
  const getService: FinderFn<Service> = (id) => services.find((s) => s.id === id);
  const getGroomer: FinderFn<Groomer> = (id) => groomers.find((g) => g.id === id);

  const serviceCategoryOptions = useMemo(() => {
    const set = new Set<ServiceCategory>();
    services.forEach((s) => set.add(s.category));
    return Array.from(set);
  }, [services]);

  const activeGroomers = useMemo(() => groomers.filter((g) => g.isActive), [groomers]);

  const repurchaseData = useMemo(
    () => computeRepurchaseData(pets, members, appointments, consumptionRecords, services, groomers, followUpRecords),
    [pets, members, appointments, consumptionRecords, services, groomers, followUpRecords]
  );

  const filteredRepurchaseData = useMemo(() => {
    let list = [...repurchaseData];

    if (repurchaseQuickFilter === 'pending') {
      list = list.filter((item) => item.status === 'overdue' || item.status === 'due_soon');
    } else if (repurchaseQuickFilter === 'booked') {
      list = list.filter((item) => item.status === 'booked');
    } else if (repurchaseQuickFilter === 'overdue') {
      list = list.filter((item) => item.status === 'overdue');
    }

    if (repurchaseSearch.trim()) {
      const q = repurchaseSearch.trim().toLowerCase();
      list = list.filter((item) =>
        item.pet.name.toLowerCase().includes(q) ||
        item.member.name.toLowerCase().includes(q) ||
        item.member.phone.includes(q)
      );
    }

    return list;
  }, [repurchaseData, repurchaseQuickFilter, repurchaseSearch]);

  const groupedRepurchaseData = useMemo(() => {
    const list = filteredRepurchaseData;
    if (repurchaseGroupBy === 'none') {
      return [{ key: 'all', label: '全部', items: list }];
    }

    const groups = new Map<string, RepurchaseCardData[]>();

    if (repurchaseGroupBy === 'groomer') {
      for (const item of list) {
        const groomerName = item.lastService?.groomer?.name ?? '未分配';
        const arr = groups.get(groomerName) ?? [];
        arr.push(item);
        groups.set(groomerName, arr);
      }
    } else if (repurchaseGroupBy === 'service') {
      for (const item of list) {
        const category = item.serviceCategory;
        const arr = groups.get(category) ?? [];
        arr.push(item);
        groups.set(category, arr);
      }
    } else if (repurchaseGroupBy === 'status') {
      for (const item of list) {
        const label = repurchaseStatusConfig[item.status].label;
        const arr = groups.get(label) ?? [];
        arr.push(item);
        groups.set(label, arr);
      }
    }

    const result = Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: key,
      items,
    }));

    if (repurchaseGroupBy === 'status') {
      const statusOrder = ['已过期', '7天内', '稍后', '已预约'];
      result.sort((a, b) => statusOrder.indexOf(a.label) - statusOrder.indexOf(b.label));
    } else {
      result.sort((a, b) => a.label.localeCompare(b.label));
    }

    return result;
  }, [filteredRepurchaseData, repurchaseGroupBy]);

  const viewFilteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (groomerFilter !== 'all' && a.groomerId !== groomerFilter) return false;
      if (serviceFilter !== 'all') {
        const svc = getService(a.serviceId);
        if (!svc || svc.category !== serviceFilter) return false;
      }
      return true;
    });
  }, [appointments, groomerFilter, serviceFilter, getService]);

  const calendarRange = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    if (viewMode === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    return [cursor];
  }, [viewMode, cursor]);

  const getDayAppointments = (day: Date) =>
    viewFilteredAppointments.filter((a) => isSameDay(new Date(a.startAt), day));

  const conflicts = useMemo(() => {
    const result: string[] = [];
    const byGroomerDay = new Map<string, Appointment[]>();
    for (const a of appointments) {
      if (a.status === 'cancelled' || a.status === 'completed') continue;
      const key = `${a.groomerId}_${format(new Date(a.startAt), 'yyyy-MM-dd')}`;
      const arr = byGroomerDay.get(key) ?? [];
      arr.push(a);
      byGroomerDay.set(key, arr);
    }
    for (const arr of byGroomerDay.values()) {
      const sorted = [...arr].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = differenceInMinutes(new Date(sorted[i + 1].startAt), new Date(sorted[i].endAt));
        if (gap < 5) {
          if (!result.includes(sorted[i].id)) result.push(sorted[i].id);
          if (!result.includes(sorted[i + 1].id)) result.push(sorted[i + 1].id);
        }
      }
    }
    return result;
  }, [appointments]);

  const conflictDays = useMemo(() => {
    const days = new Set<string>();
    for (const id of conflicts) {
      const a = appointments.find((x) => x.id === id);
      if (a) days.add(format(new Date(a.startAt), 'yyyy-MM-dd'));
    }
    return days;
  }, [conflicts, appointments]);

  const filteredList = useMemo(() => {
    const start = startOfDay(subDays(new Date(), 30));
    const end = endOfDay(new Date());
    let list = appointments.filter((a) =>
      isWithinInterval(new Date(a.createdAt), { start, end })
    );
    if (groomerFilter !== 'all') {
      list = list.filter((a) => a.groomerId === groomerFilter);
    }
    if (serviceFilter !== 'all') {
      list = list.filter((a) => {
        const svc = getService(a.serviceId);
        return svc?.category === serviceFilter;
      });
    }
    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => {
        const member = getMember(a.memberId);
        const pet = getPet(a.petId);
        return (
          (member?.name.toLowerCase().includes(q) ?? false) ||
          (member?.phone.includes(q) ?? false) ||
          (pet?.name.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return list.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
  }, [appointments, groomerFilter, serviceFilter, statusFilter, search, getService, getMember, getPet]);

  const goPrev = () => {
    if (viewMode === 'month') setCursor(subMonths(cursor, 1));
    else if (viewMode === 'week') setCursor(new Date(cursor.getTime() - 7 * 86400000));
    else setCursor(new Date(cursor.getTime() - 86400000));
  };
  const goNext = () => {
    if (viewMode === 'month') setCursor(addMonths(cursor, 1));
    else if (viewMode === 'week') setCursor(new Date(cursor.getTime() + 7 * 86400000));
    else setCursor(new Date(cursor.getTime() + 86400000));
  };

  const headerLabel = useMemo(() => {
    if (viewMode === 'month') return format(cursor, 'yyyy年 M月', { locale: zhCN });
    if (viewMode === 'week') {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      const e = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(s, 'M月d日')} - ${format(e, 'M月d日')}`;
    }
    return format(cursor, 'yyyy年 M月d日 EEEE', { locale: zhCN });
  }, [viewMode, cursor]);

  const showToast = (text: string) => {
    setActionToast(text);
    setTimeout(() => setActionToast(null), 2000);
  };

  const handleEditSave = async (id: string, data: Partial<Appointment>) => {
    const startAt = new Date(data.startAt!);
    const endAt = new Date(data.endAt!);
    const groomerId = data.groomerId!;
    const conflict = checkConflict(groomerId, startAt, endAt, id);
    if (conflict) {
      return false;
    }
    updateAppointment(id, data);
    showToast('预约更新成功');
    setEditModal(null);
    return true;
  };

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sage-700">预约管理</h1>
            <p className="mt-1 text-sm text-sage-400">查看、安排和管理所有美容预约</p>
          </div>
          <button
            onClick={() => navigate('/appointments/new')}
            className="flex items-center gap-2 rounded-xl2 bg-sage-500 px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-sage-600 hover:shadow-card-hover"
          >
            <Plus size={18} /> 新建预约
          </button>
        </div>

        <div className="rounded-2xl2 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full bg-cream-100 p-1">
              {(['calendar', 'list', 'repurchase'] as MainView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setMainView(v)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
                    mainView === v
                      ? 'bg-sage-500 text-white shadow-sm'
                      : 'text-sage-600 hover:text-sage-700'
                  )}
                >
                  {v === 'calendar' ? '日历视图' : v === 'list' ? '列表视图' : '复购跟进'}
                </button>
              ))}
            </div>

            {mainView === 'calendar' && (
              <div className="flex rounded-xl2 bg-cream-100 p-1">
                {(['month', 'week', 'day'] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all',
                      viewMode === m
                        ? 'bg-white text-sage-700 shadow-sm'
                        : 'text-sage-500 hover:text-sage-700'
                    )}
                  >
                    {m === 'month' ? <CalendarDays size={15} /> : m === 'week' ? <LayoutGrid size={15} /> : <List size={15} />}
                    {m === 'month' ? '月' : m === 'week' ? '周' : '日'}
                  </button>
                ))}
              </div>
            )}

            {mainView === 'calendar' && (
              <div className="flex items-center gap-1 rounded-xl2 border border-cream-200 bg-white px-1">
                <button
                  onClick={goPrev}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sage-500 transition-colors hover:bg-cream-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setCursor(new Date())}
                  className="flex h-8 items-center justify-center rounded-lg px-2 text-xs font-semibold text-sage-600 transition-colors hover:bg-cream-100"
                >
                  今天
                </button>
                <span className="min-w-[130px] px-2 text-center text-sm font-semibold text-sage-700">{headerLabel}</span>
                <button
                  onClick={goNext}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sage-500 transition-colors hover:bg-cream-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            {mainView !== 'repurchase' && (
              <>
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索客户 / 宠物 / 手机号"
                    className="w-full rounded-xl2 border border-cream-200 bg-cream-50/50 py-2 pl-9 pr-3 text-sm text-sage-700 placeholder:text-sage-400 transition-colors focus:border-sage-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={15} className="text-sage-400" />
                  <div className="flex flex-wrap gap-1.5">
                    {statusFilters.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                          statusFilter === f.key
                            ? 'bg-sage-500 text-white shadow-sm'
                            : 'bg-cream-100 text-sage-500 hover:bg-cream-200'
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                    <select
                      value={groomerFilter}
                      onChange={(e) => setGroomerFilter(e.target.value)}
                      className="appearance-none rounded-xl2 border border-cream-200 bg-cream-50/50 py-2 pl-8 pr-9 text-sm text-sage-700 transition-colors focus:border-sage-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100"
                    >
                      <option value="all">全部美容师</option>
                      {activeGroomers.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-sage-400" />
                  </div>

                  <div className="relative">
                    <Scissors size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value as ServiceCategory | 'all')}
                      className="appearance-none rounded-xl2 border border-cream-200 bg-cream-50/50 py-2 pl-8 pr-9 text-sm text-sage-700 transition-colors focus:border-sage-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100"
                    >
                      <option value="all">全部服务</option>
                      {serviceCategoryOptions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronRight size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-sage-400" />
                  </div>
                </div>
              </>
            )}

            {mainView === 'repurchase' && (
              <>
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                  <input
                    value={repurchaseSearch}
                    onChange={(e) => setRepurchaseSearch(e.target.value)}
                    placeholder="搜索宠物名 / 会员名 / 手机号"
                    className="w-full rounded-xl2 border border-cream-200 bg-cream-50/50 py-2 pl-9 pr-3 text-sm text-sage-700 placeholder:text-sage-400 transition-colors focus:border-sage-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-sage-500">分组：</span>
                  <select
                    value={repurchaseGroupBy}
                    onChange={(e) => setRepurchaseGroupBy(e.target.value as RepurchaseGroupBy)}
                    className="appearance-none rounded-xl2 border border-cream-200 bg-cream-50/50 py-2 pl-3 pr-8 text-sm text-sage-700 transition-colors focus:border-sage-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sage-100"
                  >
                    <option value="none">不分组</option>
                    <option value="groomer">按美容师分组</option>
                    <option value="service">按服务类型分组</option>
                    <option value="status">按状态分组</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {quickFilterOptions.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setRepurchaseQuickFilter(f.key)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                        repurchaseQuickFilter === f.key
                          ? 'bg-sage-500 text-white shadow-sm'
                          : 'bg-cream-100 text-sage-500 hover:bg-cream-200'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {mainView !== 'repurchase' && (groomerFilter !== 'all' || serviceFilter !== 'all') && (
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-cream-100">
              <span className="text-xs text-sage-500">当前筛选：</span>
              {groomerFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-3 py-1 text-xs font-medium text-sage-700">
                  💇 {getGroomer(groomerFilter)?.name}
                  <button
                    onClick={() => setGroomerFilter('all')}
                    className="ml-1 text-sage-500 hover:text-sage-700 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {serviceFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky2-100 px-3 py-1 text-xs font-medium text-sky2-700">
                  ✂️ {serviceFilter}
                  <button
                    onClick={() => setServiceFilter('all')}
                    className="ml-1 text-sky2-500 hover:text-sky2-700 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {(groomerFilter !== 'all' || serviceFilter !== 'all') && (
                <button
                  onClick={() => {
                    setGroomerFilter('all');
                    setServiceFilter('all');
                  }}
                  className="ml-auto text-xs text-sage-500 hover:text-sage-700 font-medium transition-colors"
                >
                  清除全部筛选
                </button>
              )}
            </div>
          )}
        </div>

        {mainView !== 'repurchase' && conflictDays.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-2xl2 border border-terracotta-200 bg-terracotta-50/70 p-4"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-terracotta-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-terracotta-600">⚠️ 预约冲突提醒</p>
              <p className="mt-1 text-xs text-terracotta-500/80">
                检测到 {conflictDays.size} 天存在同一美容师连续且间隔不足 5 分钟的预约，请合理安排时间。
              </p>
            </div>
          </motion.div>
        )}

        {mainView === 'calendar' && (
          <div className="rounded-2xl2 bg-white p-5 shadow-soft">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-sage-500 mr-1">美容师快速筛选：</span>
            <button
              onClick={() => setGroomerFilter('all')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                groomerFilter === 'all'
                  ? 'bg-sage-500 text-white shadow-sm'
                  : 'bg-cream-100 text-sage-500 hover:bg-cream-200'
              )}
            >
              全部
            </button>
            {activeGroomers.map((g) => {
              const selected = groomerFilter === g.id;
              const unselected = groomerFilter !== 'all' && !selected;
              return (
                <button
                  key={g.id}
                  onClick={() => setGroomerFilter(selected ? 'all' : g.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-2 py-1 transition-all',
                    selected
                      ? 'bg-sage-50 ring-2 ring-sage-400 shadow-sm'
                      : unselected
                        ? 'opacity-50 hover:opacity-80'
                        : 'hover:bg-cream-50'
                  )}
                  title={g.name}
                >
                  <Avatar name={g.name} className="w-7 h-7 text-xs" />
                  <span className={cn(
                    'text-xs font-medium',
                    selected ? 'text-sage-700' : unselected ? 'text-sage-400' : 'text-sage-600'
                  )}>
                    {g.name.charAt(g.name.length - 1)}
                  </span>
                </button>
              );
            })}
          </div>

          {viewMode === 'day' ? (
            <DayView
              day={calendarRange[0]}
              getDayAppointments={getDayAppointments}
              getPet={getPet}
              getMember={getMember}
              getService={getService}
              getGroomer={getGroomer}
              conflicts={conflicts}
              navigate={navigate}
              onEdit={(a) => setEditModal(a)}
            />
          ) : (
            <>
              <div className="mb-3 grid grid-cols-7 gap-1.5">
                {weekDays.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-sage-500">
                    周{d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarRange.map((day) => {
                  const apts = getDayAppointments(day);
                  const inMonth = isSameMonth(day, cursor);
                  const isCur = isToday(day);
                  const isFocused = focusedDay ? isSameDay(day, focusedDay) : false;
                  const hasConflict = conflictDays.has(format(day, 'yyyy-MM-dd'));
                  return (
                    <div
                      key={day.toISOString()}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoverDay(day);
                        setHoverPos({ x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setHoverDay(null)}
                      onClick={() => setFocusedDay(isFocused ? null : day)}
                      className={cn(
                        'group relative min-h-[110px] cursor-pointer rounded-xl2 border p-2.5 transition-all duration-200',
                        isCur ? 'bg-sage-100/60 border-sage-300' : 'border-cream-100 bg-cream-50/30 hover:bg-cream-50',
                        !inMonth && 'opacity-40',
                        isFocused && 'ring-2 ring-sage-400 border-sage-300 bg-white shadow-soft'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                            isCur ? 'bg-sage-500 text-white' : 'text-sage-600'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {apts.length > 0 && (
                          <span className="rounded-full bg-terracotta-400/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {apts.length}
                          </span>
                        )}
                      </div>
                      {hasConflict && (
                        <div className="absolute right-2 top-9">
                          <AlertCircle size={11} className="text-terracotta-400" />
                        </div>
                      )}
                      <div className="mt-1.5 space-y-1">
                        {apts.slice(0, viewMode === 'week' ? 4 : 3).map((a) => {
                          const pet = getPet(a.petId);
                          const svc = getService(a.serviceId);
                          const cfg = statusConfig[a.status];
                          const petShort = pet?.name.slice(0, 2) ?? '?';
                          const svcShort = svc?.name.slice(0, 2) ?? '?';
                          const isConflict = conflicts.includes(a.id);
                          return (
                            <div
                              key={a.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/appointments/' + a.id);
                              }}
                              className={cn(
                                'flex cursor-pointer items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white',
                                cfg.bg,
                                a.status === 'cancelled' && 'opacity-60 line-through',
                                isConflict && 'ring-1 ring-terracotta-500 ring-offset-0.5'
                              )}
                            >
                              <span className="font-mono opacity-90">{format(new Date(a.startAt), 'HH:mm')}</span>
                              <span className="truncate">
                                {petShort}·{svcShort}
                              </span>
                            </div>
                          );
                        })}
                        {apts.length > (viewMode === 'week' ? 4 : 3) && (
                          <div className="truncate rounded-md bg-sage-100 px-1.5 py-0.5 text-center text-[10px] font-medium text-sage-500">
                            +{apts.length - (viewMode === 'week' ? 4 : 3)} 更多
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <AnimatePresence>
            {focusedDay && viewMode !== 'day' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 overflow-hidden border-t border-cream-200 pt-5"
              >
                <DayView
                  day={focusedDay}
                  getDayAppointments={getDayAppointments}
                  getPet={getPet}
                  getMember={getMember}
                  getService={getService}
                  getGroomer={getGroomer}
                  conflicts={conflicts}
                  compact
                  navigate={navigate}
                  onEdit={(a) => setEditModal(a)}
                />
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        )}

        {mainView !== 'repurchase' && (
          <div className="rounded-2xl2 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-cream-100 p-5">
              <h3 className="text-base font-semibold text-sage-700">最近 30 天预约</h3>
            <span className="rounded-full bg-cream-100 px-2.5 py-0.5 text-xs font-medium text-sage-500">
              共 {filteredList.length} 条
            </span>
          </div>
          <div className="divide-y divide-cream-100">
            {filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays size={32} className="text-sage-300" />
                <p className="mt-3 text-sm font-medium text-sage-500">暂无匹配的预约记录</p>
              </div>
            ) : (
              filteredList.slice(0, 30).map((a) => {
                const member = getMember(a.memberId);
                const pet = getPet(a.petId);
                const svc = getService(a.serviceId);
                const grm = getGroomer(a.groomerId);
                const cfg = statusConfig[a.status];
                const isConflict = conflicts.includes(a.id);
                const canEdit = a.status !== 'completed' && a.status !== 'cancelled';
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-cream-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-terracotta-500">
                          {format(new Date(a.startAt), 'MM-dd HH:mm')}
                        </span>
                        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', cfg.className)}>
                          {cfg.label}
                        </span>
                        {isConflict && (
                          <span className="flex items-center gap-0.5 rounded-full bg-terracotta-100 px-2 py-0.5 text-[11px] font-medium text-terracotta-500">
                            <AlertCircle size={11} /> 冲突
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="font-medium text-sage-700">👤 {member?.name}</span>
                        <span className="text-sage-500">📱 {member?.phone}</span>
                        <span className="text-sage-700">🐾 {pet?.name}（{pet?.breed}）</span>
                        <span className="text-sage-500">✂️ {svc?.name}</span>
                        <span className="text-sage-400">💇 {grm?.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/appointments/' + a.id)}
                        className="flex cursor-pointer items-center gap-1 rounded-lg border border-cream-200 bg-white px-3 py-1.5 text-xs font-medium text-sage-600 transition-colors hover:bg-cream-50 hover:text-sage-700"
                        title="查看详情"
                      >
                        <Eye size={14} /> 详情
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => setEditModal(a)}
                          className="flex items-center gap-1 rounded-full bg-sky2-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky2-600 shadow-soft"
                          title="编辑预约"
                        >
                          <Pencil size={13} /> 编辑
                        </button>
                      )}
                      {(a.status === 'confirmed' || a.status === 'in_service') && (
                        <button
                          onClick={() => {
                            setCompleteModal(a);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-sage-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sage-600"
                          title="完成服务"
                        >
                          <CheckCircle2 size={14} /> 完成
                        </button>
                      )}
                      {a.status !== 'completed' && a.status !== 'cancelled' && (
                        <button
                          onClick={() => cancelAppointment(a.id)}
                          className="flex items-center gap-1 rounded-lg border border-petal-200 bg-petal-50 px-3 py-1.5 text-xs font-medium text-petal-400 transition-colors hover:bg-petal-100"
                          title="取消预约"
                        >
                          <XCircle size={14} /> 取消
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          </div>
        )}

        {mainView === 'repurchase' && (
          <div className="space-y-6">
            {groupedRepurchaseData.map((group) => (
              <div key={group.key} className="space-y-3">
                {repurchaseGroupBy !== 'none' && (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-sage-700">{group.label}</h3>
                    <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-semibold text-sage-600">
                      {group.items.length}
                    </span>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <RepurchaseCard
                      key={item.pet.id}
                      data={item}
                      expanded={expandedFeedback === item.pet.id}
                      onToggleExpand={() =>
                        setExpandedFeedback(expandedFeedback === item.pet.id ? null : item.pet.id)
                      }
                      onViewAppointment={() => {
                        if (item.futureAppointment) {
                          navigate('/appointments/' + item.futureAppointment.id);
                        }
                      }}
                      onQuickReorder={() => {
                        const params = new URLSearchParams();
                        params.set('petId', item.pet.id);
                        if (item.lastService?.service.id) {
                          params.set('serviceId', item.lastService.service.id);
                        }
                        if (item.lastService?.groomer?.id) {
                          params.set('groomerId', item.lastService.groomer.id);
                        }
                        params.set('quickReorder', '1');
                        navigate('/appointments/new?' + params.toString());
                      }}
                    />
                  ))}
                </div>
                {group.items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays size={32} className="text-sage-300" />
                    <p className="mt-3 text-sm font-medium text-sage-500">暂无匹配的跟进记录</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {hoverDay && (() => {
          const apts = getDayAppointments(hoverDay);
          if (apts.length === 0) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                left: Math.min(Math.max(hoverPos.x - 120, 12), window.innerWidth - 260),
                top: hoverPos.y + 8,
                zIndex: 50,
              }}
              className="w-[260px] rounded-xl2 border border-cream-200 bg-white p-3 shadow-card-hover"
            >
              <p className="mb-2 text-xs font-semibold text-sage-600">
                {format(hoverDay, 'M月d日 EEEE', { locale: zhCN })} · {apts.length} 单
              </p>
              <div className="space-y-1.5">
                {apts.slice(0, 5).map((a) => {
                  const pet = getPet(a.petId);
                  const svc = getService(a.serviceId);
                  const cfg = statusConfig[a.status];
                  return (
                    <div key={a.id} className="flex items-center gap-2 rounded-md bg-cream-50/70 px-2 py-1.5">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', cfg.bg)} />
                      <span className="font-mono text-[11px] text-sage-500">
                        {format(new Date(a.startAt), 'HH:mm')}
                      </span>
                      <span className="truncate text-xs font-medium text-sage-700">
                        {pet?.name} · {svc?.name}
                      </span>
                    </div>
                  );
                })}
                {apts.length > 5 && (
                  <p className="text-center text-[11px] text-sage-400">还有 {apts.length - 5} 单...</p>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <AnimatePresence>
        {completeModal && (
          <CompletePaymentModal
            open={!!completeModal}
            appointment={completeModal}
            members={members}
            services={services}
            pets={pets}
            onClose={() => setCompleteModal(null)}
            completeAppointment={completeAppointment}
            createFollowUp={createFollowUp}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      <AppointmentEditModal
        open={!!editModal}
        appointment={editModal}
        services={services}
        groomers={groomers}
        members={members}
        pets={pets}
        onClose={() => setEditModal(null)}
        onSave={handleEditSave}
      />

      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-xl2 bg-sage-600 text-white text-sm font-medium shadow-card-hover flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            {actionToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RepurchaseCardProps {
  data: RepurchaseCardData;
  expanded: boolean;
  onToggleExpand: () => void;
  onViewAppointment: () => void;
  onQuickReorder: () => void;
}

function RepurchaseCard({
  data,
  expanded,
  onToggleExpand,
  onViewAppointment,
  onQuickReorder,
}: RepurchaseCardProps) {
  const { pet, member, lastService, lastFollowUp, nextSuggestionDate, suggestionSource, futureAppointment, status } = data;
  const statusCfg = repurchaseStatusConfig[status];
  const feedback = lastFollowUp?.customerFeedback || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl2 border border-cream-200 bg-white p-5 shadow-soft hover:shadow-card-hover transition-all"
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <Avatar name={pet.name} className="w-14 h-14 text-lg" />
          <div className="text-center">
            <p className="text-sm font-bold text-sage-700">{pet.name}</p>
            <p className="text-xs text-sage-400">{pet.breed}</p>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-sage-600">
              👤 {member.name}
            </span>
            <span className="text-xs text-sage-400">📱 {member.phone}</span>
            <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', statusCfg.className)}>
              {statusCfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-sage-500">上次服务</p>
              {lastService ? (
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-sage-700 truncate">
                    {lastService.service.name}
                  </p>
                  <p className="text-xs text-sage-500">
                    {format(lastService.date, 'yyyy-MM-dd')}
                  </p>
                  <p className="text-xs text-sage-500">
                    💇 {lastService.groomer?.name ?? '未分配'}
                  </p>
                  <p className="text-xs font-semibold text-terracotta-500">
                    ¥{lastService.amount}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-sage-400">暂无服务记录</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-sage-500">客户反馈</p>
              {feedback ? (
                <div
                  className="cursor-pointer group"
                  onClick={onToggleExpand}
                >
                  <p
                    className={cn(
                      'text-xs text-sage-600 leading-relaxed',
                      !expanded && 'line-clamp-2'
                    )}
                  >
                    {feedback}
                  </p>
                  <p className="text-[11px] text-sky2-500 mt-0.5 group-hover:text-sky2-600">
                    {expanded ? '收起' : '展开查看'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-sage-400">暂无反馈</p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-cream-100 space-y-2">
            {nextSuggestionDate ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-sage-600">
                  📅 建议下次：
                </span>
                <span className="text-sm font-semibold text-sage-700">
                  {format(nextSuggestionDate, 'yyyy-MM-dd')}
                </span>
                <span className="text-[11px] text-sage-400">
                  （来源：{suggestionSource === 'follow_up' ? '回访记录' : '系统推算'}）
                </span>
              </div>
            ) : (
              <p className="text-xs text-sage-400">📅 暂无下次建议</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            {futureAppointment ? (
              <>
                <span className="rounded-full bg-sky2-100 px-3 py-1 text-xs font-semibold text-sky2-600">
                  已预约
                </span>
                <button
                  onClick={onViewAppointment}
                  className="rounded-xl2 bg-sky2-500 px-4 py-2 text-xs font-medium text-white shadow-soft transition-all hover:bg-sky2-600"
                >
                  查看预约
                </button>
              </>
            ) : (
              <button
                onClick={onQuickReorder}
                className="rounded-xl2 bg-sage-500 px-4 py-2 text-xs font-medium text-white shadow-soft transition-all hover:bg-sage-600 flex items-center gap-1.5"
              >
                📅 快速预约
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DayView({
  day,
  getDayAppointments,
  getPet,
  getMember,
  getService,
  getGroomer,
  conflicts,
  compact,
  navigate,
  onEdit,
}: {
  day: Date;
  getDayAppointments: (d: Date) => Appointment[];
  getPet: FinderFn<Pet>;
  getMember: FinderFn<Member>;
  getService: FinderFn<Service>;
  getGroomer: FinderFn<Groomer>;
  conflicts: string[];
  compact?: boolean;
  navigate: (path: string) => void;
  onEdit: (a: Appointment) => void;
}) {
  const apts = getDayAppointments(day).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
  if (apts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CalendarDays size={26} className="text-sage-300" />
        <p className="mt-2 text-sm text-sage-400">
          {format(day, 'M月d日', { locale: zhCN })} 暂无预约
        </p>
      </div>
    );
  }
  return (
    <div className={cn('space-y-3', !compact && 'mt-2')}>
      {!compact && (
        <p className="text-sm font-semibold text-sage-600">
          📅 {format(day, 'M月d日 EEEE', { locale: zhCN })} · {apts.length} 单
        </p>
      )}
      {apts.map((a) => {
        const cfg = statusConfig[a.status];
        const pet = getPet(a.petId);
        const member = getMember(a.memberId);
        const svc = getService(a.serviceId);
        const grm = getGroomer(a.groomerId);
        const isConflict = conflicts.includes(a.id);
        const canEdit = a.status !== 'completed' && a.status !== 'cancelled';
        return (
          <div
            key={a.id}
            onClick={() => navigate('/appointments/' + a.id)}
            className={cn(
              'relative flex cursor-pointer flex-wrap items-center gap-4 rounded-xl2 border p-4 transition-all',
              isConflict ? 'border-terracotta-200 bg-terracotta-50/50' : 'border-cream-200/70 bg-cream-50/40',
              'hover:border-sage-200 hover:bg-white hover:shadow-soft'
            )}
          >
            {canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(a);
                }}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-sky2-500 text-white shadow-soft transition-all hover:bg-sky2-600 hover:scale-105 z-10"
                title="编辑预约"
              >
                <Pencil size={13} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className={cn('h-10 w-1.5 rounded-full', cfg.bg)} />
              <div>
                <p className="font-mono text-sm font-bold text-terracotta-500">
                  {format(new Date(a.startAt), 'HH:mm')} - {format(new Date(a.endAt), 'HH:mm')}
                </p>
                <p className="text-xs text-sage-400">
                  时长 {Math.round((new Date(a.endAt).getTime() - new Date(a.startAt).getTime()) / 60000)} 分钟
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sage-700">🐾 {pet?.name}</span>
                <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', cfg.className)}>
                  {cfg.label}
                </span>
                {isConflict && (
                  <span className="flex items-center gap-0.5 rounded-full bg-terracotta-100 px-2 py-0.5 text-[11px] font-medium text-terracotta-500">
                    <AlertCircle size={11} /> 时间冲突
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sage-500">
                <span>👤 {member?.name}</span>
                <span>📱 {member?.phone}</span>
                <span>
                  ✂️ {svc?.name} <span className="font-semibold text-terracotta-500">¥{svc?.price}</span>
                </span>
                <span>💇 {grm?.name}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
