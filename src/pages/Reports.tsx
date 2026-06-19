import { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Wallet,
  CreditCard,
  Scissors,
  Coins,
  Users,
  ChevronLeft,
  ChevronRight,
  Award,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Crown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

const PIE_COLORS = [
  '#F2DFBB',
  '#8B9D83',
  '#D97757',
  '#CC6A63',
  '#8DAFCA',
  '#BCCEB5',
  '#EBB49C',
];

export default function Reports() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const {
    getMonthlyRechargeStats,
    getMonthlyServiceStats,
    getTopServices,
    getTopGroomers,
    getMonthlySummary,
    groomers,
  } = useAppStore();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const summary = useMemo(
    () => getMonthlySummary(year, month),
    [year, month, getMonthlySummary]
  );

  const rechargeStats = useMemo(
    () => getMonthlyRechargeStats(year, month),
    [year, month, getMonthlyRechargeStats]
  );

  const serviceStats = useMemo(
    () => getMonthlyServiceStats(year, month),
    [year, month, getMonthlyServiceStats]
  );

  const topServices = useMemo(
    () => getTopServices(year, month, 10),
    [year, month, getTopServices]
  );

  const topGroomers = useMemo(
    () => getTopGroomers(year, month, 5),
    [year, month, getTopGroomers]
  );

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const isCurrentMonth =
    currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  const statCards = [
    {
      label: '充值总额',
      value: `¥${summary.totalRecharge.toLocaleString()}`,
      sub: `${summary.totalRechargeCount} 笔充值`,
      icon: Wallet,
      color: 'from-sage-200 to-sage-300 text-sage-600',
      bg: 'bg-sage-50',
    },
    {
      label: '消费总额',
      value: `¥${summary.totalService.toLocaleString()}`,
      sub: `${summary.totalServiceCount} 次服务`,
      icon: CreditCard,
      color: 'from-terracotta-200 to-terracotta-300 text-terracotta-400',
      bg: 'bg-terracotta-50',
    },
    {
      label: '服务单数',
      value: summary.totalServiceCount.toString(),
      sub: '完成的服务次数',
      icon: Scissors,
      color: 'from-petal-100 to-petal-200 text-petal-300',
      bg: 'bg-petal-50',
    },
    {
      label: '新增积分',
      value: summary.totalPointsEarned.toLocaleString(),
      sub: '本月累计产生',
      icon: Coins,
      color: 'from-amber-200 to-amber-300 text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: '新增会员',
      value: summary.newMembers.toString(),
      sub: '本月注册会员',
      icon: Users,
      color: 'from-sky2-200 to-sky2-300 text-sky2-400',
      bg: 'bg-sky2-50',
    },
  ];

  const pieData = serviceStats.map((s) => ({
    name: s.serviceName,
    value: s.amount,
    count: s.count,
  }));

  const maxServiceAmount = topServices[0]?.amount || 1;
  const maxGroomerAmount = topGroomers[0]?.amount || 1;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl shadow-soft-lg p-3 border border-cream-100">
          {label && (
            <p className="text-xs text-sage-400 mb-1">{label}</p>
          )}
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: p.color || '#8B9D83' }}>
              <span className="font-medium">{p.name || p.dataKey}：</span>
              {typeof p.value === 'number' && p.value >= 1000 ? `¥${p.value.toLocaleString()}` : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white rounded-xl shadow-soft-lg p-3 border border-cream-100 min-w-[160px]">
          <p className="text-sm font-medium text-sage-700 mb-1">{d.name}</p>
          <p className="text-xs text-sage-400">
            营收：<span className="text-terracotta-400 font-semibold">¥{d.value.toLocaleString()}</span>
          </p>
          <p className="text-xs text-sage-400">
            单量：<span className="text-sage-500 font-semibold">{d.count} 单</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getGroomerRankBadge = (idx: number) => {
    if (idx === 0) return { icon: '🥇', bg: 'bg-amber-50 text-amber-600' };
    if (idx === 1) return { icon: '🥈', bg: 'bg-slate-50 text-slate-500' };
    if (idx === 2) return { icon: '🥉', bg: 'bg-orange-50 text-orange-500' };
    return { icon: `#${idx + 1}`, bg: 'bg-cream-100 text-sage-500' };
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部标题 + 月份选择器 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-sage-700">统计报表</h1>
            <p className="text-sm text-sage-400 mt-1">
              查看月度经营数据与业绩分析
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl2 shadow-soft px-2 py-2 w-fit">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl hover:bg-cream-100 flex items-center justify-center text-sage-500 transition-colors"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-terracotta-400" />
              <span className="text-base font-semibold text-sage-700 tabular-nums">
                {format(currentMonth, 'yyyy年 M月')}
              </span>
              {isCurrentMonth && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-sage-50 text-sage-500">
                  本月
                </span>
              )}
            </div>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                isCurrentMonth
                  ? 'text-sage-300 cursor-not-allowed'
                  : 'hover:bg-cream-100 text-sage-500'
              )}
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* 卡片1：本月概览 */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="bg-white rounded-2xl2 shadow-soft p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-center text-sage-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-sage-700">本月概览</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((card, idx) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + idx * 0.05 }}
                className={cn(
                  'rounded-xl p-4 relative overflow-hidden',
                  card.bg
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center',
                      card.color
                    )}
                  >
                    <card.icon className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="text-xs text-sage-400 mb-1">{card.label}</div>
                <div className="text-2xl font-bold text-sage-700 tabular-nums leading-tight">
                  {card.value}
                </div>
                <div className="text-xs text-sage-400 mt-1">{card.sub}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 卡片2：每日充值走势 */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl2 shadow-soft p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-center text-sage-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-sage-700">每日充值走势</h2>
                <p className="text-xs text-sage-400 mt-0.5">
                  {format(startOfMonth(currentMonth), 'M月d日')} - {format(endOfMonth(currentMonth), 'M月d日')}
                </p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rechargeStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9FB497" stopOpacity={1} />
                      <stop offset="100%" stopColor="#BCCEB5" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2DFBB" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#8B9D83', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#F2DFBB' }}
                    interval={rechargeStats.length > 20 ? 3 : 2}
                  />
                  <YAxis
                    tick={{ fill: '#8B9D83', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `¥${v >= 1000 ? `${v / 1000}k` : v}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9EDD8', opacity: 0.5 }} />
                  <Bar
                    dataKey="amount"
                    name="充值金额"
                    fill="url(#sageGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          {/* 卡片3：服务类型占比 */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl2 shadow-soft p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-petal-100 to-petal-200 flex items-center justify-center text-petal-300">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-sage-700">服务类型占比</h2>
            </div>
            {pieData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 h-64">
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={PIE_COLORS[idx % PIE_COLORS.length]}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2 max-h-60 overflow-y-auto">
                  {pieData.map((item, idx) => {
                    const total = pieData.reduce((s, d) => s + d.value, 0) || 1;
                    const pct = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="text-xs text-sage-600 flex-1 truncate">
                          {item.name}
                        </span>
                        <span className="text-xs font-semibold text-sage-700 tabular-nums">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-sage-400 text-sm">
                本月暂无服务数据
              </div>
            )}
          </motion.section>
        </div>

        {/* 两列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 卡片4：热门服务排行 */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl2 shadow-soft p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-terracotta-200 to-terracotta-300 flex items-center justify-center text-terracotta-400">
                <Award className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-sage-700">热门服务排行 TOP10</h2>
            </div>
            {topServices.length > 0 ? (
              <div className="h-80 overflow-y-auto pr-2 space-y-2.5">
                {topServices.map((item, idx) => {
                  const progress = (item.amount / maxServiceAmount) * 100;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + idx * 0.03 }}
                      className="p-3 rounded-xl hover:bg-cream-50/60 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              'w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0',
                              idx === 0
                                ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white'
                                : idx === 1
                                ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white'
                                : idx === 2
                                ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white'
                                : 'bg-cream-100 text-sage-500'
                            )}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-sage-700 truncate max-w-[140px]">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-terracotta-400 tabular-nums">
                            ¥{item.amount.toLocaleString()}
                          </div>
                          <div className="text-xs text-sage-400">{item.count} 单</div>
                        </div>
                      </div>
                      <div className="h-2 bg-cream-100 rounded-full overflow-hidden ml-8.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ delay: 0.35 + idx * 0.03, duration: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-terracotta-300 via-terracotta-400 to-petal-300"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-sage-400 text-sm">
                本月暂无服务数据
              </div>
            )}
          </motion.section>

          {/* 卡片5：美容师业绩榜 */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl2 shadow-soft p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky2-200 to-sky2-300 flex items-center justify-center text-sky2-400">
                <Crown className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-sage-700">美容师业绩榜 TOP5</h2>
            </div>
            {topGroomers.length > 0 ? (
              <div className="h-80 space-y-3">
                {topGroomers.map((item, idx) => {
                  const g = groomers.find((x) => x.id === item.id);
                  const progress = (item.amount / maxGroomerAmount) * 100;
                  const badge = getGroomerRankBadge(idx);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      className="p-4 rounded-xl bg-gradient-to-r from-cream-50/80 to-transparent hover:from-cream-100/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sage-200 via-petal-100 to-sky2-100 flex items-center justify-center text-lg font-bold text-sage-700 ring-2 ring-white shadow-soft">
                            {g?.avatar || g?.name?.[0] || '美'}
                          </div>
                          <div
                            className={cn(
                              'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-soft',
                              badge.bg
                            )}
                          >
                            {idx < 3 ? badge.icon : badge.icon}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sage-700 truncate">
                            {g?.name || item.name}
                          </div>
                          <div className="text-xs text-sage-400 mt-0.5">
                            服务 <span className="text-sage-500 font-medium">{item.count}</span> 单
                            {' · '}
                            业绩 <span className="text-terracotta-400 font-semibold">¥{item.amount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-sage-400">达成率</div>
                          <div className="text-lg font-bold text-sage-600 tabular-nums">
                            {progress.toFixed(0)}
                            <span className="text-sm text-sage-400 ml-0.5">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-3 bg-cream-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ delay: 0.45 + idx * 0.05, duration: 0.7 }}
                          className={cn(
                            'h-full rounded-full relative overflow-hidden',
                            idx === 0
                              ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500'
                              : 'bg-gradient-to-r from-sage-300 via-sage-400 to-sage-500'
                          )}
                        >
                          {idx === 0 && (
                            <div className="absolute inset-0 bg-white/30 animate-pulse-soft" />
                          )}
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-sage-400 text-sm">
                本月暂无美容师业绩数据
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </div>
  );
}
