import { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import { Member, Service } from '@/types';
import { cn } from '@/lib/utils';
import {
  Coins,
  Gift,
  History,
  Trophy,
  X,
  Search,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'exchange' | 'records' | 'ranking';

interface ProductItem {
  id: string;
  name: string;
  pointsCost: number;
  image: string;
}

const products: ProductItem[] = [
  {
    id: 'prod1',
    name: '宠物零食礼包',
    pointsCost: 300,
    image: '🦴',
  },
  {
    id: 'prod2',
    name: '宠物沐浴露',
    pointsCost: 500,
    image: '🧴',
  },
  {
    id: 'prod3',
    name: '宠物玩具套装',
    pointsCost: 800,
    image: '🎾',
  },
];

export default function PointsCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('exchange');
  const [exchangeModal, setExchangeModal] = useState<{
    open: boolean;
    itemType: 'service' | 'product';
    itemId?: string;
    itemName: string;
    pointsCost: number;
  } | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { members, services, exchangeRecords, exchangePoints } = useAppStore();

  const totalPoints = useMemo(
    () => members.reduce((sum, m) => sum + m.points, 0),
    [members]
  );

  const exchangeableServices = useMemo(
    () => services.filter((s) => s.pointsCost && s.isActive),
    [services]
  );

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [members, memberSearch]);

  const sortedRanking = useMemo(
    () => [...members].sort((a, b) => b.points - a.points).slice(0, 10),
    [members]
  );

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const openExchangeModal = (
    itemType: 'service' | 'product',
    item: Service | ProductItem
  ) => {
    setExchangeModal({
      open: true,
      itemType,
      itemId: 'pointsCost' in item ? undefined : item.id,
      itemName: item.name,
      pointsCost: item.pointsCost!,
    });
    setSelectedMemberId('');
    setMemberSearch('');
  };

  const handleConfirmExchange = () => {
    if (!exchangeModal || !selectedMemberId) return;
    const res = exchangePoints(
      selectedMemberId,
      exchangeModal.itemType,
      exchangeModal.itemName,
      exchangeModal.pointsCost,
      exchangeModal.itemId
    );
    if (res.success) {
      showToast('success', `兑换成功：${exchangeModal.itemName}`);
      setExchangeModal(null);
    } else {
      showToast('error', res.error || '兑换失败');
    }
  };

  const getRankStyle = (idx: number) => {
    if (idx === 0) return 'bg-gradient-to-br from-amber-400 to-amber-600 text-white';
    if (idx === 1) return 'bg-gradient-to-br from-slate-300 to-slate-500 text-white';
    if (idx === 2) return 'bg-gradient-to-br from-orange-300 to-orange-500 text-white';
    return 'bg-cream-100 text-sage-500';
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部概览 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl2 bg-gradient-to-br from-sage-300 via-sage-400 to-sage-500 p-8 shadow-soft-lg text-white"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                <Sparkles className="w-4 h-4" />
                <span>积分中心</span>
              </div>
              <div className="text-6xl font-bold tracking-tight flex items-baseline gap-3">
                {totalPoints.toLocaleString()}
                <Coins className="w-10 h-10 text-amber-200" />
              </div>
              <p className="mt-3 text-white/80 text-sm flex items-center gap-1">
                <span className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  积分 = 1元1分
                </span>
                消费得积分，积分兑好礼
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2">
              <div className="text-right">
                <div className="text-white/60 text-xs">会员总数</div>
                <div className="text-2xl font-semibold">{members.length}</div>
              </div>
              <div className="text-right">
                <div className="text-white/60 text-xs">本月兑换</div>
                <div className="text-2xl font-semibold">
                  {
                    exchangeRecords.filter((r) => {
                      const d = new Date(r.createdAt);
                      const now = new Date();
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    }).length
                  }
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab 切换 */}
        <div className="bg-white rounded-2xl2 p-2 shadow-soft inline-flex gap-1">
          {(
            [
              { key: 'exchange', label: '积分兑换', icon: Gift },
              { key: 'records', label: '兑换记录', icon: History },
              { key: 'ranking', label: '积分排行', icon: Trophy },
            ] as { key: Tab; label: string; icon: typeof Gift }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2',
                activeTab === t.key
                  ? 'bg-sage-400 text-white shadow-soft'
                  : 'text-sage-500 hover:bg-cream-100'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* 积分兑换 */}
          {activeTab === 'exchange' && (
            <motion.div
              key="exchange"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* 兑换服务 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-terracotta-400 rounded-full" />
                  <h2 className="text-lg font-semibold text-sage-700">兑换服务</h2>
                  <span className="text-xs text-sage-400">
                    共 {exchangeableServices.length} 项
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {exchangeableServices.map((svc) => (
                    <motion.div
                      key={svc.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl2 p-5 shadow-soft hover:shadow-card-hover transition-shadow group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="inline-block px-2.5 py-1 bg-sage-50 text-sage-500 text-xs font-medium rounded-lg">
                          {svc.category}
                        </span>
                        <span className="text-xs text-sage-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {svc.duration}分钟
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-sage-700 mb-2 group-hover:text-sage-500 transition-colors">
                        {svc.name}
                      </h3>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-sage-300 text-sm line-through">
                          ¥{svc.price}
                        </span>
                        <span className="text-xl font-bold text-terracotta-400 flex items-center gap-0.5">
                          <Coins className="w-4 h-4" />
                          {svc.pointsCost}
                        </span>
                      </div>
                      <button
                        onClick={() => openExchangeModal('service', svc)}
                        className="w-full py-2.5 rounded-full bg-sage-400 text-white text-sm font-medium hover:bg-sage-500 transition-colors active:scale-[0.98]"
                      >
                        立即兑换
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* 兑换好物 */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-petal-300 rounded-full" />
                  <h2 className="text-lg font-semibold text-sage-700">兑换好物</h2>
                  <span className="text-xs text-sage-400">精选周边</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((prod) => (
                    <motion.div
                      key={prod.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl2 p-5 shadow-soft hover:shadow-card-hover transition-shadow group"
                    >
                      <div className="h-32 bg-gradient-to-br from-cream-100 via-petal-50 to-sky2-100 rounded-xl flex items-center justify-center text-6xl mb-4 group-hover:scale-[1.02] transition-transform">
                        {prod.image}
                      </div>
                      <h3 className="text-base font-semibold text-sage-700 mb-2">
                        {prod.name}
                      </h3>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-xl font-bold text-terracotta-400 flex items-center gap-0.5">
                          <Coins className="w-4 h-4" />
                          {prod.pointsCost}
                        </span>
                      </div>
                      <button
                        onClick={() => openExchangeModal('product', prod)}
                        className="w-full py-2.5 rounded-full bg-gradient-to-r from-petal-300 to-terracotta-300 text-white text-sm font-medium hover:from-petal-400 hover:to-terracotta-400 transition-colors active:scale-[0.98]"
                      >
                        立即兑换
                      </button>
                    </motion.div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {/* 兑换记录 */}
          {activeTab === 'records' && (
            <motion.div
              key="records"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl2 shadow-soft overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-cream-50 text-left">
                      <th className="px-6 py-4 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                        日期
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                        会员
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                        类型
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-sage-500 uppercase tracking-wider">
                        物品
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-sage-500 uppercase tracking-wider text-right">
                        消耗积分
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-100">
                    {exchangeRecords.map((rec) => {
                      const member = members.find((m) => m.id === rec.memberId);
                      return (
                        <tr key={rec.id} className="hover:bg-cream-50/60 transition-colors">
                          <td className="px-6 py-4 text-sm text-sage-600 whitespace-nowrap">
                            {format(new Date(rec.createdAt), 'yyyy-MM-dd HH:mm')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-200 to-sage-300 flex items-center justify-center text-sm font-medium text-sage-700">
                                {member?.name?.[0] || '?'}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-sage-700">
                                  {member?.name || '未知会员'}
                                </div>
                                <div className="text-xs text-sage-400">
                                  {member?.phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                'inline-block px-2.5 py-1 text-xs font-medium rounded-lg',
                                rec.itemType === 'service'
                                  ? 'bg-sage-50 text-sage-500'
                                  : 'bg-petal-50 text-petal-300'
                              )}
                            >
                              {rec.itemType === 'service' ? '服务' : '商品'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-sage-700">
                            {rec.itemName}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-terracotta-400 text-right">
                            -{rec.pointsCost}
                          </td>
                        </tr>
                      );
                    })}
                    {exchangeRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-sage-400">
                          暂无兑换记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* 积分排行 */}
          {activeTab === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl2 shadow-soft p-6"
            >
              <div className="space-y-3">
                {sortedRanking.map((member, idx) => {
                  const maxPts = sortedRanking[0]?.points || 1;
                  const progress = (member.points / maxPts) * 100;
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl2 hover:bg-cream-50 transition-colors group"
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                          getRankStyle(idx)
                        )}
                      >
                        {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cream-200 to-petal-100 flex items-center justify-center text-xl shrink-0 ring-2 ring-white shadow-soft">
                        {member.avatar || member.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-semibold text-sage-700">
                              {member.name}
                            </span>
                            <span
                              className={cn(
                                'ml-2 text-xs px-2 py-0.5 rounded-full',
                                member.level === '钻石' && 'bg-sky2-100 text-sky2-400',
                                member.level === '金卡' && 'bg-amber-50 text-amber-500',
                                member.level === '银卡' && 'bg-slate-50 text-slate-500',
                                member.level === '普通' && 'bg-cream-100 text-sage-400'
                              )}
                            >
                              {member.level}
                            </span>
                          </div>
                          <div className="text-right flex items-center gap-1">
                            <Coins className="w-4 h-4 text-terracotta-400" />
                            <span className="font-bold text-terracotta-400 text-lg tabular-nums">
                              {member.points.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ delay: 0.3 + idx * 0.05, duration: 0.6 }}
                            className={cn(
                              'h-full rounded-full',
                              idx === 0
                                ? 'bg-gradient-to-r from-amber-300 to-amber-500'
                                : 'bg-gradient-to-r from-sage-300 to-sage-400'
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {sortedRanking.length === 0 && (
                  <div className="py-16 text-center text-sage-400">暂无排行数据</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 兑换弹窗 */}
      <AnimatePresence>
        {exchangeModal?.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            onClick={() => setExchangeModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl2 shadow-card-hover w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-sage-300 to-sage-400 p-6 text-white relative">
                <button
                  onClick={() => setExchangeModal(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <Gift className="w-10 h-10 mb-2" />
                <h3 className="text-xl font-bold">确认兑换</h3>
                <p className="text-white/80 text-sm mt-1">
                  {exchangeModal.itemType === 'service' ? '服务兑换' : '好物兑换'}
                </p>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between p-4 bg-cream-50 rounded-2xl2">
                  <div>
                    <div className="text-xs text-sage-400 mb-1">兑换物品</div>
                    <div className="font-semibold text-sage-700">
                      {exchangeModal.itemName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-sage-400 mb-1">消耗积分</div>
                    <div className="font-bold text-terracotta-400 text-xl flex items-center gap-1">
                      <Coins className="w-5 h-5" />
                      {exchangeModal.pointsCost}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-2">
                    选择会员
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="搜索姓名或手机号..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-cream-100 divide-y divide-cream-50">
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
                            {m.name}
                          </div>
                          <div className="text-xs text-sage-400">{m.phone}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-sage-400">当前积分</div>
                          <div
                            className={cn(
                              'text-sm font-semibold',
                              m.points >= exchangeModal.pointsCost
                                ? 'text-sage-500'
                                : 'text-terracotta-400'
                            )}
                          >
                            {m.points}
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
                  {selectedMemberId && (
                    (() => {
                      const m = members.find((x) => x.id === selectedMemberId);
                      if (m && m.points < exchangeModal.pointsCost) {
                        return (
                          <div className="mt-2 flex items-start gap-2 p-3 bg-terracotta-50 rounded-xl text-sm text-terracotta-400">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>积分不足，还差 {exchangeModal.pointsCost - m.points} 分</span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setExchangeModal(null)}
                    className="flex-1 py-3 rounded-full border-2 border-cream-200 text-sage-500 font-medium hover:bg-cream-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmExchange}
                    disabled={
                      !selectedMemberId ||
                      (() => {
                        const m = members.find((x) => x.id === selectedMemberId);
                        return !m || m.points < exchangeModal.pointsCost;
                      })()
                    }
                    className="flex-1 py-3 rounded-full bg-sage-400 text-white font-medium hover:bg-sage-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    确认兑换
                  </button>
                </div>
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
