import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  Wallet,
  Scissors,
  PlusCircle,
  UserPlus,
  CreditCard,
  CheckCircle2,
  Bell,
  AlertTriangle,
  ChevronRight,
  X,
  Search,
  Check,
  Banknote,
  Smartphone,
  CalendarClock,
  PawPrint,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import {
  isToday,
  format,
  isWithinInterval,
  startOfDay,
  endOfDay,
  addDays,
} from 'date-fns';
import type { AppointmentStatus, Member, RechargeRule, PaymentMethod } from '@/types';
import { computeAllPetCareCycles, type PetCareCycle } from '@/utils/careCycle';

const statusConfig: Record<AppointmentStatus, { label: string; className: string; dot: string }> = {
  pending: { label: '待确认', className: 'bg-petal-100 text-petal-400', dot: 'bg-petal-400' },
  confirmed: { label: '已确认', className: 'bg-sage-100 text-sage-600', dot: 'bg-sage-500' },
  in_service: { label: '服务中', className: 'bg-terracotta-100 text-terracotta-500', dot: 'bg-terracotta-400' },
  completed: { label: '已完成', className: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  cancelled: { label: '已取消', className: 'bg-gray-100 text-gray-400', dot: 'bg-gray-300' },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

type NewMemberForm = {
  name: string;
  phone: string;
};

function NewMemberModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const createMember = useAppStore((s) => s.createMember);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewMemberForm>();

  const onSubmit = (data: NewMemberForm) => {
    createMember(data);
    reset();
    onClose();
    onSuccess('会员添加成功');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-md bg-cream-50 rounded-2xl2 shadow-card-hover"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between p-6 border-b border-cream-200">
              <h2 className="text-xl font-bold text-sage-700">新增会员</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-cream-200 text-sage-500 hover:text-sage-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-600 mb-1.5">
                  姓名 <span className="text-terracotta-500">*</span>
                </label>
                <input
                  {...register('name', { required: '请输入姓名' })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-cream-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent"
                  placeholder="请输入会员姓名"
                />
                {errors.name && <p className="text-xs text-terracotta-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-sage-600 mb-1.5">
                  手机号 <span className="text-terracotta-500">*</span>
                </label>
                <input
                  {...register('phone', {
                    required: '请输入手机号',
                    pattern: { value: /^1\d{10}$/, message: '请输入正确的11位手机号' },
                  })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-cream-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent"
                  placeholder="请输入11位手机号"
                />
                {errors.phone && <p className="text-xs text-terracotta-500 mt-1">{errors.phone.message}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-cream-200 text-sage-600 font-semibold hover:bg-cream-300 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-sage-500 text-white font-semibold hover:bg-sage-600 active:scale-[0.98] transition-all shadow-soft"
                >
                  确认添加
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RechargeRuleCard({
  rule,
  selected,
  onClick,
}: {
  rule: RechargeRule;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative text-left p-4 rounded-2xl border-2 transition-all',
        selected
          ? 'border-sage-500 bg-white shadow-soft-lg scale-[1.02]'
          : 'border-cream-200 bg-white hover:border-sage-300 hover:shadow-soft'
      )}
    >
      {rule.tag && (
        <span className="absolute -top-2 -right-2 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-terracotta-400 text-white shadow-soft">
          {rule.tag}
        </span>
      )}
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-sage-700">¥{rule.amount}</span>
      </div>
      {rule.bonusAmount > 0 && (
        <div className="text-sm text-green-600 font-semibold mb-1">
          赠 ¥{rule.bonusAmount}
        </div>
      )}
      {rule.bonusCredits.length > 0 && (
        <div className="space-y-0.5">
          {rule.bonusCredits.map((bc, i) => (
            <div key={i} className="text-xs text-sage-500">
              赠 <span className="text-green-600 font-medium">{bc.serviceName}</span> ×{bc.count}
            </div>
          ))}
        </div>
      )}
      {selected && (
        <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-sage-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

function QuickRechargeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const members = useAppStore((s) => s.members);
  const rechargeRules = useAppStore((s) => s.rechargeRules);
  const rechargeMember = useAppStore((s) => s.rechargeMember);

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('微信');

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [members, memberSearch]);

  const activeRules = rechargeRules.filter((r) => r.isActive);

  const selectedMember = members.find((m) => m.id === selectedMemberId) || null;
  const selectedRuleData = activeRules.find((r) => r.id === selectedRule) || null;

  const resetAndClose = () => {
    setMemberSearch('');
    setSelectedMemberId('');
    setSelectedRule(null);
    setPayMethod('微信');
    onClose();
  };

  const handleConfirm = () => {
    if (!selectedMemberId) return;
    if (!selectedRule) return;
    try {
      const rec = rechargeMember(selectedMemberId, selectedRule, payMethod);
      onSuccess(`充值成功：${rec.amount + rec.bonusAmount}元`);
      resetAndClose();
    } catch (e) {
      onSuccess('充值失败');
    }
  };

  const payOptions: { value: PaymentMethod; icon: typeof Banknote; label: string }[] = [
    { value: '现金', icon: Banknote, label: '现金' },
    { value: '微信', icon: Smartphone, label: '微信' },
    { value: '支付宝', icon: CreditCard, label: '支付宝' },
    { value: '刷卡', icon: CreditCard, label: '刷卡' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={resetAndClose} />
          <motion.div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-cream-50 rounded-2xl2 shadow-card-hover"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-cream-50 border-b border-cream-200 rounded-t-2xl2">
              <div>
                <h2 className="text-xl font-bold text-sage-700">快速充值</h2>
                {selectedMember && (
                  <p className="text-sm text-sage-500 mt-0.5">
                    {selectedMember.name} · 当前余额 ¥{selectedMember.balance.toFixed(2)}
                  </p>
                )}
              </div>
              <button
                onClick={resetAndClose}
                className="p-2 rounded-xl hover:bg-cream-200 text-sage-500 hover:text-sage-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-sage-600 mb-3">选择会员</h3>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400" />
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="搜索姓名或手机号..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-cream-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent shadow-soft"
                  />
                </div>
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-cream-100 divide-y divide-cream-50 bg-white">
                  {filteredMembers.map((m: Member) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMemberId(m.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 text-left hover:bg-cream-50 transition-colors',
                        selectedMemberId === m.id && 'bg-sage-50'
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sage-200 to-petal-100 flex items-center justify-center font-medium text-sage-700">
                        {m.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-sage-700 truncate">
                          {m.name} · {m.phone}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-sage-400">余额</div>
                        <div className="text-sm font-semibold text-terracotta-500">
                          ¥{m.balance}
                        </div>
                      </div>
                      {selectedMemberId === m.id && (
                        <Check className="w-4 h-4 text-sage-500" />
                      )}
                    </button>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="p-4 text-center text-sm text-sage-400">
                      未找到会员
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-sage-600 mb-3">选择充值档位</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {activeRules.map((rule) => (
                    <RechargeRuleCard
                      key={rule.id}
                      rule={rule}
                      selected={selectedRule === rule.id}
                      onClick={() => setSelectedRule(rule.id)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-sage-600 mb-3">支付方式</h3>
                <div className="grid grid-cols-4 gap-3">
                  {payOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setPayMethod(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                          payMethod === opt.value
                            ? 'border-sage-500 bg-sage-50 text-sage-700'
                            : 'border-cream-200 bg-white text-sage-500 hover:border-sage-300'
                        )}
                      >
                        <Icon size={20} />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedRuleData && (
                <div className="p-4 bg-white rounded-xl border border-cream-200">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-sage-500">实付金额</span>
                    <span className="font-semibold text-sage-700">
                      ¥{selectedRuleData.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sage-500">到账总额</span>
                    <span className="font-semibold text-terracotta-500">
                      ¥{(selectedRuleData.amount + selectedRuleData.bonusAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={!selectedMemberId || !selectedRule}
                className="w-full py-3.5 rounded-xl bg-sage-500 text-white font-semibold hover:bg-sage-600 active:scale-[0.98] transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认充值
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const appointments = useAppStore((s) => s.appointments);
  const members = useAppStore((s) => s.members);
  const pets = useAppStore((s) => s.pets);
  const services = useAppStore((s) => s.services);
  const groomers = useAppStore((s) => s.groomers);
  const getMonthlySummary = useAppStore((s) => s.getMonthlySummary);
  const getOpenIssues = useAppStore((s) => s.getOpenIssues);

  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const now = new Date();
  const summary = getMonthlySummary(now.getFullYear(), now.getMonth());

  const todayAppointments = appointments.filter((a) => isToday(new Date(a.startAt))).sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  const pendingServiceCount = appointments.filter(
    (a) => isToday(new Date(a.startAt)) && (a.status === 'confirmed' || a.status === 'in_service')
  ).length;

  const threeDaysStart = startOfDay(now);
  const threeDaysEnd = endOfDay(addDays(now, 2));
  const pendingInThreeDays = appointments
    .filter(
      (a) =>
        a.status === 'pending' &&
        isWithinInterval(new Date(a.startAt), { start: threeDaysStart, end: threeDaysEnd })
    )
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const lowBalanceMembers = members.filter((m) => m.balance < 100);

  const openIssues = getOpenIssues();

  const consumptionRecords = useAppStore((s) => s.consumptionRecords);
  const followUpRecords = useAppStore((s) => s.followUpRecords);

  const dueCareCycles = useMemo(() => {
    const allCycles = computeAllPetCareCycles(
      pets,
      members,
      consumptionRecords,
      followUpRecords,
      services,
      groomers
    );
    return allCycles
      .filter((c) => c.status === 'due_soon' || c.status === 'overdue')
      .sort((a, b) => a.daysUntilNext - b.daysUntilNext);
  }, [pets, members, consumptionRecords, followUpRecords, services, groomers]);

  const getPet = (id: string) => pets.find((p) => p.id === id);
  const getService = (id: string) => services.find((s) => s.id === id);
  const getGroomer = (id: string) => groomers.find((g) => g.id === id);
  const getMember = (id: string) => members.find((m) => m.id === id);

  const statCards = [
    {
      title: '今日预约数',
      value: todayAppointments.length,
      suffix: '单',
      icon: CalendarDays,
      gradient: 'from-cream-200 via-cream-100 to-cream-50',
      iconBg: 'bg-sage-100 text-sage-600',
    },
    {
      title: '待服务数',
      value: pendingServiceCount,
      suffix: '单',
      icon: Clock,
      gradient: 'from-terracotta-50 via-cream-50 to-cream-100',
      iconBg: 'bg-terracotta-100 text-terracotta-500',
    },
    {
      title: '本月充值额',
      value: summary.totalRecharge,
      suffix: '元',
      prefix: '¥',
      icon: Wallet,
      gradient: 'from-sage-50 via-sage-100 to-cream-100',
      iconBg: 'bg-sky2-100 text-sky2-400',
    },
    {
      title: '本月服务数',
      value: summary.totalServiceCount,
      suffix: '次',
      icon: Scissors,
      gradient: 'from-petal-50 via-cream-100 to-cream-200',
      iconBg: 'bg-petal-100 text-petal-400',
    },
  ];

  const quickActions = [
    { label: '新建预约', icon: PlusCircle, color: 'bg-sage-500 hover:bg-sage-600', onClick: () => navigate('/appointments/new') },
    { label: '新增会员', icon: UserPlus, color: 'bg-terracotta-400 hover:bg-terracotta-500', onClick: () => setNewMemberOpen(true) },
    { label: '快速充值', icon: CreditCard, color: 'bg-sky2-400 hover:bg-sky2-300', onClick: () => setRechargeOpen(true) },
    { label: '完成服务', icon: CheckCircle2, color: 'bg-petal-300 hover:bg-petal-400', onClick: () => navigate('/appointments') },
  ];

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-end justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-sage-700">工作台</h1>
            <p className="mt-1 text-sm text-sage-400">
              {format(now, 'yyyy年M月d日 EEEE')} · 祝你工作顺利 🌿
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map((card) => (
            <motion.div
              key={card.title}
              variants={item}
              className={cn(
                'group relative overflow-hidden rounded-2xl2 p-5 shadow-soft transition-all duration-300 hover:shadow-card-hover',
                'bg-gradient-to-br',
                card.gradient
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-sage-500/80">{card.title}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    {card.prefix && <span className="text-lg font-semibold text-sage-600">{card.prefix}</span>}
                    <span className="text-3xl font-bold tracking-tight text-sage-700">
                      {card.value.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-sage-500">{card.suffix}</span>
                  </div>
                </div>
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', card.iconBg)}>
                  <card.icon size={22} strokeWidth={2} />
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-white/30 blur-2xl" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="rounded-2xl2 bg-white p-5 shadow-soft"
        >
          <p className="mb-4 text-sm font-medium text-sage-600">快捷操作</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((act) => (
              <button
                key={act.label}
                onClick={act.onClick}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl2 py-4 text-white shadow-soft transition-all duration-200',
                  'hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0',
                  act.color
                )}
              >
                <act.icon size={24} strokeWidth={2} />
                <span className="text-sm font-medium">{act.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="rounded-2xl2 bg-white p-6 shadow-soft">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50">
                    <CalendarDays size={18} className="text-sage-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-sage-700">今日安排</h2>
                  <span className="rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-600">
                    {todayAppointments.length} 单
                  </span>
                </div>
                <button
                  onClick={() => navigate('/appointments')}
                  className="flex items-center gap-1 text-sm text-sage-500 transition-colors hover:text-sage-700"
                >
                  查看全部 <ChevronRight size={16} />
                </button>
              </div>

              {todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100">
                    <CalendarDays size={28} className="text-sage-400" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-sage-500">今日暂无预约安排</p>
                  <button
                    onClick={() => navigate('/appointments/new')}
                    className="mt-4 rounded-lg bg-sage-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sage-600"
                  >
                    新建预约
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-sage-200 via-cream-200 to-petal-100" />
                  <div className="space-y-4">
                    {todayAppointments.map((apt, idx) => {
                      const pet = getPet(apt.petId);
                      const service = getService(apt.serviceId);
                      const groomer = getGroomer(apt.groomerId);
                      const cfg = statusConfig[apt.status];
                      const start = new Date(apt.startAt);
                      const end = new Date(apt.endAt);
                      return (
                        <motion.div
                          key={apt.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.55 + idx * 0.08, duration: 0.35 }}
                          className="relative flex gap-4 pl-10"
                        >
                          <div
                            className={cn(
                              'absolute left-0 top-3 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white shadow-sm',
                              cfg.dot
                            )}
                          />
                          <div
                            onClick={() => navigate(`/appointments/${apt.id}`)}
                            className="flex-1 rounded-xl2 border border-cream-200/70 bg-cream-50/50 p-4 transition-all duration-200 hover:border-sage-200 hover:bg-white hover:shadow-soft cursor-pointer"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-semibold text-terracotta-500">
                                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                  </span>
                                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.className)}>
                                    {cfg.label}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-sm">
                                  <span className="flex items-center gap-1.5 font-medium text-sage-700">
                                    🐾 {pet?.name ?? '未知'}
                                  </span>
                                  <span className="text-sage-500">{service?.name ?? '未知服务'}</span>
                                  <span className="flex items-center gap-1 text-sage-400">
                                    <Scissors size={13} /> {groomer?.name ?? '未分配'}
                                  </span>
                                </div>
                                {apt.notes && (
                                  <p className="mt-2 line-clamp-1 text-xs text-sage-400">📝 {apt.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="space-y-6"
          >
            <div className="rounded-2xl2 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta-50">
                  <Bell size={16} className="text-terracotta-400" />
                </div>
                <h3 className="text-base font-semibold text-sage-700">待确认预约</h3>
                <span className="ml-auto rounded-full bg-petal-100 px-2 py-0.5 text-xs font-medium text-petal-400">
                  3天内 {pendingInThreeDays.length}
                </span>
              </div>
              {pendingInThreeDays.length === 0 ? (
                <div className="py-8 text-center text-sm text-sage-400">暂无待确认预约 ✨</div>
              ) : (
                <div className="space-y-2">
                  {pendingInThreeDays.slice(0, 5).map((apt) => {
                    const pet = getPet(apt.petId);
                    const member = getMember(apt.memberId);
                    const service = getService(apt.serviceId);
                    return (
                      <div
                        key={apt.id}
                        className="group rounded-xl border border-petal-100/50 bg-petal-50/40 p-3 transition-all hover:border-petal-200 hover:bg-white hover:shadow-soft"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-terracotta-500">
                              {format(new Date(apt.startAt), 'MM-dd HH:mm')}
                            </span>
                            <span className="rounded-md bg-petal-100 px-1.5 py-0.5 text-[11px] font-medium text-petal-400">
                              待确认
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-sage-700">🐾 {pet?.name}</span>
                          <span className="text-xs text-sage-500">{service?.name}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-sage-400">👤 {member?.name} · {member?.phone}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl2 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-petal-50">
                  <span className="text-base">⚠️</span>
                </div>
                <h3 className="text-base font-semibold text-sage-700">待处理问题</h3>
                <span className="ml-auto rounded-full bg-petal-500 px-2 py-0.5 text-xs font-medium text-white">
                  {openIssues.length} 项
                </span>
              </div>
              {openIssues.length === 0 ? (
                <div className="py-8 text-center text-sm text-sage-400">暂无待处理问题 ✨</div>
              ) : (
                <div className="space-y-2">
                  {openIssues.slice(0, 3).map((issue) => {
                    const pet = getPet(issue.petId);
                    const member = getMember(issue.memberId);
                    return (
                      <div
                        key={issue.id}
                        onClick={() => navigate(`/appointments/${issue.appointmentId}`)}
                        className="group rounded-xl border-2 border-petal-100 bg-petal-50/60 p-3 transition-all hover:border-petal-300 hover:bg-white hover:shadow-soft cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[11px] font-bold text-petal-600">
                            🐾 {pet?.name || '未知'}
                          </span>
                          <span className="text-[11px] text-sage-500">
                            👤 {member?.name || '未知'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            issue.issueType === 'unsatisfied' && 'bg-petal-100 text-petal-600 border border-petal-200',
                            issue.issueType === 'pet_abnormal' && 'bg-amber-100 text-amber-700 border border-amber-200',
                            issue.issueType === 'other' && 'bg-gray-100 text-gray-600 border border-gray-200',
                            !issue.issueType && 'bg-gray-100 text-gray-500',
                          )}>
                            {issue.issueType === 'unsatisfied' && '客户不满意'}
                            {issue.issueType === 'pet_abnormal' && '宠物异常'}
                            {issue.issueType === 'other' && '其他'}
                            {!issue.issueType && '问题'}
                          </span>
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                            issue.issueStatus === 'open' && 'bg-petal-100 text-petal-600',
                            issue.issueStatus === 'processing' && 'bg-amber-100 text-amber-700',
                          )}>
                            {issue.issueStatus === 'open' && '待处理'}
                            {issue.issueStatus === 'processing' && '处理中'}
                          </span>
                        </div>
                        {issue.issueDescription && (
                          <p className="mt-1.5 text-xs text-sage-600 line-clamp-1">
                            {issue.issueDescription}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {openIssues.length > 3 && (
                    <div className="pt-1 text-center">
                      <p className="text-[11px] text-sage-400">还有 {openIssues.length - 3} 项待处理...</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl2 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky2-50">
                  <AlertTriangle size={16} className="text-sky2-400" />
                </div>
                <h3 className="text-base font-semibold text-sage-700">余额提醒</h3>
                <span className="ml-auto rounded-full bg-sky2-100 px-2 py-0.5 text-xs font-medium text-sky2-400">
                  低于 ¥100 · {lowBalanceMembers.length}
                </span>
              </div>
              {lowBalanceMembers.length === 0 ? (
                <div className="py-8 text-center text-sm text-sage-400">所有会员余额充足 💰</div>
              ) : (
                <div className="space-y-2">
                  {lowBalanceMembers.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-sky2-100/50 bg-sky2-50/40 p-3 transition-all hover:border-sky2-200 hover:bg-white hover:shadow-soft"
                    >
                      <div>
                        <p className="text-sm font-medium text-sage-700">{m.name}</p>
                        <p className="mt-0.5 text-xs text-sage-400">{m.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-terracotta-500">¥{m.balance}</p>
                        <span
                          className={cn(
                            'mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                            m.level === '普通'
                              ? 'bg-gray-100 text-gray-500'
                              : m.level === '银卡'
                              ? 'bg-sky2-100 text-sky2-400'
                              : m.level === '金卡'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-purple-100 text-purple-500'
                          )}
                        >
                          {m.level}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl2 bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage-50">
                  <CalendarClock size={16} className="text-sage-500" />
                </div>
                <h3 className="text-base font-semibold text-sage-700">📌 待跟进护理</h3>
                <span className="ml-auto rounded-full bg-sage-100 px-2 py-0.5 text-xs font-medium text-sage-600">
                  {dueCareCycles.length} 只
                </span>
              </div>
              {dueCareCycles.length === 0 ? (
                <div className="py-8 text-center text-sm text-sage-400">
                  近期无待跟进护理，客户都很准时🐾
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dueCareCycles.slice(0, 6).map((cycle) => {
                    const isOverdue = cycle.status === 'overdue';
                    return (
                      <div
                        key={cycle.petId}
                        className={cn(
                          'group rounded-xl border p-3 transition-all hover:shadow-soft',
                          isOverdue
                            ? 'border-green-100/50 bg-green-50/40 hover:border-green-200 hover:bg-white'
                            : 'border-amber-100/50 bg-amber-50/40 hover:border-amber-200 hover:bg-white'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sage-700 text-sm flex items-center gap-1">
                                <PawPrint size={12} className={isOverdue ? 'text-green-500' : 'text-amber-500'} />
                                {cycle.petName}
                              </span>
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 text-[10px] font-semibold rounded-md',
                                  isOverdue
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-amber-100 text-amber-600'
                                )}
                              >
                                {isOverdue
                                  ? `过期${Math.abs(cycle.daysUntilNext)}天`
                                  : `还有${cycle.daysUntilNext}天`}
                              </span>
                            </div>
                            <p className="text-xs text-sage-500 mt-1 truncate">
                              👤 {cycle.memberName} · {cycle.nextServiceName}
                            </p>
                            <p className="text-[11px] text-sage-400 mt-0.5">
                              建议：{cycle.nextSuggestedDate ? format(cycle.nextSuggestedDate, 'MM-dd') : '暂无'}
                            </p>
                          </div>
                          {cycle.nextServiceId && (
                            <button
                              onClick={() => {
                                const params = new URLSearchParams();
                                params.set('petId', cycle.petId);
                                params.set('serviceId', cycle.nextServiceId);
                                if (cycle.lastGroomerId) {
                                  params.set('groomerId', cycle.lastGroomerId);
                                }
                                params.set('quickReorder', '1');
                                navigate(`/appointments/new?${params.toString()}`);
                              }}
                              className="shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-full bg-terracotta-400 text-white hover:bg-terracotta-500 transition-all flex items-center gap-1"
                            >
                              <CalendarDays size={10} />
                              快速预约
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <NewMemberModal
        open={newMemberOpen}
        onClose={() => setNewMemberOpen(false)}
        onSuccess={showToast}
      />

      <QuickRechargeModal
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        onSuccess={showToast}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-sage-700 text-white rounded-xl shadow-soft-lg font-medium"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
