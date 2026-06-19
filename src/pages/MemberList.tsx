import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  ChevronDown,
  Wallet,
  Gift,
  PawPrint,
  X,
  CreditCard,
  Smartphone,
  Banknote,
  CircleUserRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAppStore } from '@/store';
import { Member, MemberLevel, RechargeRule, PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';

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

const getInitials = (name: string) => {
  return name.slice(0, 1);
};

const levelOptions: (MemberLevel | '全部')[] = ['全部', '普通', '银卡', '金卡', '钻石'];

type NewMemberForm = {
  name: string;
  phone: string;
  gender?: '男' | '女';
  notes?: string;
};

function RechargeModal({
  member,
  open,
  onClose,
}: {
  member: Member | null;
  open: boolean;
  onClose: () => void;
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
        <div className="text-sm text-green-600 font-semibold mb-2">
          赠 ¥{rule.bonusAmount}
        </div>
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

function MemberCard({
  member,
  petCount,
  onRecharge,
  onDetail,
}: {
  member: Member;
  petCount: number;
  onRecharge: () => void;
  onDetail: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group relative bg-white rounded-2xl2 shadow-soft hover:shadow-card-hover transition-all duration-300 overflow-hidden"
    >
      <div className="absolute top-3 left-3">
        <span
          className={cn(
            'px-2.5 py-1 text-xs font-semibold rounded-full border',
            levelColors[member.level]
          )}
        >
          {member.level}
        </span>
      </div>

      <div className="p-5 pt-10">
        <div className="flex items-center gap-4 mb-4">
          <div
            className={cn(
              'w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold shadow-soft shrink-0',
              getAvatarGradient(member.id)
            )}
          >
            {getInitials(member.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sage-700 truncate">{member.name}</h3>
            <p className="text-sm text-sage-400 mt-0.5">{member.phone}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-cream-100 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-terracotta-500 mb-0.5">
              <Wallet size={14} />
            </div>
            <div className="text-sm font-bold text-sage-700">¥{member.balance}</div>
            <div className="text-[10px] text-sage-400">余额</div>
          </div>
          <div className="text-center border-x border-cream-100">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
              <Gift size={14} />
            </div>
            <div className="text-sm font-bold text-sage-700">{member.points}</div>
            <div className="text-[10px] text-sage-400">积分</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-sky2-500 mb-0.5">
              <PawPrint size={14} />
            </div>
            <div className="text-sm font-bold text-sage-700">{petCount}</div>
            <div className="text-[10px] text-sage-400">宠物</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRecharge}
            className="flex-1 py-2 rounded-xl bg-terracotta-50 text-terracotta-500 font-medium text-sm hover:bg-terracotta-100 transition-colors"
          >
            充值
          </button>
          <button
            onClick={onDetail}
            className="flex-1 py-2 rounded-xl bg-sage-50 text-sage-600 font-medium text-sm hover:bg-sage-100 transition-colors"
          >
            详情
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function MemberList() {
  const members = useAppStore((s) => s.members);
  const pets = useAppStore((s) => s.pets);
  const rechargeRules = useAppStore((s) => s.rechargeRules);
  const createMember = useAppStore((s) => s.createMember);
  const rechargeMember = useAppStore((s) => s.rechargeMember);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<MemberLevel | '全部'>('全部');
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeMemberData, setRechargeMemberData] = useState<Member | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewMemberForm>();

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        !search ||
        m.name.includes(search) ||
        m.phone.includes(search);
      const matchLevel = levelFilter === '全部' || m.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [members, search, levelFilter]);

  const petCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pets) {
      map.set(p.memberId, (map.get(p.memberId) || 0) + 1);
    }
    return map;
  }, [pets]);

  const handleAddMember = (data: NewMemberForm) => {
    createMember(data);
    setAddOpen(false);
    reset();
    setToast('会员添加成功');
    setTimeout(() => setToast(null), 2000);
  };

  const openRecharge = (m: Member) => {
    setRechargeMemberData(m);
    setRechargeOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-sage-700 mb-1">会员管理</h1>
          <p className="text-sm sm:text-base text-sage-500">管理您的会员、充值和消费记录</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索姓名或手机号..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-cream-200 text-sage-700 placeholder-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent shadow-soft"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="w-full sm:w-auto flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-cream-200 text-sage-600 hover:bg-cream-50 shadow-soft transition-colors"
            >
              <span className="font-medium">
                {levelFilter === '全部' ? '全部等级' : levelFilter}
              </span>
              <ChevronDown size={16} className={cn('transition-transform', filterOpen && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 mt-2 w-40 py-2 bg-white rounded-xl shadow-soft-lg border border-cream-200 z-20 overflow-hidden"
                >
                  {levelOptions.map((lv) => (
                    <button
                      key={lv}
                      onClick={() => {
                        setLevelFilter(lv);
                        setFilterOpen(false);
                      }}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm hover:bg-sage-50 transition-colors',
                        levelFilter === lv ? 'text-sage-700 font-semibold bg-sage-50' : 'text-sage-500'
                      )}
                    >
                      {lv}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sage-600 text-white font-semibold hover:bg-sage-700 active:scale-[0.98] transition-all shadow-soft"
          >
            <Plus size={18} />
            新增会员
          </button>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="py-20 text-center">
            <CircleUserRound size={64} className="mx-auto text-sage-300 mb-4" />
            <p className="text-sage-500 text-lg">暂无符合条件的会员</p>
            <p className="text-sage-400 text-sm mt-1">试试调整筛选条件或添加新会员</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredMembers.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                petCount={petCountMap.get(m.id) || 0}
                onRecharge={() => openRecharge(m)}
                onDetail={() => navigate(`/members/${m.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {addOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
            <motion.div
              className="relative w-full max-w-md bg-cream-50 rounded-3xl shadow-card-hover"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between p-6 border-b border-cream-200">
                <h2 className="text-xl font-bold text-sage-700">新增会员</h2>
                <button
                  onClick={() => setAddOpen(false)}
                  className="p-2 rounded-xl hover:bg-cream-200 text-sage-500 hover:text-sage-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(handleAddMember)} className="p-6 space-y-4">
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

                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-1.5">性别</label>
                  <div className="flex gap-3">
                    {(['男', '女'] as const).map((g) => (
                      <label
                        key={g}
                        className="flex-1 cursor-pointer"
                      >
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
                    onClick={() => setAddOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-cream-200 text-sage-600 font-semibold hover:bg-cream-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-sage-600 text-white font-semibold hover:bg-sage-700 active:scale-[0.98] transition-all shadow-soft"
                  >
                    确认添加
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RechargeModal
        member={rechargeMemberData}
        open={rechargeOpen}
        onClose={() => setRechargeOpen(false)}
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
