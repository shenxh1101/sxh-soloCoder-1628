import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  User,
  PawPrint,
  Scissors,
  Clock,
  CalendarDays,
  MessageSquareText,
  CheckCircle2,
  XCircle,
  PlayCircle,
  AlertCircle,
  X,
  Wallet,
  Ticket,
  Banknote,
  MessageCircle,
  CreditCard as CreditCardIcon,
  StickyNote,
  Send,
  History,
  ArrowRight,
  Star,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { format, parseISO, addMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Appointment, AppointmentStatus, PayType, ConsumptionRecord, Service, Groomer } from '@/types';

const statusBannerConfig: Record<AppointmentStatus, { bg: string; text: string; label: string; desc: string }> = {
  pending: { bg: 'bg-petal-100', text: 'text-petal-700', label: '待确认', desc: '客户已提交预约，等待您确认' },
  confirmed: { bg: 'bg-sage-100', text: 'text-sage-700', label: '已确认', desc: '预约已确认，请按时服务' },
  in_service: { bg: 'bg-terracotta-100', text: 'text-terracotta-700', label: '服务中', desc: '正在为宠物进行美容服务' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-600', label: '已完成', desc: '本次服务已完成' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: '已取消', desc: '本次预约已取消' },
};

const smsStatusConfig: Record<string, { label: string; className: string }> = {
  sent: { label: '已发送', className: 'bg-sage-100 text-sage-600 border-sage-200' },
  pending: { label: '待发送', className: 'bg-cream-100 text-sage-600 border-cream-200' },
  failed: { label: '发送失败', className: 'bg-petal-100 text-petal-600 border-petal-200' },
  disabled: { label: '未启用', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const payOptions: { key: PayType; label: string; icon: typeof Wallet; color: string; desc: string }[] = [
  { key: 'balance', label: '余额', icon: Wallet, color: 'bg-sage-500 hover:bg-sage-600', desc: '直接从会员余额扣除' },
  { key: 'credit', label: '次卡', icon: Ticket, color: 'bg-sky2-400 hover:bg-sky2-300', desc: '使用剩余服务次数' },
  { key: 'cash', label: '现金', icon: Banknote, color: 'bg-terracotta-400 hover:bg-terracotta-500', desc: '线下现金收款' },
  { key: 'wechat', label: '微信', icon: MessageCircle, color: 'bg-green-500 hover:bg-green-600', desc: '扫码支付' },
  { key: 'alipay', label: '支付宝', icon: CreditCardIcon, color: 'bg-blue-500 hover:bg-blue-600', desc: '扫码支付' },
];

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

interface EditAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  apt: Appointment;
  services: Service[];
  groomers: Groomer[];
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  checkConflict: (groomerId: string, startAt: Date, endAt: Date, excludeId?: string) => Appointment | null;
  showToast: (text: string) => void;
}

function EditAppointmentModal({
  open,
  onClose,
  apt,
  services,
  groomers,
  updateAppointment,
  checkConflict,
  showToast,
}: EditAppointmentModalProps) {
  const activeServices = services.filter((s) => s.isActive);
  const activeGroomers = groomers.filter((g) => g.isActive);
  const currentService = services.find((s) => s.id === apt.serviceId);

  const [serviceId, setServiceId] = useState(apt.serviceId);
  const [groomerId, setGroomerId] = useState(apt.groomerId);
  const [dateStr, setDateStr] = useState(format(parseISO(apt.startAt), 'yyyy-MM-dd'));
  const [timeStr, setTimeStr] = useState(format(parseISO(apt.startAt), 'HH:mm'));
  const [conflictError, setConflictError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setServiceId(apt.serviceId);
      setGroomerId(apt.groomerId);
      setDateStr(format(parseISO(apt.startAt), 'yyyy-MM-dd'));
      setTimeStr(format(parseISO(apt.startAt), 'HH:mm'));
      setConflictError(null);
    }
  }, [open, apt]);

  const selectedService = services.find((s) => s.id === serviceId);
  const duration = selectedService?.duration ?? currentService?.duration ?? 60;

  const computeEndAt = () => {
    const start = new Date(`${dateStr}T${timeStr}`);
    return addMinutes(start, duration);
  };

  const handleSave = () => {
    setConflictError(null);
    const startAt = new Date(`${dateStr}T${timeStr}`);
    const endAt = computeEndAt();
    if (isNaN(startAt.getTime())) {
      setConflictError('请选择有效的日期和时间');
      return;
    }
    const conflict = checkConflict(groomerId, startAt, endAt, apt.id);
    if (conflict) {
      setConflictError('该美容师此时间段已有预约，请调整');
      return;
    }
    updateAppointment(apt.id, {
      serviceId,
      groomerId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    });
    showToast('预约已更新');
    onClose();
  };

  const timeOptions: string[] = [];
  for (let h = 9; h <= 20; h++) {
    timeOptions.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 20) timeOptions.push(`${String(h).padStart(2, '0')}:30`);
  }

  if (!open) return null;

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
                <Pencil className="w-4 h-4 text-terracotta-400" />
                编辑预约
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

          <div className="space-y-5">
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
                          ? 'border-terracotta-400 bg-terracotta-50 shadow-soft'
                          : 'border-sage-100 bg-white hover:border-sage-200 hover:bg-cream-50',
                      )}
                    >
                      <Avatar name={g.name} className="w-10 h-10" />
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'text-sm font-semibold truncate',
                          selected ? 'text-terracotta-600' : 'text-sage-700',
                        )}>
                          {g.name}
                        </div>
                        <div className="text-xs text-sage-400 truncate">{g.phone}</div>
                      </div>
                      {selected && <CheckCircle2 className="w-4 h-4 text-terracotta-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  <CalendarDays className="w-4 h-4 inline mr-1.5 -mt-0.5 text-sage-500" />
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
                <span className="text-sage-500">预计结束</span>
                <span className="font-semibold text-terracotta-500">
                  {format(computeEndAt(), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            </div>

            {conflictError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-petal-50 border border-petal-200 p-3 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-petal-500 shrink-0 mt-0.5" />
                <span className="text-sm text-petal-600 font-medium">{conflictError}</span>
              </motion.div>
            )}
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
              className="flex-1 px-4 py-2.5 rounded-xl bg-terracotta-400 text-white text-sm font-semibold hover:bg-terracotta-500 transition-colors shadow-soft"
            >
              保存修改
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
  apt: Appointment;
  member: { id: string; name: string; phone: string; balance: number; points: number; serviceCredits: { serviceId: string; count: number }[] };
  service: { id: string; name: string; price: number };
  pet?: { name: string };
  completeAppointment: (id: string, payType: PayType) => { success: boolean; error?: string };
  showToast: (text: string) => void;
  navigateToList: () => void;
}

function CompletePaymentModal({
  open,
  onClose,
  apt,
  member,
  service,
  pet,
  completeAppointment,
  showToast,
  navigateToList,
}: CompletePaymentModalProps) {
  const [selectedPayType, setSelectedPayType] = useState<PayType | null>(null);
  const [completeMsg, setCompleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedPayType(null);
      setCompleteMsg(null);
    }
  }, [open]);

  const creditCount = member.serviceCredits.find((c) => c.serviceId === service.id)?.count ?? 0;
  const balanceDisabled = member.balance < service.price;
  const creditDisabled = creditCount <= 0;

  const payTypeLabel: Record<PayType, string> = {
    balance: '余额',
    credit: '次卡',
    cash: '现金',
    wechat: '微信',
    alipay: '支付宝',
  };

  const newBalance = selectedPayType === 'balance' ? member.balance - service.price : member.balance;
  const newCredits = selectedPayType === 'credit' ? creditCount - 1 : creditCount;

  const handleConfirm = () => {
    if (!selectedPayType) return;
    const res = completeAppointment(apt.id, selectedPayType);
    if (res.success) {
      setCompleteMsg({ type: 'success', text: '服务完成，消费记录已生成' });
      showToast('服务已完成');
      setTimeout(() => {
        onClose();
        navigateToList();
      }, 1200);
    } else {
      setCompleteMsg({ type: 'error', text: res.error ?? '操作失败' });
      setTimeout(() => setCompleteMsg(null), 2000);
    }
  };

  if (!open) return null;

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

