import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Wallet,
  Gift,
  TrendingUp,
  ShoppingBag,
  Pencil,
  X,
  CreditCard,
  Smartphone,
  Banknote,
  PawPrint,
  CalendarDays,
  Scissors,
  UserRound,
  Plus,
  Minus,
  ChevronDown,
  ArrowLeft,
  Save,
  Tag,
  MessageSquareText,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAppStore } from '@/store';
import {
  Member,
  MemberLevel,
  RechargeRule,
  PaymentMethod,
  PayType,
} from '@/types';
import { cn } from '@/lib/utils';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const levelColors: Record<MemberLevel, string> = {
  普通: 'bg-gray-100 text-gray-600 border-gray-200',
  银卡: 'bg-sky2-100 text-sky2-500 border-sky2-200',
  金卡: 'bg-amber-100 text-amber-600 border-amber-200',
  钻石: 'bg-purple-100 text-purple-600 border-purple-200',
};

const avatarGradients = [
  'from-sage-300 to-sage-500',
  'from-terracotta-200 to-terracotta-400',
  'from-sky2-200 to-sky2-400',
  'from-petal-200 to-petal-400',
  'from-amber-200 to-amber-400',
  'from-purple-200 to-purple-400',
];

const getAvatarGradient = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
};

const getInitials = (name: string) => name.slice(0, 1);

const tabKeys = ['pets', 'recharges', 'consumptions', 'points', 'followUps'] as const;
type TabKey = (typeof tabKeys)[number];

const tabLabels: Record<TabKey, string> = {
  pets: '宠物档案',
  recharges: '充值记录',
  consumptions: '消费记录',
  points: '积分明细',
  followUps: '📝 服务回访',
};

type EditMemberForm = {
  name: string;
  phone: string;
  gender?: '男' | '女';
  notes?: string;
};

