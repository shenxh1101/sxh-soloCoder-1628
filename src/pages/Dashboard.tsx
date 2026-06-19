import { useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
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
import type { AppointmentStatus } from '@/types';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const initData = useAppStore((s) => s.initData);
  const getMonthlySummary = useAppStore((s) => s.getMonthlySummary);

  useEffect(() => {
    initData();
  }, [initData]);

  const { appointments, members, pets, services, groomers } = useAppStore.getState();

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
    { label: '新建预约', icon: PlusCircle, color: 'bg-sage-500 hover:bg-sage-600', to: '/appointments/new' },
    { label: '新增会员', icon: UserPlus, color: 'bg-terracotta-400 hover:bg-terracotta-500', to: '/members/new' },
    { label: '快速充值', icon: CreditCard, color: 'bg-sky2-400 hover:bg-sky2-300', to: '/recharge' },
    { label: '完成服务', icon: CheckCircle2, color: 'bg-petal-300 hover:bg-petal-400', to: '/appointments' },
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
                onClick={() => navigate(act.to)}
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
                          <div className="flex-1 rounded-xl2 border border-cream-200/70 bg-cream-50/50 p-4 transition-all duration-200 hover:border-sage-200 hover:bg-white hover:shadow-soft">
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}