export default function AppointmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const appointments = useAppStore((s) => s.appointments);
  const members = useAppStore((s) => s.members);
  const pets = useAppStore((s) => s.pets);
  const services = useAppStore((s) => s.services);
  const groomers = useAppStore((s) => s.groomers);
  const consumptionRecords = useAppStore((s) => s.consumptionRecords);
  const updateAppointment = useAppStore((s) => s.updateAppointment);
  const cancelAppointment = useAppStore((s) => s.cancelAppointment);
  const completeAppointment = useAppStore((s) => s.completeAppointment);
  const checkConflict = useAppStore((s) => s.checkConflict);
  const initData = useAppStore((s) => s.initData);
  const initialized = useAppStore((s) => s.initialized);

  useEffect(() => {
    initData();
  }, [initData]);

  const apt = useMemo(() => appointments.find((a) => a.id === id), [appointments, id]);
  const member = useMemo(() => members.find((m) => m.id === apt?.memberId), [members, apt]);
  const pet = useMemo(() => pets.find((p) => p.id === apt?.petId), [pets, apt]);
  const service = useMemo(() => services.find((s) => s.id === apt?.serviceId), [services, apt]);
  const groomer = useMemo(() => groomers.find((g) => g.id === apt?.groomerId), [groomers, apt]);
  const relatedConsumption = useMemo(
    () => consumptionRecords.find((c) => c.appointmentId === apt?.id) ?? null,
    [consumptionRecords, apt],
  );

  const [showComplete, setShowComplete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const isLoading = !initialized || appointments.length === 0;
  const aptNotFound = !apt && !isLoading;

  const showToast = (text: string) => {
    setActionToast(text);
    setTimeout(() => setActionToast(null), 2000);
  };

  const navigateToList = () => {
    setTimeout(() => {
      navigate('/appointments');
    }, 1000);
  };

  const handleConfirm = () => {
    if (!apt) return;
    updateAppointment(apt.id, { status: 'confirmed' });
    showToast('预约已确认');
    navigateToList();
  };

  const handleStart = () => {
    if (!apt) return;
    updateAppointment(apt.id, { status: 'in_service' });
    showToast('服务已开始');
    navigateToList();
  };

  const handleCancel = () => {
    if (!apt) return;
    cancelAppointment(apt.id);
    setShowCancel(false);
    showToast('预约已取消');
    navigateToList();
  };

  const handleComplete = (payType: PayType) => {
    if (!apt) return;
    const res = completeAppointment(apt.id, payType);
    if (res.success) {
      showToast('服务已完成');
      setShowComplete(false);
      navigateToList();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 border-4 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
          <p className="text-sage-500 text-sm font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  if (aptNotFound || !apt) {
    return (
      <div className="min-h-screen bg-cream-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-petal-400 mb-3" />
          <p className="text-sage-600 font-medium mb-3">预约不存在或已被删除</p>
          <button
            onClick={() => navigate('/appointments')}
            className="text-sage-500 hover:text-sage-700 text-sm font-medium underline underline-offset-4"
          >
            返回预约列表
          </button>
        </div>
      </div>
    );
  }

  const banner = statusBannerConfig[apt.status];
  const sms = smsStatusConfig[apt.smsStatus];

  const canConfirm = apt.status === 'pending';
  const canStart = apt.status === 'confirmed';
  const canComplete = apt.status === 'in_service';
  const canCancel = apt.status === 'pending' || apt.status === 'confirmed' || apt.status === 'in_service';
  const canEdit = apt.status !== 'completed' && apt.status !== 'cancelled';

  const duration = service?.duration
    ? Math.round((new Date(apt.endAt).getTime() - new Date(apt.startAt).getTime()) / 60000)
    : null;

  const remindOffset = (() => {
    try {
      return localStorage.getItem('pet_remind_offset') || '2h';
    } catch {
      return '2h';
    }
  })();
  const remindOffsetMap: Record<string, string> = {
    '1h': '提前1小时',
    '2h': '提前2小时',
    '12h': '提前12小时',
    '24h': '提前24小时',
  };
  const remindOffsetText = remindOffsetMap[remindOffset] || '提前2小时';

  return (
    <div className="min-h-screen bg-cream-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <nav className="flex items-center gap-2 text-sm text-sage-500 flex-wrap">
          <button
            onClick={() => navigate('/appointments')}
            className="font-medium hover:text-sage-700 transition-colors flex items-center gap-1 hover:bg-sage-50 px-2.5 py-1.5 rounded-lg -ml-2.5"
          >
            <ChevronLeft className="w-4 h-4" />
            预约管理
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-sage-300" />
          <span className="font-semibold text-sage-700 bg-sage-50 px-2.5 py-1 rounded-lg">
            预约详情
          </span>
          <div className="ml-auto text-xs text-sage-400 font-mono bg-white px-2.5 py-1 rounded-lg border border-sage-100">
            ID: {apt.id}
          </div>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={cn('rounded-2xl2 p-5 sm:p-6', banner.bg)}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border', banner.bg, banner.text, 'border-white/50')}>
                  <span className="relative flex h-2 w-2">
                    <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', banner.text.replace('text-', 'bg-'))} />
                    <span className={cn('relative inline-flex rounded-full h-2 w-2', banner.text.replace('text-', 'bg-'))} />
                  </span>
                  {banner.label}
                </div>
                {canEdit && (
                  <button
                    onClick={() => setShowEdit(true)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 bg-terracotta-400 hover:bg-terracotta-500 text-white text-xs font-semibold shadow-soft transition-all hover:-translate-y-0.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    编辑预约
                  </button>
                )}
              </div>
              <h1 className={cn('mt-3 text-2xl font-bold', banner.text)}>
                {pet?.name ?? '未知宠物'} · {service?.name ?? '未知服务'}
              </h1>
              <p className={cn('mt-1 text-sm opacity-90', banner.text)}>{banner.desc}</p>
            </div>
            <div className="text-right shrink-0">
              <div className={cn('text-2xl font-bold', banner.text)}>
                {format(parseISO(apt.startAt), 'HH:mm')}
                <span className="mx-1 opacity-60">—</span>
                {format(parseISO(apt.endAt), 'HH:mm')}
              </div>
              <div className={cn('text-sm opacity-80 mt-0.5', banner.text)}>
                {format(parseISO(apt.startAt), 'yyyy年M月d日 EEEE', { locale: zhCN })}
              </div>
              {duration && (
                <div className={cn('text-xs opacity-70 mt-1', banner.text)}>
                  共 {duration} 分钟
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="lg:col-span-2 space-y-5"
          >
            <InfoBlock icon={User} title="客户信息">
              {member ? (
                <button
                  onClick={() => navigate(`/members/${member.id}`)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl bg-cream-50 hover:bg-cream-100 transition-colors text-left group"
                >
                  <Avatar name={member.name} className="w-14 h-14 text-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sage-800">{member.name}</span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        member.level === '钻石' && 'bg-terracotta-100 text-terracotta-600',
                        member.level === '金卡' && 'bg-cream-300 text-sage-700',
                        member.level === '银卡' && 'bg-sky2-100 text-sky2-600',
                        member.level === '普通' && 'bg-sage-100 text-sage-600',
                      )}>
                        {member.level}
                      </span>
                      <ArrowRight className="w-4 h-4 text-sage-300 group-hover:text-sage-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    <div className="text-sm text-sage-500 mb-1.5">{member.phone}</div>
                    <div className="flex gap-4 text-xs">
                      <span className="text-sage-600">
                        余额 <span className="font-semibold text-terracotta-500">¥{member.balance}</span>
                      </span>
                      <span className="text-sage-600">
                        积分 <span className="font-semibold text-sage-700">{member.points}</span>
                      </span>
                    </div>
                  </div>
                </button>
              ) : (
                <EmptyHint text="客户信息已丢失" />
              )}
            </InfoBlock>

            <InfoBlock icon={PawPrint} title="宠物信息">
              {pet ? (
                <div className="p-3 rounded-xl bg-cream-50">
                  <div className="flex items-center gap-4">
                    <Avatar name={pet.name} className="w-14 h-14 text-lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sage-800 text-lg">{pet.name}</span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          pet.gender === '公' ? 'bg-sky2-100 text-sky2-600' : 'bg-petal-100 text-petal-400',
                        )}>
                          {pet.gender === '公' ? '公' : '母'}
                        </span>
                      </div>
                      <div className="text-sm text-sage-500 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>品种：{pet.breed}</span>
                        {pet.weight && <span>{pet.weight}kg</span>}
                        {pet.birthday && <span>{pet.birthday}</span>}
                      </div>
                      {pet.notes && (
                        <div className="mt-2 p-2 rounded-lg bg-white text-xs text-sage-500 border border-cream-200">
                          {pet.notes}
                        </div>
                      )}
                    </div>
                    {member && (
                      <button
                        onClick={() => navigate(`/members/${member.id}`)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-sage-200 text-xs font-medium text-sage-600 hover:bg-sage-50 hover:text-sage-700 transition-colors shrink-0"
                      >
                        <History className="w-3.5 h-3.5" />
                        服务历史
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyHint text="宠物信息已丢失" />
              )}
            </InfoBlock>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <InfoBlock icon={Scissors} title="服务信息">
                {service ? (
                  <div className="p-3 rounded-xl bg-cream-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sage-100 text-sage-600 font-medium">
                        {service.category}
                      </span>
                    </div>
                    <div className="font-semibold text-sage-800 text-lg mb-2">{service.name}</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sage-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        时长 {service.duration} 分钟
                      </span>
                      {service.pointsCost && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" />
                          可积分兑换 {service.pointsCost}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-cream-200">
                      <span className="text-xs text-sage-500">服务金额</span>
                      <div className="text-2xl font-bold text-terracotta-500 mt-0.5">¥{service.price}</div>
                    </div>
                  </div>
                ) : (
                  <EmptyHint text="服务信息已丢失" />
                )}
              </InfoBlock>

              <InfoBlock icon={User} title="美容师">
                {groomer ? (
                  <div className="p-3 rounded-xl bg-cream-50 h-full">
                    <div className="flex items-center gap-3">
                      <Avatar name={groomer.name} className="w-14 h-14 text-lg" />
                      <div>
                        <div className="font-semibold text-sage-800 text-lg">{groomer.name}</div>
                        <div className="text-xs text-sage-500 mt-0.5">{groomer.phone}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyHint text="未分配美容师" />
                )}
              </InfoBlock>
            </div>

            <InfoBlock icon={CalendarDays} title="预约时间">
              <div className="p-3 rounded-xl bg-cream-50">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div>
                    <div className="text-xs text-sage-500 mb-0.5">日期</div>
                    <div className="font-semibold text-sage-800">
                      {format(parseISO(apt.startAt), 'yyyy-MM-dd EEEE', { locale: zhCN })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-sage-500 mb-0.5">时间</div>
                    <div className="font-semibold text-sage-800">
                      {format(parseISO(apt.startAt), 'HH:mm')} — {format(parseISO(apt.endAt), 'HH:mm')}
                    </div>
                  </div>
                  {duration && (
                    <div>
                      <div className="text-xs text-sage-500 mb-0.5">时长</div>
                      <div className="font-semibold text-sage-800">{duration} 分钟</div>
                    </div>
                  )}
                </div>
              </div>
            </InfoBlock>

            {apt.notes && (
              <InfoBlock icon={StickyNote} title="预约备注">
                <div className="p-4 rounded-xl bg-cream-50 text-sm text-sage-700 whitespace-pre-wrap leading-relaxed border-l-4 border-terracotta-300">
                  {apt.notes}
                </div>
              </InfoBlock>
            )}

            {apt.status === 'completed' && relatedConsumption && (
              <InfoBlock icon={Banknote} title="消费记录">
                <ConsumptionCard
                  record={relatedConsumption}
                  serviceName={service?.name}
                  groomerName={groomer?.name}
                />
              </InfoBlock>
            )}

            <InfoBlock icon={Send} title="短信通知状态">
              <div className="p-3 rounded-xl bg-cream-50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Send className="w-5 h-5 text-sage-500" />
                  </div>
                  <div>
                    <div className="font-medium text-sage-700">预约提醒短信</div>
                    <div className="text-xs text-sage-500 mt-0.5">
                      {member?.phone
                        ? `已发送至 ${member.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`
                        : '无手机号'}
                    </div>
                    <div className="text-xs text-sage-400 mt-0.5">
                      {remindOffsetText}提醒
                    </div>
                  </div>
                </div>
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
                  sms.className,
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', apt.smsStatus === 'sent' ? 'bg-sage-500' : apt.smsStatus === 'failed' ? 'bg-petal-500' : 'bg-sage-400')} />
                  {sms.label}
                </span>
              </div>
            </InfoBlock>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="space-y-5"
          >
            <div className="rounded-2xl2 bg-white p-5 shadow-soft border border-sage-100/60 sticky top-4">
              <h3 className="text-base font-semibold text-sage-700 mb-4 flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-sage-500" />
                操作面板
              </h3>

              <div className="space-y-2.5">
                {canEdit && (
                  <button
                    onClick={() => setShowEdit(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-terracotta-200 hover:border-terracotta-300 hover:bg-terracotta-50/50 transition-all duration-200 text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-terracotta-100">
                      <Pencil size={20} className="text-terracotta-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-terracotta-600">编辑预约</div>
                      <div className="text-xs text-terracotta-400/80">修改服务、美容师或时间</div>
                    </div>
                  </button>
                )}
                {canConfirm && (
                  <ActionButton
                    icon={CheckCircle2}
                    label="确认预约"
                    desc="确认该预约并通知客户"
                    color="bg-sage-500 hover:bg-sage-600"
                    onClick={handleConfirm}
                  />
                )}
                {canStart && (
                  <ActionButton
                    icon={PlayCircle}
                    label="开始服务"
                    desc="美容师已开始服务"
                    color="bg-terracotta-500 hover:bg-terracotta-600"
                    onClick={handleStart}
                  />
                )}
                {canComplete && (
                  <ActionButton
                    icon={CheckCircle2}
                    label="完成服务并收款"
                    desc="结束服务并生成消费记录"
                    color="bg-sage-500 hover:bg-sage-600"
                    onClick={() => {
                      setShowComplete(true);
                    }}
                  />
                )}
                {canCancel && (
                  <ActionButton
                    icon={XCircle}
                    label="取消预约"
                    desc="取消本次预约"
                    color="bg-petal-400 hover:bg-petal-500"
                    variant="outline"
                    onClick={() => setShowCancel(true)}
                  />
                )}
                {!canConfirm && !canStart && !canComplete && !canCancel && !canEdit && (
                  <div className="py-6 text-center text-sm text-sage-400">
                    当前状态无可执行操作
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-cream-200">
                <h4 className="text-xs font-semibold text-sage-500 mb-2.5">状态流转</h4>
                <div className="flex items-center gap-1 text-[11px] flex-wrap">
                  {(['pending', 'confirmed', 'in_service', 'completed'] as AppointmentStatus[]).map((s, i, arr) => {
                    const done = arr.indexOf(apt.status) > i || apt.status === 'cancelled' ? false : (
                      apt.status === s ? true : arr.indexOf(apt.status) > i
                    );
                    const current = apt.status === s;
                    const cfg = statusBannerConfig[s];
                    return (
                      <div key={s} className="flex items-center gap-1">
                        <span className={cn(
                          'px-2 py-0.5 rounded-md font-medium',
                          current ? cfg.bg + ' ' + cfg.text : done ? 'bg-sage-100 text-sage-600' : 'bg-gray-100 text-gray-400',
                          current && 'ring-2 ring-offset-1 ring-sage-300',
                        )}>
                          {statusBannerConfig[s].label}
                        </span>
                        {i < arr.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-sage-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl2 bg-white p-5 shadow-soft border border-sage-100/60">
              <h3 className="text-xs font-semibold text-sage-500 mb-3">创建时间</h3>
              <div className="text-sm font-medium text-sage-700">
                {format(new Date(apt.createdAt), 'yyyy-MM-dd HH:mm:ss')}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={() => navigate('/appointments')}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <ChevronLeft className="w-4 h-4" />
            返回预约管理
          </button>
        </div>
      </div>

      <EditAppointmentModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        apt={apt}
        services={services}
        groomers={groomers}
        updateAppointment={updateAppointment}
        checkConflict={checkConflict}
        showToast={showToast}
      />

      {member && service && (
        <CompletePaymentModal
          open={showComplete}
          onClose={() => setShowComplete(false)}
          apt={apt}
          member={member}
          service={service}
          pet={pet}
          completeAppointment={completeAppointment}
          showToast={showToast}
          navigateToList={navigateToList}
        />
      )}

      <AnimatePresence>
        {showCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-sage-700/30 backdrop-blur-sm p-4"
            onClick={() => setShowCancel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl2 bg-white p-6 shadow-card-hover"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-petal-100 shrink-0">
                  <AlertCircle size={24} className="text-petal-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-sage-700">确认取消预约？</h3>
                  <p className="mt-1 text-sm text-sage-500 leading-relaxed">
                    取消后将无法恢复。如果客户已支付，需要手动退款。
                  </p>
                  <div className="mt-3 p-3 rounded-xl bg-cream-50 text-sm">
                    <div className="text-sage-600">
                      {pet?.name} · {service?.name}
                    </div>
                    <div className="text-xs text-sage-500 mt-1">
                      {format(parseISO(apt.startAt), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancel(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-sage-200 text-sm font-medium text-sage-600 hover:bg-sage-50 transition-colors"
                >
                  再想想
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-petal-500 text-white text-sm font-medium hover:bg-petal-600 transition-colors shadow-soft"
                >
                  确认取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl bg-sage-600 text-white text-sm font-medium shadow-soft-lg z-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {actionToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl2 bg-white p-5 shadow-soft border border-sage-100/60">
      <h3 className="text-sm font-semibold text-sage-700 mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream-100">
          <Icon size={16} className="text-sage-600" />
        </div>
        {title}
      </h3>
      {children}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="py-6 text-center text-sm text-sage-400">{text}</div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  desc,
  color,
  variant,
  onClick,
}: {
  icon: typeof CheckCircle2;
  label: string;
  desc: string;
  color: string;
  variant?: 'outline';
  onClick: () => void;
}) {
  if (variant === 'outline') {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left',
          'border-petal-200 hover:border-petal-300 hover:bg-petal-50/50',
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-petal-100">
          <Icon size={20} className="text-petal-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-petal-600">{label}</div>
          <div className="text-xs text-petal-400/80">{desc}</div>
        </div>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-white shadow-soft transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0 text-left',
        color,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs opacity-80">{desc}</div>
      </div>
    </button>
  );
}

const payTypeLabels: Record<PayType, { label: string; className: string }> = {
  balance: { label: '余额', className: 'bg-sage-100 text-sage-600' },
  credit: { label: '次卡', className: 'bg-sky2-100 text-sky2-600' },
  cash: { label: '现金', className: 'bg-terracotta-100 text-terracotta-600' },
  wechat: { label: '微信', className: 'bg-green-100 text-green-600' },
  alipay: { label: '支付宝', className: 'bg-blue-100 text-blue-600' },
};

function ConsumptionCard({
  record,
  serviceName,
  groomerName,
}: {
  record: ConsumptionRecord;
  serviceName?: string;
  groomerName?: string;
}) {
  const pay = payTypeLabels[record.payType];
  return (
    <div className="rounded-xl bg-gradient-to-br from-sage-50 to-cream-50 border border-sage-100 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sage-800">{serviceName ?? '服务消费'}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', pay.className)}>
              {pay.label}支付
            </span>
          </div>
          <div className="text-xs text-sage-500">
            {format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-terracotta-500">¥{record.amount}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-sage-100/80 text-xs">
        <div>
          <span className="text-sage-400">美容师</span>
          <div className="font-medium text-sage-700 mt-0.5">{groomerName ?? '-'}</div>
        </div>
        <div>
          <span className="text-sage-400">获得积分</span>
          <div className="font-medium text-sage-700 mt-0.5">+{record.pointsEarned}</div>
        </div>
      </div>
      {record.notes && (
        <div className="mt-3 pt-3 border-t border-sage-100/80 text-xs text-sage-500">
          {record.notes}
        </div>
      )}
      <div className="mt-2 text-[11px] text-sage-400 font-mono">ID：{record.id}</div>
    </div>
  );
}