function RechargeModal({
  member,
  open,
  onClose,
  onSuccess,
}: {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const rechargeRules = useAppStore((s) => s.rechargeRules);
  const rechargeMember = useAppStore((s) => s.rechargeMember);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('微信');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedRule(null);
      setPayMethod('微信');
    }
  }, [open]);

  if (!member) return null;

  const activeRules = rechargeRules.filter((r) => r.isActive);

  const handleConfirm = () => {
    if (!selectedRule) {
      setToast('请选择充值档位');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    try {
      rechargeMember(member.id, selectedRule, payMethod);
      setToast('充值成功！');
      setTimeout(() => {
        setToast(null);
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (e) {
      setToast('充值失败');
      setTimeout(() => setToast(null), 2000);
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-cream-50 rounded-3xl shadow-card-hover"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-cream-50 border-b border-cream-200 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-sage-700">充值</h2>
                <p className="text-sm text-sage-500 mt-0.5">
                  {member.name} · 当前余额 ¥{member.balance.toFixed(2)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-cream-200 text-sage-500 hover:text-sage-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
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

              {selectedRule && (
                <div className="p-4 bg-white rounded-xl border border-cream-200">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-sage-500">实付金额</span>
                    <span className="font-semibold text-sage-700">
                      ¥{activeRules.find((r) => r.id === selectedRule)?.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-sage-500">到账总额</span>
                    <span className="font-semibold text-terracotta-500">
                      ¥{(
                        (activeRules.find((r) => r.id === selectedRule)?.amount || 0) +
                        (activeRules.find((r) => r.id === selectedRule)?.bonusAmount || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-xl bg-sage-600 text-white font-semibold hover:bg-sage-700 active:scale-[0.98] transition-all shadow-soft"
              >
                确认充值
              </button>
            </div>
          </motion.div>

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
        'relative text-left p-5 rounded-2xl border-2 transition-all',
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
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-bold text-sage-700">¥{rule.amount}</span>
      </div>
      {rule.bonusAmount > 0 && (
        <div className="text-sm text-green-600 font-semibold mb-2">赠 ¥{rule.bonusAmount}</div>
      )}
      {rule.bonusCredits.length > 0 && (
        <div className="space-y-1">
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

const payTypeLabels: Record<PayType, { label: string; color: string }> = {
  balance: { label: '余额', color: 'bg-sky2-100 text-sky2-600' },
  credit: { label: '次数', color: 'bg-amber-100 text-amber-600' },
  cash: { label: '现金', color: 'bg-cream-200 text-sage-600' },
  wechat: { label: '微信', color: 'bg-green-100 text-green-600' },
  alipay: { label: '支付宝', color: 'bg-blue-100 text-blue-600' },
};

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const members = useAppStore((s) => s.members);
  const pets = useAppStore((s) => s.pets);
  const services = useAppStore((s) => s.services);
  const groomers = useAppStore((s) => s.groomers);
  const rechargeRecords = useAppStore((s) => s.rechargeRecords);
  const rechargeRules = useAppStore((s) => s.rechargeRules);
  const consumptionRecords = useAppStore((s) => s.consumptionRecords);
  const pointsRecords = useAppStore((s) => s.pointsRecords);
  const getFollowUpsByMember = useAppStore((s) => s.getFollowUpsByMember);
  const followUpRecords = useAppStore((s) => s.followUpRecords);
  const updateMember = useAppStore((s) => s.updateMember);
  const rechargeMember = useAppStore((s) => s.rechargeMember);
  const createPet = useAppStore((s) => s.createPet);
  const updatePet = useAppStore((s) => s.updatePet);
  const initData = useAppStore((s) => s.initData);

  const [activeTab, setActiveTab] = useState<TabKey>('pets');
  const [expandedPets, setExpandedPets] = useState<Set<string>>(new Set());
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editingCareNotesPetId, setEditingCareNotesPetId] = useState<string | null>(null);
  const [careNotesDraft, setCareNotesDraft] = useState('');
  const [editPrefsOpen, setEditPrefsOpen] = useState(false);
  const [editingPrefsPetId, setEditingPrefsPetId] = useState<string | null>(null);
  const [prefsDraft, setPrefsDraft] = useState('');

  const member = useMemo(() => members.find((m) => m.id === id) || null, [members, id]);

  const memberPets = useMemo(() => pets.filter((p) => p.memberId === id), [pets, id]);
  const memberRecharges = useMemo(
    () => rechargeRecords.filter((r) => r.memberId === id),
    [rechargeRecords, id]
  );
  const memberConsumptions = useMemo(
    () => consumptionRecords.filter((c) => c.memberId === id),
    [consumptionRecords, id]
  );
  const memberPoints = useMemo(
    () => pointsRecords.filter((p) => p.memberId === id),
    [pointsRecords, id]
  );
  const memberFollowUps = useMemo(
    () => (id ? getFollowUpsByMember(id) : []),
    [id, getFollowUpsByMember, followUpRecords],
  );
  const [expandedFollowUps, setExpandedFollowUps] = useState<Set<string>>(new Set());

  const toggleFollowUpExpand = (id: string) => {
    setExpandedFollowUps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalRecharge = useMemo(
    () => memberRecharges.reduce((sum, r) => sum + r.amount + r.bonusAmount, 0),
    [memberRecharges]
  );
  const totalConsume = useMemo(
    () => memberConsumptions.reduce((sum, c) => sum + c.amount, 0),
    [memberConsumptions]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditMemberForm>();

  useEffect(() => {
    initData();
  }, [initData]);

  useEffect(() => {
    if (member && editOpen) {
      reset({
        name: member.name,
        phone: member.phone,
        gender: member.gender,
        notes: member.notes,
      });
    }
  }, [member, editOpen, reset]);

  const togglePetExpand = (petId: string) => {
    setExpandedPets((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const startEditCareNotes = (petId: string, currentNotes?: string) => {
    setEditingCareNotesPetId(petId);
    setCareNotesDraft(currentNotes || '');
  };

  const saveCareNotes = (petId: string) => {
    updatePet(petId, { careNotes: careNotesDraft });
    setEditingCareNotesPetId(null);
    setCareNotesDraft('');
    showToast('护理记录已更新');
  };

  const cancelEditCareNotes = () => {
    setEditingCareNotesPetId(null);
    setCareNotesDraft('');
  };

  const openEditPrefs = (petId: string, currentPrefs?: string[]) => {
    setEditingPrefsPetId(petId);
    setPrefsDraft((currentPrefs || []).join('\n'));
    setEditPrefsOpen(true);
  };

  const savePrefs = () => {
    if (!editingPrefsPetId) return;
    const arr = prefsDraft
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    updatePet(editingPrefsPetId, { preferences: arr });
    setEditPrefsOpen(false);
    setEditingPrefsPetId(null);
    setPrefsDraft('');
    showToast('偏好标签已更新');
  };

  const handleEditSubmit = (data: EditMemberForm) => {
    if (!member) return;
    updateMember(member.id, data);
    setEditOpen(false);
    showToast('会员信息已更新');
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'yyyy-MM-dd HH:mm');
    } catch {
      return dateStr;
    }
  };

  const formatRel = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: zhCN });
    } catch {
      return dateStr;
    }
  };

  const getServiceName = (sid: string) => services.find((s) => s.id === sid)?.name || sid;
  const getGroomerName = (gid?: string) => groomers.find((g) => g.id === gid)?.name || '-';
  const getPetName = (pid: string) => pets.find((p) => p.id === pid)?.name || pid;
  const getRuleAmount = (rid?: string) => {
    if (!rid) return '-';
    const r = rechargeRules.find((x) => x.id === rid);
    return r ? `¥${r.amount}` : '-';
  };

  if (!member) {
    if (members.length === 0) {
      return (
        <div className="min-h-screen bg-cream-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-4 border-4 border-sage-200 border-t-sage-500 rounded-full animate-spin" />
            <p className="text-sage-500 text-sm font-medium">加载中...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="text-center">
          <UserRound size={64} className="mx-auto text-sage-300 mb-4" />
          <p className="text-sage-500 text-lg mb-4">会员不存在</p>
          <Link
            to="/members"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sage-600 text-white font-medium hover:bg-sage-700 transition-colors"
          >
            <ArrowLeft size={16} /> 返回会员列表
          </Link>
        </div>
      </div>
    );
  }

  const stats = [
    { label: '余额', value: `¥${member.balance.toFixed(2)}`, icon: Wallet, color: 'text-terracotta-500', bg: 'bg-terracotta-50' },
    { label: '积分', value: member.points.toString(), icon: Gift, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: '累计充值', value: `¥${totalRecharge.toFixed(2)}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '累计消费', value: `¥${totalConsume.toFixed(2)}`, icon: ShoppingBag, color: 'text-sky2-500', bg: 'bg-sky2-50' },
  ];

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <nav className="flex items-center gap-2 text-sm mb-6 text-sage-500">
          <Link to="/members" className="hover:text-sage-700 transition-colors">
            会员列表
          </Link>
          <ChevronRight size={14} />
          <span className="text-sage-700 font-medium">{member.name}</span>
        </nav>

        <div className="relative overflow-hidden bg-gradient-to-br from-sage-100 via-cream-50 to-cream-100 rounded-3xl shadow-soft p-6 sm:p-8 mb-6 border border-cream-200">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-sage-200/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-terracotta-200/30 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
            <div
              className={cn(
                'w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-4xl font-bold shadow-soft-lg ring-4 ring-white/60 shrink-0',
                getAvatarGradient(member.id)
              )}
            >
              {getInitials(member.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-sage-700">{member.name}</h1>
                <span
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-full border',
                    levelColors[member.level]
                  )}
                >
                  {member.level}
                </span>
                {member.gender && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-cream-200 text-sage-600">
                    {member.gender}
                  </span>
                )}
              </div>
              <p className="text-sage-500 mb-3 flex items-center gap-2">
                <Smartphone size={16} />
                {member.phone}
              </p>
              {member.notes && (
                <p className="text-sm text-sage-400 bg-white/60 rounded-xl px-4 py-2 inline-block">
                  {member.notes}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => setRechargeOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sage-600 text-white font-semibold hover:bg-sage-700 active:scale-[0.98] transition-all shadow-soft"
              >
                <Wallet size={18} />
                充值
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-sage-600 font-semibold border border-cream-200 hover:bg-cream-50 transition-colors shadow-soft"
              >
                <Pencil size={18} />
                编辑
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {stats.map((st) => {
            const Icon = st.icon;
            return (
              <motion.div
                key={st.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-soft p-4 sm:p-5 border border-cream-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-sage-500">{st.label}</span>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', st.bg)}>
                    <Icon size={16} className={st.color} />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-sage-700">{st.value}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-soft border border-cream-100 overflow-hidden">
          <div className="flex border-b border-cream-100 px-2 sm:px-4 overflow-x-auto">
            {tabKeys.map((k) => (
              <button
                key={k}
                onClick={() => setActiveTab(k)}
                className={cn(
                  'relative px-4 sm:px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === k ? 'text-sage-700' : 'text-sage-400 hover:text-sage-600'
                )}
              >
                {tabLabels[k]}
                {activeTab === k && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute left-3 right-3 bottom-0 h-0.5 bg-sage-500 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'pets' && (
                <motion.div
                  key="pets"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {memberPets.length === 0 ? (
                    <div className="py-12 text-center">
                      <PawPrint size={48} className="mx-auto text-sage-300 mb-3" />
                      <p className="text-sage-500">暂无宠物档案</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {memberPets.map((pet) => {
                        const isExpanded = expandedPets.has(pet.id);
                        const petRecords = memberConsumptions
                          .filter((c) => c.petId === pet.id)
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          );
                        return (
                          <div
                            key={pet.id}
                            className="rounded-2xl border border-cream-200 bg-cream-50/50 overflow-hidden"
                          >
                            <div className="p-5">
                              <div className="flex items-start gap-4">
                                <div
                                  className={cn(
                                    'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold shrink-0',
                                    getAvatarGradient(pet.id)
                                  )}
                                >
                                  {getInitials(pet.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-sage-700">{pet.name}</h3>
                                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-cream-200 text-sage-600">
                                      {pet.gender}
                                    </span>
                                  </div>
                                  <p className="text-sm text-sage-500">{pet.breed}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                                <div className="flex items-center gap-2 text-sage-500">
                                  <CalendarDays size={14} />
                                  <span>
                                    {pet.birthday
                                      ? format(parseISO(pet.birthday), 'yyyy-MM-dd')
                                      : '未知生日'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sage-500">
                                  <PawPrint size={14} />
                                  <span>{pet.weight ? `${pet.weight} kg` : '未称重'}</span>
                                </div>
                              </div>
                              {pet.notes && (
                                <div className="mt-3 p-3 bg-white rounded-xl text-xs text-sage-500 border border-cream-100">
                                  💡 {pet.notes}
                                </div>
                              )}

                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-sage-600">
                                    <Tag size={14} className="text-petal-500" />
                                    偏好标签
                                  </div>
                                  <button
                                    onClick={() => openEditPrefs(pet.id, pet.preferences)}
                                    className="text-xs text-sage-500 hover:text-sage-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-petal-50 transition-colors"
                                  >
                                    <Pencil size={12} />
                                    编辑偏好
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {pet.preferences && pet.preferences.length > 0 ? (
                                    pet.preferences.map((pref, i) => (
                                      <span
                                        key={i}
                                        className="px-2.5 py-1 text-xs font-medium rounded-full bg-petal-100 text-petal-700 border border-petal-200"
                                      >
                                        {pref}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-sage-400 italic">暂无偏好</span>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-sage-600">
                                    <Scissors size={14} className="text-terracotta-500" />
                                    护理记录
                                  </div>
                                  {editingCareNotesPetId !== pet.id && (
                                    <button
                                      onClick={() => startEditCareNotes(pet.id, pet.careNotes)}
                                      className="text-xs text-sage-500 hover:text-sage-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-terracotta-50 transition-colors"
                                    >
                                      <Pencil size={12} />
                                      编辑
                                    </button>
                                  )}
                                </div>
                                {editingCareNotesPetId === pet.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={careNotesDraft}
                                      onChange={(e) => setCareNotesDraft(e.target.value)}
                                      rows={3}
                                      placeholder="输入护理记录，如洗澡频率、皮肤问题、特别注意事项等..."
                                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-terracotta-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-terracotta-400 focus:border-transparent resize-none"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={cancelEditCareNotes}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-cream-200 text-sage-600 font-medium hover:bg-cream-300 transition-colors"
                                      >
                                        取消
                                      </button>
                                      <button
                                        onClick={() => saveCareNotes(pet.id)}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-sage-600 text-white font-medium hover:bg-sage-700 transition-colors flex items-center gap-1"
                                      >
                                        <Save size={12} />
                                        保存
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-white rounded-xl text-xs text-sage-500 border border-cream-100 whitespace-pre-wrap min-h-[60px]">
                                    {pet.careNotes || <span className="text-sage-300 italic">暂无护理记录，点击编辑添加</span>}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => togglePetExpand(pet.id)}
                              className="w-full flex items-center justify-between px-5 py-3 bg-white border-t border-cream-100 text-sm font-medium text-sage-600 hover:bg-cream-50 transition-colors"
                            >
                              <span>
                                服务历史（{petRecords.length}）
                              </span>
                              <ChevronDown
                                size={16}
                                className={cn(
                                  'transition-transform',
                                  isExpanded && 'rotate-180'
                                )}
                              />
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25 }}
                                  className="overflow-hidden"
                                >
                                  <div className="border-t border-cream-100 bg-white">
                                    {petRecords.length === 0 ? (
                                      <div className="p-6 text-center text-sm text-sage-400">
                                        暂无服务记录
                                      </div>
                                    ) : (
                                      <div className="divide-y divide-cream-100 max-h-80 overflow-y-auto">
                                        {petRecords.map((rec) => (
                                          <div
                                            key={rec.id}
                                            className="p-4 flex items-start justify-between gap-4"
                                          >
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Scissors size={14} className="text-sage-400 shrink-0" />
                                                <span className="font-medium text-sage-700 text-sm truncate">
                                                  {getServiceName(rec.serviceId)}
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sage-400">
                                                <span>{formatDate(rec.createdAt)}</span>
                                                <span>
                                                  美容师：{getGroomerName(rec.groomerId)}
                                                </span>
                                              </div>
                                              {rec.notes && (
                                                <p className="text-xs text-sage-400 mt-1">
                                                  备注：{rec.notes}
                                                </p>
                                              )}
                                            </div>
                                            <div className="text-right shrink-0">
                                              <div className="font-bold text-sage-700 text-sm">
                                                ¥{rec.amount}
                                              </div>
                                              <div
                                                className={cn(
                                                  'text-[10px] px-2 py-0.5 rounded-full inline-block mt-1',
                                                  payTypeLabels[rec.payType].color
                                                )}
                                              >
                                                {payTypeLabels[rec.payType].label}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'recharges' && (
                <motion.div
                  key="recharges"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {memberRecharges.length === 0 ? (
                    <div className="py-12 text-center">
                      <Wallet size={48} className="mx-auto text-sage-300 mb-3" />
                      <p className="text-sage-500">暂无充值记录</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:-mx-6">
                      <div className="min-w-full px-4 sm:px-6">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-cream-200">
                              <th className="text-left py-3 px-3 font-semibold text-sage-500">日期</th>
                              <th className="text-left py-3 px-3 font-semibold text-sage-500">档位</th>
                              <th className="text-right py-3 px-3 font-semibold text-sage-500">实付</th>
                              <th className="text-right py-3 px-3 font-semibold text-sage-500">赠送</th>
                              <th className="text-left py-3 px-3 font-semibold text-sage-500">支付方式</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-cream-100">
                            {memberRecharges.map((r) => (
                              <tr key={r.id} className="hover:bg-cream-50">
                                <td className="py-3 px-3 text-sage-600 whitespace-nowrap">
                                  {formatDate(r.createdAt)}
                                </td>
                                <td className="py-3 px-3 font-medium text-sage-700">
                                  {getRuleAmount(r.ruleId)}
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-sage-700">
                                  ¥{r.amount.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-right text-green-600 font-medium">
                                  +¥{r.bonusAmount.toFixed(2)}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={cn(
                                      'inline-block px-2.5 py-1 text-xs rounded-full font-medium',
                                      r.paymentMethod === '微信' && 'bg-green-100 text-green-700',
                                      r.paymentMethod === '支付宝' && 'bg-blue-100 text-blue-700',
                                      r.paymentMethod === '现金' && 'bg-cream-200 text-sage-700',
                                      r.paymentMethod === '刷卡' && 'bg-purple-100 text-purple-700'
                                    )}
                                  >
                                    {r.paymentMethod}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'consumptions' && (
                <motion.div
                  key="consumptions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {memberConsumptions.length === 0 ? (
                    <div className="py-12 text-center">
                      <ShoppingBag size={48} className="mx-auto text-sage-300 mb-3" />
                      <p className="text-sage-500">暂无消费记录</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:-mx-6">
                      <div className="min-w-full px-4 sm:px-6">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-cream-200">
                              <th className="text-left py-3 px-3 font-semibold text-sage-500">日期</th>
                              <th className="text-left py-3 px-3 font-semibold text-sage-500">宠物</th>
                              <th className="text-left py-3 px-3 font-semibold text-sage-500">服务</th>
                              <th className="text-right py-3 px-3 font-semibold text-sage-500">金额</th>
                              <th className="text-left py-3 px-3 font-semibold text-sage-500">支付方式</th>
                              <th className="text-right py-3 px-3 font-semibold text-sage-500">获得积分</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-cream-100">
                            {memberConsumptions.map((c) => (
                              <tr key={c.id} className="hover:bg-cream-50">
                                <td className="py-3 px-3 text-sage-600 whitespace-nowrap">
                                  {formatDate(c.createdAt)}
                                </td>
                                <td className="py-3 px-3 text-sage-700">{getPetName(c.petId)}</td>
                                <td className="py-3 px-3 font-medium text-sage-700">
                                  {getServiceName(c.serviceId)}
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-sage-700">
                                  ¥{c.amount.toFixed(2)}
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={cn(
                                      'inline-block px-2.5 py-1 text-xs rounded-full font-medium',
                                      payTypeLabels[c.payType].color
                                    )}
                                  >
                                    {payTypeLabels[c.payType].label}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right text-green-600 font-medium">
                                  +{c.pointsEarned}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'points' && (
                <motion.div
                  key="points"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {memberPoints.length === 0 ? (
                    <div className="py-12 text-center">
                      <Gift size={48} className="mx-auto text-sage-300 mb-3" />
                      <p className="text-sage-500">暂无积分明细</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-cream-100">
                      {memberPoints.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-4 py-4 hover:bg-cream-50 rounded-xl px-2"
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                              p.type === 'earn' ? 'bg-green-100' : 'bg-petal-100'
                            )}
                          >
                            {p.type === 'earn' ? (
                              <Plus size={18} className="text-green-600" />
                            ) : (
                              <Minus size={18} className="text-petal-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sage-700 text-sm truncate">
                              {p.reason}
                            </p>
                            <p className="text-xs text-sage-400 mt-0.5">
                              {formatRel(p.createdAt)}
                            </p>
                          </div>
                          <div
                            className={cn(
                              'text-sm font-bold shrink-0',
                              p.type === 'earn' ? 'text-green-600' : 'text-petal-400'
                            )}
                          >
                            {p.type === 'earn' ? '+' : '-'}
                            {p.points}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'followUps' && (
                <motion.div
                  key="followUps"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {memberFollowUps.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-cream-100 flex items-center justify-center">
                        <MessageSquareText className="w-10 h-10 text-sage-300" />
                      </div>
                      <p className="text-sage-600 font-medium mb-1">暂无回访记录</p>
                      <p className="text-sm text-sage-400">完成服务时可记录服务回访</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memberFollowUps.map((fu) => {
                        const fuPet = pets.find((p) => p.id === fu.petId);
                        const isExpanded = expandedFollowUps.has(fu.id);
                        return (
                          <div
                            key={fu.id}
                            className="rounded-2xl2 bg-white border border-sage-100 overflow-hidden shadow-soft transition-all hover:shadow-card-hover"
                          >
                            <button
                              onClick={() => toggleFollowUpExpand(fu.id)}
                              className="w-full p-4 flex items-center justify-between gap-3 text-left"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <span className="text-xs font-semibold text-sage-700">
                                    {format(parseISO(fu.createdAt), 'yyyy-MM-dd HH:mm')}
                                  </span>
                                  {fuPet && (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-petal-100 text-petal-600 font-medium">
                                      <PawPrint className="w-3 h-3" />
                                      {fuPet.name}
                                    </span>
                                  )}
                                  <Link
                                    to={`/appointments/${fu.appointmentId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs px-2 py-0.5 rounded-full bg-sky2-100 text-sky2-600 font-medium hover:bg-sky2-200 transition-colors"
                                  >
                                    #{fu.appointmentId.slice(-6)} 预约
                                  </Link>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-[11px]">
                                  <div className="truncate text-sage-500">
                                    <span className="text-sage-400">👤 </span>
                                    {fu.petCondition || '无'}
                                  </div>
                                  <div className="truncate text-sage-500">
                                    <span className="text-sage-400">💬 </span>
                                    {fu.customerFeedback || '无'}
                                  </div>
                                  <div className="truncate text-sage-500">
                                    <span className="text-sage-400">📅 </span>
                                    {fu.nextCareSuggestion || '无'}
                                  </div>
                                </div>
                              </div>
                              <ChevronDown
                                className={cn(
                                  'w-5 h-5 text-sage-400 shrink-0 transition-transform duration-200',
                                  isExpanded && 'rotate-180'
                                )}
                              />
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-4 pb-4 space-y-3 border-t border-sage-100 pt-3">
                                    <div className="p-3 rounded-xl bg-sage-50/60 border border-sage-100">
                                      <div className="text-xs font-semibold text-sage-600 mb-1 flex items-center gap-1.5">
                                        <span>👤</span>宠物状态
                                      </div>
                                      <p className="text-sm text-sage-700 leading-relaxed whitespace-pre-wrap">
                                        {fu.petCondition || <span className="text-sage-400 italic">无记录</span>}
                                      </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-petal-50/60 border border-petal-100">
                                      <div className="text-xs font-semibold text-petal-600 mb-1 flex items-center gap-1.5">
                                        <span>💬</span>客户反馈
                                      </div>
                                      <p className="text-sm text-sage-700 leading-relaxed whitespace-pre-wrap">
                                        {fu.customerFeedback || <span className="text-sage-400 italic">无记录</span>}
                                      </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-terracotta-50/60 border border-terracotta-100">
                                      <div className="text-xs font-semibold text-terracotta-600 mb-1 flex items-center gap-1.5">
                                        <span>📅</span>下次建议护理
                                      </div>
                                      <p className="text-sm text-sage-700 leading-relaxed whitespace-pre-wrap">
                                        {fu.nextCareSuggestion || <span className="text-sage-400 italic">无记录</span>}
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <RechargeModal
        member={member}
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
        onSuccess={() => showToast('充值成功！数据已更新')}
      />

      <AnimatePresence>
        {editOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
            <motion.div
              className="relative w-full max-w-md bg-cream-50 rounded-3xl shadow-card-hover"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-6 border-b border-cream-200">
                <h2 className="text-xl font-bold text-sage-700">编辑会员</h2>
                <button
                  onClick={() => setEditOpen(false)}
                  className="p-2 rounded-xl hover:bg-cream-200 text-sage-500 hover:text-sage-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleEditSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-1.5">
                    姓名 <span className="text-terracotta-500">*</span>
                  </label>
                  <input
                    {...register('name', { required: '请输入姓名' })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-cream-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent"
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
                  />
                  {errors.phone && <p className="text-xs text-terracotta-500 mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-1.5">性别</label>
                  <div className="flex gap-3">
                    {(['男', '女'] as const).map((g) => (
                      <label key={g} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          value={g}
                          {...register('gender')}
                          className="sr-only peer"
                        />
                        <div className="py-2.5 text-center rounded-xl border-2 border-cream-200 bg-white text-sage-500 peer-checked:border-sage-500 peer-checked:bg-sage-50 peer-checked:text-sage-700 font-medium transition-all">
                          {g}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-1.5">备注</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-cream-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent resize-none"
                    placeholder="选填，备注信息..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-cream-200 text-sage-600 font-semibold hover:bg-cream-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-sage-600 text-white font-semibold hover:bg-sage-700 active:scale-[0.98] transition-all shadow-soft"
                  >
                    保存
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editPrefsOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditPrefsOpen(false)} />
            <motion.div
              className="relative w-full max-w-md bg-cream-50 rounded-3xl shadow-card-hover"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-6 border-b border-cream-200">
                <h2 className="text-xl font-bold text-sage-700">编辑偏好标签</h2>
                <button
                  onClick={() => setEditPrefsOpen(false)}
                  className="p-2 rounded-xl hover:bg-cream-200 text-sage-500 hover:text-sage-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-1.5">
                    偏好标签
                  </label>
                  <p className="text-xs text-sage-400 mb-2">每行一个标签，例如：
                    <br />怕吹风
                    <br />耳朵敏感
                    <br />泰迪圆头造型
                  </p>
                  <textarea
                    value={prefsDraft}
                    onChange={(e) => setPrefsDraft(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-cream-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-petal-400 focus:border-transparent resize-none"
                    placeholder="每行输入一个偏好标签..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditPrefsOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-cream-200 text-sage-600 font-semibold hover:bg-cream-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={savePrefs}
                    className="flex-1 py-3 rounded-xl bg-sage-600 text-white font-semibold hover:bg-sage-700 active:scale-[0.98] transition-all shadow-soft flex items-center justify-center gap-1.5"
                  >
                    <Save size={16} />
                    保存
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
