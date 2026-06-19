import { useState, useMemo } from 'react';
import { useAppStore } from '@/store';
import { Service, ServiceCategory } from '@/types';
import { cn } from '@/lib/utils';
import {
  Plus,
  Pencil,
  X,
  Check,
  AlertCircle,
  Clock,
  Coins,
  Scissors,
  Sparkles,
  Droplets,
  MoreHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categories: ServiceCategory[] = ['基础洗护', '造型修剪', 'SPA护理', '其他'];

const categoryIcon: Record<ServiceCategory, typeof Scissors> = {
  基础洗护: Droplets,
  造型修剪: Scissors,
  SPA护理: Sparkles,
  其他: MoreHorizontal,
};

const categoryColor: Record<ServiceCategory, string> = {
  基础洗护: 'from-sky2-100 to-sky2-200 text-sky2-400',
  造型修剪: 'from-petal-100 to-petal-200 text-petal-300',
  SPA护理: 'from-cream-200 to-terracotta-100 text-terracotta-400',
  其他: 'from-sage-100 to-sage-200 text-sage-500',
};

interface ServiceFormData {
  name: string;
  category: ServiceCategory;
  duration: number;
  price: number;
  pointsCost?: number;
  isActive: boolean;
}

const emptyForm: ServiceFormData = {
  name: '',
  category: '基础洗护',
  duration: 60,
  price: 0,
  pointsCost: undefined,
  isActive: true,
};

export default function ServiceList() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormData>(emptyForm);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const services = useAppStore((s) => s.services);
  const createService = useAppStore((s) => s.createService);
  const updateService = useAppStore((s) => s.updateService);
  const initData = useAppStore((s) => s.initData);

  const grouped = useMemo(() => {
    const map = new Map<ServiceCategory, Service[]>();
    for (const cat of categories) {
      map.set(cat, []);
    }
    for (const s of services) {
      map.get(s.category)?.push(s);
    }
    return map;
  }, [services]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditing(svc);
    setForm({
      name: svc.name,
      category: svc.category,
      duration: svc.duration,
      price: svc.price,
      pointsCost: svc.pointsCost,
      isActive: svc.isActive,
    });
    setModalOpen(true);
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return '请输入服务名称';
    if (form.duration <= 0) return '时长必须大于0分钟';
    if (form.price < 0) return '价格不能为负数';
    if (form.pointsCost !== undefined && form.pointsCost < 0) return '积分不能为负数';
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      showToast('error', err);
      return;
    }
    if (editing) {
      updateService(editing.id, {
        ...form,
        pointsCost: form.pointsCost || undefined,
      });
      showToast('success', '服务已更新');
    } else {
      createService({
        ...form,
        pointsCost: form.pointsCost || undefined,
      });
      showToast('success', '服务已创建');
    }
    setModalOpen(false);
  };

  const toggleActive = (svc: Service) => {
    updateService(svc.id, { isActive: !svc.isActive });
    showToast('success', svc.isActive ? '已停用' : '已启用');
  };

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 顶部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sage-700">服务项目管理</h1>
            <p className="text-sm text-sage-400 mt-1">
              管理所有美容服务项目，设置价格与积分兑换
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 rounded-full bg-sage-400 text-white font-medium shadow-soft hover:bg-sage-500 transition-colors flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            新增服务
          </button>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const list = grouped.get(cat) || [];
            const activeCount = list.filter((s) => s.isActive).length;
            const Icon = categoryIcon[cat];
            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl2 p-5 shadow-soft"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center',
                      categoryColor[cat]
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-sage-400">
                    {activeCount}/{list.length} 在售
                  </span>
                </div>
                <div className="text-sm text-sage-400">{cat}</div>
                <div className="text-2xl font-bold text-sage-700 mt-0.5">
                  {list.length}
                  <span className="text-sm font-normal text-sage-400 ml-1">项</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 分组展示 */}
        <div className="space-y-8">
          {categories.map((cat) => {
            const list = grouped.get(cat) || [];
            if (list.length === 0) return null;
            const Icon = categoryIcon[cat];
            return (
              <section key={cat}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center',
                      categoryColor[cat]
                    )}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="text-lg font-semibold text-sage-700">{cat}</h2>
                  <span className="text-xs text-sage-400 bg-cream-100 px-2 py-0.5 rounded-full">
                    {list.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {list.map((svc) => (
                    <motion.div
                      key={svc.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        'bg-white rounded-2xl2 p-5 shadow-soft transition-all relative overflow-hidden group',
                        !svc.isActive && 'opacity-60'
                      )}
                    >
                      {!svc.isActive && (
                        <div className="absolute top-3 right-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                            已停用
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-4 pr-12">
                        <h3 className="text-base font-semibold text-sage-700 group-hover:text-sage-500 transition-colors">
                          {svc.name}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm mb-5">
                        <div className="flex items-center gap-1.5 text-sage-500">
                          <Clock className="w-4 h-4 text-sage-400" />
                          <span>{svc.duration}分钟</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-terracotta-400 font-semibold">
                          <span className="text-sm">¥</span>
                          <span className="text-lg">{svc.price}</span>
                        </div>
                        {svc.pointsCost !== undefined && (
                          <div className="flex items-center gap-1.5 text-petal-300">
                            <Coins className="w-4 h-4" />
                            <span>{svc.pointsCost}分</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-cream-100">
                        <button
                          onClick={() => openEdit(svc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sage-500 hover:bg-cream-100 transition-colors text-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          编辑
                        </button>
                        <button
                          onClick={() => toggleActive(svc)}
                          className={cn(
                            'relative w-12 h-7 rounded-full transition-colors',
                            svc.isActive ? 'bg-sage-400' : 'bg-cream-200'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all',
                              svc.isActive ? 'left-[22px]' : 'left-0.5'
                            )}
                          />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })}
          {services.length === 0 && (
            <div className="py-24 text-center text-sage-400">
              暂无服务项目，点击右上角「新增服务」开始添加
            </div>
          )}
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl2 shadow-card-hover w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-sage-300 to-sage-400 p-6 text-white relative">
                <button
                  onClick={() => setModalOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                  {editing ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <h3 className="text-xl font-bold">
                  {editing ? '编辑服务' : '新增服务'}
                </h3>
                <p className="text-white/80 text-sm mt-1">
                  填写服务的详细信息
                </p>
              </div>
              <div className="p-6 space-y-4">
                {/* 名称 */}
                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-2">
                    服务名称 <span className="text-terracotta-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="例如：基础洗澡"
                    className="w-full px-4 py-3 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm"
                  />
                </div>

                {/* 分类 */}
                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-2">
                    服务分类 <span className="text-terracotta-400">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setForm({ ...form, category: cat })}
                        className={cn(
                          'py-2.5 rounded-xl text-sm font-medium transition-all',
                          form.category === cat
                            ? 'bg-sage-400 text-white shadow-soft'
                            : 'bg-cream-50 text-sage-500 hover:bg-cream-100'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 时长 & 价格 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-sage-600 mb-2">
                      服务时长（分钟）
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400" />
                      <input
                        type="number"
                        min={1}
                        value={form.duration}
                        onChange={(e) =>
                          setForm({ ...form, duration: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-sage-600 mb-2">
                      价格（元）
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 text-sm">
                        ¥
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 积分兑换 */}
                <div>
                  <label className="block text-sm font-medium text-sage-600 mb-2">
                    积分兑换分
                    <span className="text-xs text-sage-400 font-normal ml-2">
                      （留空则不支持积分兑换）
                    </span>
                  </label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-terracotta-400" />
                    <input
                      type="number"
                      min={0}
                      value={form.pointsCost ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm({
                          ...form,
                          pointsCost: v === '' ? undefined : Math.max(0, Number(v) || 0),
                        });
                      }}
                      placeholder="例如：500"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-cream-200 focus:border-sage-400 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                {/* 启用开关 */}
                <div className="flex items-center justify-between p-4 bg-cream-50 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-sage-700">上架状态</div>
                    <div className="text-xs text-sage-400 mt-0.5">
                      停用后用户将无法预约此服务
                    </div>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, isActive: !form.isActive })}
                    className={cn(
                      'relative w-12 h-7 rounded-full transition-colors',
                      form.isActive ? 'bg-sage-400' : 'bg-cream-200'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all',
                        form.isActive ? 'left-[22px]' : 'left-0.5'
                      )}
                    />
                  </button>
                </div>

                {/* 按钮 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-3 rounded-full border-2 border-cream-200 text-sage-500 font-medium hover:bg-cream-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-3 rounded-full bg-sage-400 text-white font-medium hover:bg-sage-500 transition-colors active:scale-[0.98]"
                  >
                    {editing ? '保存修改' : '确认创建'}
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
