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
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Appointment, AppointmentStatus, PayType, ConsumptionRecord } from '@/types';

const statusBannerConfig: Record<AppointmentStatus, { bg: string; text: string; label: string; desc: string }> = {
  pending: {
    bg: 'bg-petal-100',
    text: 'text-petal-700',
    label: '待确认',
    desc: '客户已提交预约，等待您确认',
  },
  confirmed: {
    bg: 'bg-sage-100',
    text: 'text-sage-700',
    label: '已确认',
    desc: '预约已确认，请按时服务',
  },
  in_service: {
    bg: 'bg-terracotta-100',
    text: 'text-terracotta-700',
    label: '服务中',
    desc: '正在为宠物进行美容服务',
  },
  completed: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    label: '已完成',
    desc: '本次服务已完成',
  },
  cancelled: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    label: '已取消',
    desc: '本次预约已取消',
  },
};

const smsStatusConfig: Record<string, { label: string; className: string }> = {
  sent: { label: '已发送', className: 'bg-sage-100 text-sage-600 border-sage-200' },
  pending: { label: '待发送', className: 'bg-cream-100 text-sage-600 border-cream-200' },
  failed: { label: '发送失败', className: 'bg-petal-100 text-petal-600 border-petal-200' },
  disabled: { label: '未启用', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const payOptions: { key: PayType; label: string; icon: typeof Wallet; color: string; desc: string }[] = [
  { key: 'balance', label: '余额支付', icon: Wallet, color: 'bg-sage-500 hover:bg-sage-600', desc: '直接从会员余额扣除' },
  { key: 'credit', label: '次卡抵扣', icon: Ticket, color: 'bg-sky2-400 hover:bg-sky2-300', desc: '使用剩余服务次数' },
  { key: 'cash', label: '现金支付', icon: Banknote, color: 'bg-terracotta-400 hover:bg-terracotta-500', desc: '线下现金收款' },
  { key: 'wechat', label: '微信支付', icon: MessageCircle, color: 'bg-green-500 hover:bg-green-600', desc: '扫码支付' },
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
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-medium shrink-0',
        color,
        className,
      )}
    >
      {initial}
    </div>
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
  const [completeMsg, setCompleteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const isLoading = !initialized || appointments.length === 0;
  const aptNotFound = !apt && !isLoading;

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

  if (aptNotFound) {
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

  const handleConfirm = () => {
    updateAppointment(apt.id, { status: 'confirmed' });
    setActionToast('预约已确认 ✓');
    setTimeout(() => setActionToast(null), 2000);
  };
  const handleStart = () => {
    updateAppointment(apt.id, { status: 'in_service' });
    setActionToast('服务已开始 ✂️');
    setTimeout(() => setActionToast(null), 2000);
  };
  const handleCancel = () => {
    cancelAppointment(apt.id);
    setShowCancel(false);
    setActionToast('预约已取消');
    setTimeout(() => setActionToast(null), 2000);
  };
  const handleComplete = (payType: PayType) => {
    const res = completeAppointment(apt.id, payType);
    if (res.success) {
      setCompleteMsg({ type: 'success', text: '服务完成，消费记录已生成 🎉' });
      setTimeout(() => {
        setShowComplete(false);
        setCompleteMsg(null);
        navigate(-1);
      }, 1500);
    } else {
      setCompleteMsg({ type: 'error', text: res.error ?? '操作失败' });
    }
  };

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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-sage-200 text-sm text-sage-600 hover:bg-sage-50 hover:text-sage-700 hover:border-sage-300 font-medium transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            返回列表
          </button>
          <div className="text-xs text-sage-400 font-mono">ID: {apt.id}</div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={cn('rounded-2xl2 p-5 sm:p-6', banner.bg)}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border', banner.bg, banner.text, 'border-white/50')}>
                <span className="relative flex h-2 w-2">
                  <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', banner.text.replace('text-', 'bg-'))} />
                  <span className={cn('relative inline-flex rounded-full h-2 w-2', banner.text.replace('text-', 'bg-'))} />
                </span>
                {banner.label}
              </div>
              <h1 className={cn('mt-3 text-2xl font-bold', banner.text)}>
                {pet?.name ?? '未知宠物'} · {service?.name ?? '未知服务'}
              </h1>
              <p className={cn('mt-1 text-sm opacity-90', banner.text)}>{banner.desc}</p>
            </div>
            <div className="text-right">
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
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          member.level === '钻石' && 'bg-terracotta-100 text-terracotta-600',
                          member.level === '金卡' && 'bg-cream-300 text-sage-700',
                          member.level === '银卡' && 'bg-sky2-100 text-sky2-600',
                          member.level === '普通' && 'bg-sage-100 text-sage-600',
                        )}
                      >
                        {member.level}
                      </span>
                      <ArrowRight className="w-4 h-4 text-sage-300 group-hover:text-sage-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    <div className="text-sm text-sage-500 mb-1.5">📱 {member.phone}</div>
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
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            pet.gender === '公' ? 'bg-sky2-100 text-sky2-600' : 'bg-petal-100 text-petal-400',
                          )}
                        >
                          {pet.gender === '公' ? '♂ 公' : '♀ 母'}
                        </span>
                      </div>
                      <div className="text-sm text-sage-500 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>🐶 品种：{pet.breed}</span>
                        {pet.weight && <span>⚖️ {pet.weight}kg</span>}
                        {pet.birthday && <span>🎂 {pet.birthday}</span>}
                      </div>
                      {pet.notes && (
                        <div className="mt-2 p-2 rounded-lg bg-white text-xs text-sage-500 border border-cream-200">
                          📝 {pet.notes}
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
                        <div className="text-xs text-sage-500 mt-0.5">📱 {groomer.phone}</div>
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
                      ⏰ {remindOffsetText}提醒
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
                    sms.className,
                  )}
                >
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
                      setCompleteMsg(null);
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
                {!canConfirm && !canStart && !canComplete && !canCancel && (
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
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md font-medium',
                            current ? cfg.bg + ' ' + cfg.text : done ? 'bg-sage-100 text-sage-600' : 'bg-gray-100 text-gray-400',
                            current && 'ring-2 ring-offset-1 ring-sage-300',
                          )}
                        >
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
      </div>

      <AnimatePresence>
        {showComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-sage-700/30 backdrop-blur-sm p-4"
            onClick={() => !completeMsg && setShowComplete(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl2 bg-white p-6 shadow-card-hover"
            >
              {completeMsg ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-full',
                      completeMsg.type === 'success' ? 'bg-sage-100' : 'bg-petal-100',
                    )}
                  >
                    {completeMsg.type === 'success' ? (
                      <CheckCircle2 size={28} className="text-sage-500" />
                    ) : (
                      <XCircle size={28} className="text-petal-400" />
                    )}
                  </div>
                  <p className="mt-4 text-base font-semibold text-sage-700">{completeMsg.text}</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-sage-700">完成服务 · 收款</h3>
                      <p className="mt-1 text-xs text-sage-400">请选择本次服务的支付方式</p>
                    </div>
                    <button
                      onClick={() => setShowComplete(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sage-400 transition-colors hover:bg-cream-100 hover:text-sage-600"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {member && service && (
                    <div className="mb-5 rounded-xl2 bg-cream-50 p-4">
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sage-500">客户</span>
                          <span className="font-medium text-sage-700">{member.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sage-500">宠物</span>
                          <span className="font-medium text-sage-700">🐾 {pet?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sage-500">服务项目</span>
                          <span className="font-medium text-sage-700">{service.name}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-cream-200">
                          <span className="text-sage-500">服务金额</span>
                          <span className="text-xl font-bold text-terracotta-500">¥{service.price}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-sage-400">可用余额</span>
                          <span className={cn('font-semibold', member.balance >= service.price ? 'text-sage-600' : 'text-petal-500')}>
                            ¥{member.balance}
                          </span>
                        </div>
                        {(() => {
                          const creditCount = member.serviceCredits.find((c) => c.serviceId === service.id)?.count ?? 0;
                          return (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-sage-400">剩余次卡次数</span>
                              <span className={cn('font-semibold', creditCount > 0 ? 'text-sage-600' : 'text-sage-400')}>
                                {creditCount} 次
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {payOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => handleComplete(opt.key)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl2 px-4 py-3 text-left text-white shadow-soft transition-all duration-200',
                          'hover:-translate-y-0.5 hover:shadow-card-hover active:translate-y-0',
                          opt.color,
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
                          <opt.icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">{opt.label}</div>
                          <div className="text-xs opacity-80 truncate">{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

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
          📝 {record.notes}
        </div>
      )}
      <div className="mt-2 text-[11px] text-sage-400 font-mono">单号：{record.id}</div>
    </div>
  );
}
