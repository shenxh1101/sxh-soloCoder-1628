import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store';
import { RechargeRule, ServiceCategory } from '@/types';
import { cn } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Wallet,
  Gift,
  Bell,
  MessageSquare,
  RefreshCcw,
  TrendingUp,
  Clock,
  Coins,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RuleFormData {
  amount: number;
  bonusAmount: number;
  bonusCredits: { serviceId: string; count: number; serviceName?: string }[];
  tag: string;
  isActive: boolean;
}

const emptyRuleForm: RuleFormData = {
  amount: 0,
  bonusAmount: 0,
  bonusCredits: [],
  tag: '',
  isActive: true,
};

const remindOptions = [
  { value: '1h', label: '提前1小时' },
  { value: '2h', label: '提前2小时' },
  { value: '12h', label: '提前半天' },
  { value: '24h', label: '提前1天' },
];

export default function Settings() {
  const [ruleModal, setRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<RechargeRule | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormData>(emptyRuleForm);
  const [resetConfirm, setResetConfirm] = useState(false);

  const [smsEnabled, setSmsEnabled] = useState(true);
  const [remindTime, setRemindTime] = useState('1h');
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission>('default');

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    rechargeRules,
    services,
    createRechargeRule,
    updateRechargeRule,
    deleteRechargeRule,
    resetAll,
  } = useAppStore();

  useEffect(() => {
    const saved = localStorage.getItem('settings_sms');
    if (saved !== null) setSmsEnabled(saved === 'true');
    const savedTime = localStorage.getItem('settings_remind');
    if (savedTime) setRemindTime(savedTime);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifyPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('settings_sms', String(smsEnabled));
  }, [smsEnabled]);

  useEffect(() => {
    localStorage.setItem('settings_remind', remindTime);
  }, [remindTime]);

  const availableServices = useMemo(
    () => services.filter((s) => s.isActive),
    [services]
  );

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const openCreateRule = () => {
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
    setRuleModal(true);
  };

  const openEditRule = (r: RechargeRule) => {
    setEditingRule(r);
    setRuleForm({
      amount: r.amount,
      bonusAmount: r.bonusAmount,
      bonusCredits: r.bonusCredits.map((bc) => ({ ...bc })),
      tag: r.tag || '',
      isActive: r.isActive,
    });
    setRuleModal(true);
  };

  const handleDeleteRule = (id: string) => {
    deleteRechargeRule(id);
    showToast('success', '规则已删除');
  };

  const toggleRuleActive = (r: RechargeRule) => {
    updateRechargeRule(r.id, { isActive: !r.isActive });
    showToast('success', r.isActive ? '已停用' : '已启用');
  };

  const addBonusCredit = () => {
    if (availableServices.length === 0) return;
    const first = availableServices[0];
    setRuleForm({
      ...ruleForm,
      bonusCredits: [
        ...ruleForm.bonusCredits,
        { serviceId: first.id, count: 1, serviceName: first.name },
      ],
    });
  };

  const updateBonusCredit = (idx: number, field: 'serviceId' | 'count', value: string | number) => {
    const next = [...ruleForm.bonusCredits];
    if (field === 'serviceId') {
      const svc = availableServices.find((s) => s.id === value);
      next[idx] = {
        serviceId: value as string,
        count: next[idx].count,
        serviceName: svc?.name,
      };
    } else {
      next[idx] = { ...next[idx], count: Math.max(1, Number(value) || 1) };
    }
    setRuleForm({ ...ruleForm, bonusCredits: next });
  };

  const removeBonusCredit = (idx: number) => {
    const next = ruleForm.bonusCredits.filter((_, i) => i !== idx);
    setRuleForm({ ...ruleForm, bonusCredits: next });
  };

  const validateRule = (): string | null => {
    if (ruleForm.amount <= 0) return '充值金额必须大于0';
    if (ruleForm.bonusAmount < 0) return '赠余额不能为负数';
    for (const bc of ruleForm.bonusCredits) {
      if (bc.count <= 0) return '赠服务次数必须大于0';
    }
    return null;
  };

  const handleRuleSubmit = () => {
    const err = validateRule();
    if (err) {
      showToast('error', err);
      return;
    }
    if (editingRule) {
      updateRechargeRule(editingRule.id, ruleForm);
      showToast('success', '规则已更新');
    } else {
      createRechargeRule(ruleForm);
      showToast('success', '规则已创建');
    }
    setRuleModal(false);
  };

  const handleReset = () => {
    resetAll();
    setResetConfirm(false);
    showToast('success', '所有数据已重置');
  };

  const requestNotifyPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('error', '浏览器不支持通知');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifyPermission(perm);
    if (perm === 'granted') {
      new Notification('宠物美容管理系统', {
        body: '消息通知已开启！',
        icon: '/favicon.svg',
      });
      showToast('success', '通知权限已开启');
    } else {
      showToast('error', '通知权限被拒绝');
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 顶部 */}
        <div>
          <h1 className="text-2xl font-bold text-sage-700">规则设置</h1>
          <p className="text-sm text-sage-400 mt-1">
            管理充值规则、提醒设置与系统数据
          </p>
        </div>

        {/* 区块1：充值规则 */}
        <section className="bg-white rounded-2xl2 shadow-soft overflow-hidden">
          <div className="px-6 py-5 border-b border-cream-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-center text-sage-600">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-sage-700">充值规则设置</h2>
                <p className="text-xs text-sage-400 mt-0.5">
                  设置不同充值档位的赠送优惠
                </p>
              </div>
            </div>
            <button
              onClick={openCreateRule}
              className="px-4 py-2 rounded-full bg-sage-400 text-white text-sm font-medium hover:bg-sage-500 transition-colors flex items-center gap-1.5 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              新增规则
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-cream-50/60 text-left">
                  <th className="px-6 py-3.5 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                    充值金额
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                    赠余额
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                    赠服务次数
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                    标签
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-sage-500 uppercase tracking-wider text-right">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {rechargeRules.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-sage-700">
                        ¥{r.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {r.bonusAmount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-terracotta-50 text-terracotta-400 rounded-lg text-sm font-medium">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +¥{r.bonusAmount}
                        </span>
                      ) : (
                        <span className="text-sm text-sage-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.bonusCredits.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {r.bonusCredits.map((bc, i) => {
                            const svc = services.find((s) => s.id === bc.serviceId);
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-petal-50 text-petal-300 rounded-lg text-xs font-medium"
                              >
                                <Gift className="w-3 h-3" />
                                {svc?.name || bc.serviceName || '服务'} ×{bc.count}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-sage-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {r.tag ? (
                        <span className="inline-block px-2.5 py-1 bg-sky2-50 text-sky2-400 rounded-lg text-xs font-medium">
                          {r.tag}
                        </span>
                      ) : (
                        <span className="text-sm text-sage-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                          r.isActive
                            ? 'bg-sage-50 text-sage-500'
                            : 'bg-slate-50 text-slate-400'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            r.isActive ? 'bg-sage-400' : 'bg-slate-300'
                          )}
                        />
                        {r.isActive ? '启用中' : '已停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditRule(r)}
                          className="w-8 h-8 rounded-lg hover:bg-cream-100 flex items-center justify-center text-sage-500 transition-colors"
                          title="编辑"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleRuleActive(r)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                            r.isActive
                              ? 'text-terracotta-400 hover:bg-terracotta-50'
                              : 'text-sage-500 hover:bg-sage-50'
                          )}
                        >
                          {r.isActive ? '停用' : '启用'}
                        </button>
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="w-8 h-8 rounded-lg hover:bg-terracotta-50 flex items-center justify-center text-terracotta-400 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rechargeRules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sage-400">
                      暂无充值规则，点击右上角「新增规则」开始添加
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 区块2：提醒设置 */}
        <section className="bg-white rounded-2xl2 shadow-soft p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-petal-100 to-petal-200 flex items-center justify-center text-petal-300">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-sage-700">提醒设置</h2>
              <p className="text-xs text-sage-400 mt-0.5">
                配置预约提醒与消息通知方式
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* 短信提醒 */}
            <div className="flex items-center justify-between p-5 bg-cream-50/80 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white shadow-soft flex items-center justify-center text-sage-500">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-sage-700">短信提醒</div>
                  <div className="text-xs text-sage-400 mt-0.5">
                    预约前向会员手机发送提醒短信
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSmsEnabled(!smsEnabled)}
                className={cn(
                  'relative w-14 h-8 rounded-full transition-colors',
                  smsEnabled ? 'bg-sage-400' : 'bg-cream-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-7 h-7 bg-white rounded-full shadow transition-all',
                    smsEnabled ? 'left-[26px]' : 'left-0.5'
                  )}
                />
              </button>
            </div>

            {/* 提前提醒时间 */}
            <div className="flex items-center justify-between p-5 bg-cream-50/80 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white shadow-soft flex items-center justify-center text-terracotta-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-sage-700">提前提醒时间</div>
                  <div className="text-xs text-sage-400 mt-0.5">
                    在预约开始前多久发送提醒
                  </div>
                </div>
              </div>
              <div className="relative">
                <select
                  value={remindTime}
                  onChange={(e) => setRemindTime(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm text-sage-700 bg-white cursor-pointer"
                >
                  {remindOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 pointer-events-none" />
              </div>
            </div>

            {/* 消息通知 */}
            <div className="flex items-center justify-between p-5 bg-cream-50/80 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white shadow-soft flex items-center justify-center text-sky2-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sage-700">浏览器消息通知</span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        notifyPermission === 'granted'
                          ? 'bg-sage-50 text-sage-500'
                          : notifyPermission === 'denied'
                          ? 'bg-terracotta-50 text-terracotta-400'
                          : 'bg-cream-100 text-sage-400'
                      )}
                    >
                      {notifyPermission === 'granted'
                        ? '已授权'
                        : notifyPermission === 'denied'
                        ? '已拒绝'
                        : '未授权'}
                    </span>
                  </div>
                  <div className="text-xs text-sage-400 mt-0.5">
                    通过浏览器桌面推送接收系统通知
                  </div>
                </div>
              </div>
              <button
                onClick={requestNotifyPermission}
                disabled={notifyPermission === 'granted'}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-[0.98]',
                  notifyPermission === 'granted'
                    ? 'bg-sage-50 text-sage-400 cursor-not-allowed'
                    : 'bg-sage-400 text-white hover:bg-sage-500'
                )}
              >
                {notifyPermission === 'granted' ? '已开启' : '请求权限'}
              </button>
            </div>
          </div>
        </section>

        {/* 区块3：数据重置 */}
        <section className="bg-gradient-to-br from-terracotta-50 to-terracotta-100/50 rounded-2xl2 shadow-soft p-6 border border-terracotta-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta-200 to-terracotta-300 flex items-center justify-center text-white">
              <RefreshCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-terracotta-400">数据重置</h2>
              <p className="text-xs text-terracotta-400/70 mt-0.5">
                危险操作，请谨慎使用
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between p-5 bg-white/70 rounded-xl backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-terracotta-100 flex items-center justify-center text-terracotta-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-terracotta-400">重置全部模拟数据</div>
                <div className="text-sm text-terracotta-400/70 mt-1 leading-relaxed">
                  将清除所有预约、会员、宠物、充值、消费、积分等业务数据，<br />
                  并恢复为初始模拟数据。<span className="font-semibold">此操作不可撤销！</span>
                </div>
              </div>
            </div>
            <AnimatePresence>
              {!resetConfirm ? (
                <motion.button
                  key="btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setResetConfirm(true)}
                  className="shrink-0 px-5 py-2.5 rounded-full bg-terracotta-400 text-white font-medium hover:bg-terracotta-500 transition-colors shadow-soft active:scale-[0.98]"
                >
                  重置全部
                </motion.button>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="shrink-0 flex items-center gap-2"
                >
                  <button
                    onClick={() => setResetConfirm(false)}
                    className="px-4 py-2.5 rounded-full border-2 border-terracotta-200 text-terracotta-400 font-medium hover:bg-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-5 py-2.5 rounded-full bg-terracotta-400 text-white font-medium hover:bg-terracotta-500 transition-colors shadow-soft active:scale-[0.98] flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-4 h-4" />
                    确认重置
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* 规则弹窗 */}
      <AnimatePresence>
        {ruleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            onClick={() => setRuleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl2 shadow-card-hover w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-sage-300 to-sage-400 p-6 text-white relative shrink-0">
                <button
                  onClick={() => setRuleModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                  {editingRule ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <h3 className="text-xl font-bold">
                  {editingRule ? '编辑充值规则' : '新增充值规则'}
                </h3>
                <p className="text-white/80 text-sm mt-1">设置充值金额与赠送优惠</p>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* 充值金额 */}
                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-2">
                    充值金额（元）<span className="text-terracotta-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400">
                      ¥
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={ruleForm.amount}
                      onChange={(e) =>
                        setRuleForm({
                          ...ruleForm,
                          amount: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      placeholder="例如：500"
                      className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* 赠余额 */}
                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-2">
                    赠送余额（元）
                  </label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-terracotta-400" />
                    <input
                      type="number"
                      min={0}
                      value={ruleForm.bonusAmount}
                      onChange={(e) =>
                        setRuleForm({
                          ...ruleForm,
                          bonusAmount: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      placeholder="例如：100"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* 赠服务次数 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-sage-600">
                      赠送服务次数
                    </label>
                    <button
                      onClick={addBonusCredit}
                      disabled={availableServices.length === 0}
                      className="text-xs px-2.5 py-1 rounded-lg bg-sage-50 text-sage-500 hover:bg-sage-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      添加
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ruleForm.bonusCredits.map((bc, idx) => {
                      const svc = availableServices.find((s) => s.id === bc.serviceId);
                      return (
                        <div key={idx} className="flex items-center gap-2 p-3 bg-cream-50 rounded-xl">
                          <div className="relative flex-1">
                            <select
                              value={bc.serviceId}
                              onChange={(e) => updateBonusCredit(idx, 'serviceId', e.target.value)}
                              className="w-full pl-3 pr-8 py-2 rounded-lg border border-cream-200 focus:border-sage-400 focus:outline-none text-sm bg-white cursor-pointer appearance-none"
                            >
                              {availableServices.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} (¥{s.price})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sage-400 pointer-events-none" />
                          </div>
                          <div className="w-20 relative">
                            <input
                              type="number"
                              min={1}
                              value={bc.count}
                              onChange={(e) => updateBonusCredit(idx, 'count', e.target.value)}
                              className="w-full pl-3 pr-6 py-2 rounded-lg border border-cream-200 focus:border-sage-400 focus:outline-none text-sm text-center"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-sage-400">
                              次
                            </span>
                          </div>
                          <button
                            onClick={() => removeBonusCredit(idx)}
                            className="w-8 h-8 rounded-lg hover:bg-terracotta-50 flex items-center justify-center text-terracotta-400 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {ruleForm.bonusCredits.length === 0 && (
                      <div className="text-center py-6 text-sm text-sage-400 border-2 border-dashed border-cream-200 rounded-xl">
                        暂未添加赠送服务，点击上方「添加」按钮
                      </div>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-2">
                    标签
                    <span className="text-xs text-sage-400 font-normal ml-2">
                      （选填，展示在充值卡片上）
                    </span>
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky2-400" />
                    <input
                      type="text"
                      value={ruleForm.tag}
                      onChange={(e) => setRuleForm({ ...ruleForm, tag: e.target.value })}
                      placeholder="例如：新手推荐、最受欢迎、超级划算"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* 启用开关 */}
                <div className="flex items-center justify-between p-4 bg-cream-50 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-sage-700">启用状态</div>
                    <div className="text-xs text-sage-400 mt-0.5">
                      停用后会员将无法选择此规则充值
                    </div>
                  </div>
                  <button
                    onClick={() => setRuleForm({ ...ruleForm, isActive: !ruleForm.isActive })}
                    className={cn(
                      'relative w-12 h-7 rounded-full transition-colors',
                      ruleForm.isActive ? 'bg-sage-400' : 'bg-cream-200'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all',
                        ruleForm.isActive ? 'left-[22px]' : 'left-0.5'
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* 底部按钮 */}
              <div className="p-6 pt-2 border-t border-cream-100 flex gap-3 shrink-0">
                <button
                  onClick={() => setRuleModal(false)}
                  className="flex-1 py-3 rounded-full border-2 border-cream-200 text-sage-500 font-medium hover:bg-cream-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleRuleSubmit}
                  className="flex-1 py-3 rounded-full bg-sage-400 text-white font-medium hover:bg-sage-500 transition-colors active:scale-[0.98]"
                >
                  {editingRule ? '保存修改' : '确认创建'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              'fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-full shadow-soft-lg flex items-center gap-2 text-white',
              toast.type === 'success' ? 'bg-sage-500' : 'bg-terracotta-400'
            )}
          >
            {toast.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
