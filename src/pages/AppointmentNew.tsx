import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Clock,
  UserPlus,
  PawPrint,
  Scissors,
  CalendarDays,
  Loader2,
  X,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Member, Pet, Service, Groomer, Appointment } from '@/types';
import { addMinutes, format, startOfDay, isBefore, isAfter, parseISO, setHours, setMinutes } from 'date-fns';

const STEPS = [
  { id: 1, title: '选择客户', icon: UserPlus },
  { id: 2, title: '选择宠物', icon: PawPrint },
  { id: 3, title: '选择服务', icon: Scissors },
  { id: 4, title: '选择时间', icon: CalendarDays },
  { id: 5, title: '确认预约', icon: Check },
];

const TIME_SLOTS_START = 9;
const TIME_SLOTS_END = 21;

function generateTimeSlots(date: Date) {
  const slots: Date[] = [];
  let current = setMinutes(setHours(startOfDay(date), TIME_SLOTS_START), 0);
  const end = setMinutes(setHours(startOfDay(date), TIME_SLOTS_END), 0);
  while (isBefore(current, end) || current.getTime() === end.getTime()) {
    slots.push(current);
    current = addMinutes(current, 30);
  }
  return slots;
}

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

export default function AppointmentNew() {
  const navigate = useNavigate();
  const members = useAppStore((s) => s.members);
  const pets = useAppStore((s) => s.pets);
  const services = useAppStore((s) => s.services);
  const groomers = useAppStore((s) => s.groomers);
  const appointments = useAppStore((s) => s.appointments);
  const createAppointment = useAppStore((s) => s.createAppointment);
  const checkConflict = useAppStore((s) => s.checkConflict);
  const createMember = useAppStore((s) => s.createMember);
  const createPet = useAppStore((s) => s.createPet);
  const initData = useAppStore((s) => s.initData);

  useEffect(() => {
    initData();
  }, [initData]);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [search, setSearch] = useState('');

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedGroomer, setSelectedGroomer] = useState<Groomer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newPetName, setNewPetName] = useState('');
  const [newPetBreed, setNewPetBreed] = useState('');
  const [newPetGender, setNewPetGender] = useState<'公' | '母'>('公');
  const [conflictStatus, setConflictStatus] = useState<'checking' | 'ok' | 'conflict'>('checking');
  const [conflictInfo, setConflictInfo] = useState<Appointment | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [careReminderExpanded, setCareReminderExpanded] = useState(false);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const s = search.toLowerCase();
    return members.filter(
      (m) => m.name.toLowerCase().includes(s) || m.phone.includes(search),
    );
  }, [members, search]);

  const memberPets = useMemo(
    () => pets.filter((p) => p.memberId === selectedMember?.id),
    [pets, selectedMember],
  );

  const servicesByCategory = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const sv of services.filter((s) => s.isActive)) {
      const list = map.get(sv.category) || [];
      list.push(sv);
      map.set(sv.category, list);
    }
    return Array.from(map.entries());
  }, [services]);

  const activeGroomers = useMemo(
    () => groomers.filter((g) => g.isActive),
    [groomers],
  );

  const timeSlots = useMemo(() => generateTimeSlots(selectedDate), [selectedDate]);

  const getOccupiedSlots = (groomerId: string) => {
    return appointments
      .filter(
        (a) =>
          a.groomerId === groomerId &&
          a.status !== 'cancelled' &&
          a.status !== 'completed' &&
          format(parseISO(a.startAt), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'),
      )
      .flatMap((a) => {
        const start = parseISO(a.startAt).getTime();
        const end = parseISO(a.endAt).getTime();
        return timeSlots
          .filter((slot) => {
            const t = slot.getTime();
            return t >= start && t < end;
          })
          .map((s) => s.getTime());
      });
  };

  useEffect(() => {
    if (step !== 5 || !selectedGroomer || !selectedSlot || !selectedService) {
      setConflictStatus('checking');
      setConflictInfo(null);
      return;
    }
    setConflictStatus('checking');
    const startAt = selectedSlot;
    const endAt = addMinutes(selectedSlot, selectedService.duration);
    const t = setTimeout(() => {
      const conflict = checkConflict(selectedGroomer.id, startAt, endAt);
      if (conflict) {
        setConflictStatus('conflict');
        setConflictInfo(conflict);
      } else {
        setConflictStatus('ok');
        setConflictInfo(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [step, selectedGroomer, selectedSlot, selectedService, checkConflict]);

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 5));
  };
  const goPrev = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSelectMember = (m: Member) => {
    setSelectedMember(m);
    setSelectedPet(null);
    setTimeout(() => goNext(), 150);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberPhone.trim()) return;
    const m = createMember({ name: newMemberName.trim(), phone: newMemberPhone.trim() });
    setSelectedMember(m);
    setSelectedPet(null);
    setShowAddMember(false);
    setNewMemberName('');
    setNewMemberPhone('');
    setTimeout(() => goNext(), 150);
  };

  const handleSelectPet = (p: Pet) => {
    setSelectedPet(p);
    setTimeout(() => goNext(), 150);
  };

  const handleAddPet = () => {
    if (!newPetName.trim() || !newPetBreed.trim() || !selectedMember) return;
    const p = createPet({
      memberId: selectedMember.id,
      name: newPetName.trim(),
      breed: newPetBreed.trim(),
      gender: newPetGender,
    });
    setSelectedPet(p);
    setShowAddPet(false);
    setNewPetName('');
    setNewPetBreed('');
    setNewPetGender('公');
    setTimeout(() => goNext(), 150);
  };

  const canGoStep3 = selectedService !== null && selectedGroomer !== null;

  useEffect(() => {
    if (selectedMember && step === 2 && memberPets.length === 0) {
      const t = setTimeout(() => setShowAddPet(true), 300);
      return () => clearTimeout(t);
    }
  }, [step, selectedMember, memberPets.length]);

  const handleSubmit = () => {
    if (
      !selectedMember ||
      !selectedPet ||
      !selectedService ||
      !selectedGroomer ||
      !selectedSlot ||
      conflictStatus !== 'ok'
    ) {
      return;
    }
    setSubmitting(true);
    const startAt = selectedSlot.toISOString();
    const endAt = addMinutes(selectedSlot, selectedService.duration).toISOString();
    const result = createAppointment({
      memberId: selectedMember.id,
      petId: selectedPet.id,
      serviceId: selectedService.id,
      groomerId: selectedGroomer.id,
      startAt,
      endAt,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    if (result.success && result.id) {
      setToast('预约创建成功，即将进入详情...');
      setTimeout(() => {
        navigate(`/appointments/${result.id}`);
      }, 800);
    } else if (result.conflict) {
      setConflictStatus('conflict');
      setConflictInfo(result.conflict);
    }
  };

  const endAt = selectedSlot && selectedService ? addMinutes(selectedSlot, selectedService.duration) : null;

  return (
    <div className="min-h-screen bg-cream-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-sage-700 mb-1">新建预约</h1>
          <p className="text-sm text-sage-600/70">完成以下5个步骤，为客户创建一次服务预约</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((s, idx) => {
              const active = step === s.id;
              const done = step > s.id;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all',
                        active &&
                          'bg-sage-500 border-sage-500 text-white shadow-soft scale-105',
                        done &&
                          'bg-sage-100 border-sage-300 text-sage-700',
                        !active &&
                          !done &&
                          'bg-white border-sage-200 text-sage-400',
                      )}
                    >
                      {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span
                      className={cn(
                        'text-xs whitespace-nowrap font-medium',
                        active ? 'text-sage-700' : done ? 'text-sage-600' : 'text-sage-400',
                      )}
                    >
                      {s.title}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-1 rounded-full',
                        step > s.id ? 'bg-sage-300' : 'bg-sage-200/60',
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: direction * 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -direction * 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl2 shadow-soft-lg border border-sage-100/60 p-6 sm:p-8"
            >
              {step === 1 && (
                <div>
                  <h2 className="text-lg font-semibold text-sage-700 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-sage-500" />
                    选择客户
                  </h2>
                  <div className="flex gap-3 mb-5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="搜索客户姓名或手机号..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cream-50 border border-sage-200 text-sm text-sage-700 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400"
                      />
                    </div>
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sage-500 text-white text-sm font-medium hover:bg-sage-600 transition-colors shadow-soft"
                    >
                      <Plus className="w-4 h-4" />
                      新增客户
                    </button>
                  </div>

                  {filteredMembers.length === 0 ? (
                    <div className="py-16 text-center">
                      <UserPlus className="w-12 h-12 mx-auto text-sage-300 mb-3" />
                      <p className="text-sage-500 text-sm mb-4">没有找到匹配的客户</p>
                      <button
                        onClick={() => setShowAddMember(true)}
                        className="text-sage-600 text-sm font-medium hover:text-sage-700 underline underline-offset-4"
                      >
                        立即创建新客户
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredMembers.map((m) => {
                        const isSelected = selectedMember?.id === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleSelectMember(m)}
                            className={cn(
                              'flex items-start gap-4 p-4 rounded-xl2 border text-left transition-all hover:shadow-card-hover group',
                              isSelected
                                ? 'border-sage-400 bg-sage-50 shadow-soft'
                                : 'border-sage-100 bg-white hover:border-sage-300',
                            )}
                          >
                            <Avatar name={m.name} className="w-12 h-12 text-base" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-sage-800">{m.name}</span>
                                <span
                                  className={cn(
                                    'text-xs px-2 py-0.5 rounded-full',
                                    m.level === '钻石' && 'bg-terracotta-100 text-terracotta-600',
                                    m.level === '金卡' && 'bg-cream-300 text-sage-700',
                                    m.level === '银卡' && 'bg-sky2-100 text-sky2-600',
                                    m.level === '普通' && 'bg-sage-100 text-sage-600',
                                  )}
                                >
                                  {m.level}
                                </span>
                              </div>
                              <p className="text-sm text-sage-500 mb-2">{m.phone}</p>
                              <div className="flex gap-4 text-xs">
                                <span className="text-sage-600">
                                  余额 <span className="font-semibold text-terracotta-500">¥{m.balance}</span>
                                </span>
                                <span className="text-sage-600">
                                  积分 <span className="font-semibold text-sage-700">{m.points}</span>
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-sage-300 group-hover:text-sage-500 transition-colors mt-2 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && selectedMember && (
                <div>
                  <h2 className="text-lg font-semibold text-sage-700 mb-4 flex items-center gap-2">
                    <PawPrint className="w-5 h-5 text-sage-500" />
                    选择宠物
                    <span className="text-sm font-normal text-sage-500 ml-2">
                      客户：{selectedMember.name}
                    </span>
                  </h2>

                  {memberPets.length === 0 ? (
                    <div className="py-16 text-center">
                      <PawPrint className="w-12 h-12 mx-auto text-sage-300 mb-3" />
                      <p className="text-sage-500 text-sm mb-4">该客户还没有宠物</p>
                      <button
                        onClick={() => setShowAddPet(true)}
                        className="flex items-center gap-1.5 px-4 py-2 mx-auto rounded-xl bg-sage-500 text-white text-sm font-medium hover:bg-sage-600 transition-colors shadow-soft"
                      >
                        <Plus className="w-4 h-4" />
                        添加宠物
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {memberPets.map((p) => {
                        const isSelected = selectedPet?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => handleSelectPet(p)}
                            className={cn(
                              'flex items-start gap-4 p-4 rounded-xl2 border text-left transition-all hover:shadow-card-hover group',
                              isSelected
                                ? 'border-sage-400 bg-sage-50 shadow-soft'
                                : 'border-sage-100 bg-white hover:border-sage-300',
                            )}
                          >
                            <Avatar name={p.name} className="w-12 h-12 text-base" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-medium text-sage-800">{p.name}</span>
                                <span
                                  className={cn(
                                    'text-xs px-2 py-0.5 rounded-full',
                                    p.gender === '公'
                                      ? 'bg-sky2-100 text-sky2-600'
                                      : 'bg-petal-100 text-petal-400',
                                  )}
                                >
                                  {p.gender}
                                </span>
                              </div>
                              <p className="text-sm text-sage-500 mb-2">
                                {p.breed}
                                {p.weight ? ` · ${p.weight}kg` : ''}
                              </p>
                              {p.notes && (
                                <p className="text-xs text-sage-400 line-clamp-2">📝 {p.notes}</p>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-sage-300 group-hover:text-sage-500 transition-colors mt-2 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={() => setShowAddPet(true)}
                      className="flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-700 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      添加新宠物
                    </button>
                  </div>

                  {selectedPet && (
                    <div className="mt-6 p-5 bg-terracotta-50 border-2 border-terracotta-400 rounded-2xl">
                      <h3 className="text-sm font-bold text-terracotta-700 mb-3 flex items-center gap-1.5">
                        🐾 护理提醒 · {selectedPet.name}
                      </h3>
                      {(selectedPet.preferences && selectedPet.preferences.length > 0) || selectedPet.careNotes ? (
                        <div className="space-y-3">
                          {selectedPet.preferences && selectedPet.preferences.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-terracotta-600 mb-1.5">偏好标签</div>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedPet.preferences.map((pref, i) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 text-xs font-medium rounded-full bg-petal-100 text-petal-700 border border-petal-200"
                                  >
                                    {pref}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedPet.careNotes && (
                            <div>
                              <div className="text-xs font-medium text-terracotta-600 mb-1.5">护理记录</div>
                              <p className="text-xs text-sage-500 whitespace-pre-wrap leading-relaxed">
                                {selectedPet.careNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-sage-400 italic">
                          暂未填写护理信息，请在会员档案中补充
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-lg font-semibold text-sage-700 mb-1 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-sage-500" />
                    选择服务项目
                  </h2>
                  <p className="text-sm text-sage-500 mb-5">请选择一项服务，并指定一位美容师</p>

                  <div className="space-y-6">
                    {servicesByCategory.map(([cat, list]) => (
                      <div key={cat}>
                        <h3 className="text-sm font-semibold text-sage-600 mb-3 flex items-center gap-2">
                          <span className="w-1 h-4 rounded-full bg-sage-400" />
                          {cat}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {list.map((sv) => {
                            const isSelected = selectedService?.id === sv.id;
                            return (
                              <button
                                key={sv.id}
                                onClick={() => setSelectedService(sv)}
                                className={cn(
                                  'p-4 rounded-xl2 border text-left transition-all hover:shadow-card-hover group relative overflow-hidden',
                                  isSelected
                                    ? 'border-sage-400 bg-sage-50 shadow-soft'
                                    : 'border-sage-100 bg-white hover:border-sage-300',
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sage-500 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                  </div>
                                )}
                                <div className="font-medium text-sage-800 mb-1.5 pr-6">{sv.name}</div>
                                <div className="flex items-center gap-3 text-xs text-sage-500 mb-2">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {sv.duration}分钟
                                  </span>
                                </div>
                                <div className="flex items-end justify-between">
                                  <span className="text-lg font-bold text-terracotta-500">¥{sv.price}</span>
                                  {sv.pointsCost && (
                                    <span className="text-xs text-sage-400">
                                      积分 {sv.pointsCost}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 border-t border-sage-100 pt-6">
                    <h3 className="text-sm font-semibold text-sage-600 mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 rounded-full bg-terracotta-400" />
                      选择美容师
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {activeGroomers.map((g) => {
                        const isSelected = selectedGroomer?.id === g.id;
                        return (
                          <button
                            key={g.id}
                            onClick={() => setSelectedGroomer(g)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-xl2 border transition-all min-w-[100px] hover:shadow-card-hover',
                              isSelected
                                ? 'border-sage-400 bg-sage-50 shadow-soft'
                                : 'border-sage-100 bg-white hover:border-sage-300',
                            )}
                          >
                            <Avatar name={g.name} className="w-14 h-14 text-lg" />
                            <span className="text-sm font-medium text-sage-800">{g.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-xl bg-cream-100/50 border border-cream-200 text-sm">
                    {selectedService ? (
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-sage-600">已选服务：</span>
                          <span className="font-medium text-sage-700">
                            {selectedService.name} · {selectedService.duration}分钟
                          </span>
                        </div>
                        <div>
                          <span className="text-sage-600">美容师：</span>
                          <span className="font-medium text-sage-700">
                            {selectedGroomer?.name || '未选择'}
                          </span>
                        </div>
                        <div className="font-bold text-terracotta-500">¥{selectedService.price}</div>
                      </div>
                    ) : (
                      <p className="text-sage-500">请先选择服务项目和美容师</p>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && selectedGroomer && selectedService && (
                <div className="relative">
                  {selectedPet && (
                    <div className="absolute -top-2 right-0 z-10">
                      <div className="relative">
                        <button
                          onClick={() => setCareReminderExpanded(!careReminderExpanded)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-terracotta-100 hover:bg-terracotta-200 text-terracotta-700 rounded-xl shadow-soft border border-terracotta-300 text-xs font-medium transition-colors"
                        >
                          <Bell size={14} />
                          <span>🐾 {selectedPet.name} 护理提醒</span>
                          <ChevronDown size={14} className={cn('transition-transform', careReminderExpanded && 'rotate-180')} />
                        </button>
                        <AnimatePresence>
                          {careReminderExpanded && (
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full mt-2 w-72 p-4 bg-white rounded-2xl shadow-card-hover border border-terracotta-200"
                            >
                              <h4 className="text-sm font-bold text-terracotta-700 mb-2 flex items-center gap-1.5">
                                🐾 护理提醒 · {selectedPet.name}
                              </h4>
                              {(selectedPet.preferences && selectedPet.preferences.length > 0) || selectedPet.careNotes ? (
                                <div className="space-y-2.5">
                                  {selectedPet.preferences && selectedPet.preferences.length > 0 && (
                                    <div>
                                      <div className="text-[11px] font-medium text-terracotta-600 mb-1">偏好标签</div>
                                      <div className="flex flex-wrap gap-1">
                                        {selectedPet.preferences.map((pref, i) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-petal-100 text-petal-700"
                                          >
                                            {pref}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {selectedPet.careNotes && (
                                    <div>
                                      <div className="text-[11px] font-medium text-terracotta-600 mb-1">护理记录</div>
                                      <p className="text-[11px] text-sage-500 whitespace-pre-wrap leading-relaxed">
                                        {selectedPet.careNotes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[11px] text-sage-400 italic">
                                  暂未填写护理信息
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-sage-700 mb-1 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-sage-500" />
                    选择预约时间
                  </h2>
                  <p className="text-sm text-sage-500 mb-5">
                    美容师 <span className="font-medium text-sage-700">{selectedGroomer.name}</span> · 服务时长{' '}
                    <span className="font-medium text-sage-700">{selectedService.duration}分钟</span>
                  </p>

                  <div className="mb-5 flex items-center gap-3">
                    <label className="text-sm text-sage-600 shrink-0">选择日期：</label>
                    <input
                      type="date"
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        setSelectedDate(startOfDay(new Date(e.target.value)));
                        setSelectedSlot(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-cream-50 border border-sage-200 text-sm text-sage-700 focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400"
                    />
                    <div className="text-sm text-sage-500">
                      {format(selectedDate, 'yyyy年MM月dd日 EEEE', { locale: undefined })}
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-white border border-sage-200" />
                      <span className="text-sage-500">空闲</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-petal-100 border border-petal-300" />
                      <span className="text-sage-500">已占用</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded bg-sage-400" />
                      <span className="text-sage-500">已选</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(() => {
                      const occupied = getOccupiedSlots(selectedGroomer.id);
                      const now = new Date();
                      const slotsForGroomer: { time: Date; isOccupied: boolean; isPast: boolean; isSelected: boolean; isEdge: boolean }[] = [];
                      for (let i = 0; i < timeSlots.length; i++) {
                        const slot = timeSlots[i];
                        const serviceEnd = addMinutes(slot, selectedService.duration);
                        const serviceEndLimit = setMinutes(
                          setHours(startOfDay(selectedDate), TIME_SLOTS_END),
                          0,
                        );
                        const slotsNeeded = Math.ceil(selectedService.duration / 30);
                        const slotsAfter = timeSlots.slice(i, i + slotsNeeded);
                        const hasAllSlots = slotsAfter.length === slotsNeeded;
                        const anyOccupied = slotsAfter.some((s) => occupied.includes(s.getTime()));
                        const isPast = isBefore(slot, startOfDay(now)) ? false : isBefore(slot, now);
                        const exceed = isAfter(serviceEnd, serviceEndLimit);
                        const isOccupied = !hasAllSlots || anyOccupied || isPast || exceed;
                        slotsForGroomer.push({
                          time: slot,
                          isOccupied,
                          isPast,
                          isSelected: selectedSlot?.getTime() === slot.getTime(),
                          isEdge: i === timeSlots.length - 1,
                        });
                      }
                      return (
                        <div>
                          <div className="text-sm font-medium text-sage-600 mb-2">
                            {selectedGroomer.name}
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                            {slotsForGroomer.map((s) => (
                              <button
                                key={s.time.getTime()}
                                disabled={s.isOccupied}
                                onClick={() => setSelectedSlot(s.time)}
                                className={cn(
                                  'py-2 px-1 rounded-lg text-xs font-medium transition-all border',
                                  s.isSelected
                                    ? 'bg-sage-500 text-white border-sage-500 shadow-soft'
                                    : s.isOccupied
                                    ? 'bg-petal-100/60 text-petal-400 border-petal-200 cursor-not-allowed line-through opacity-70'
                                    : 'bg-white text-sage-600 border-sage-200 hover:border-sage-400 hover:bg-sage-50 hover:text-sage-700',
                                )}
                              >
                                {format(s.time, 'HH:mm')}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {selectedSlot && endAt && (
                    <div className="mt-5 p-4 rounded-xl bg-sage-50 border border-sage-200 text-sm">
                      <span className="text-sage-600">已选时段：</span>
                      <span className="font-semibold text-sage-800">
                        {format(selectedSlot, 'yyyy-MM-dd HH:mm')} — {format(endAt, 'HH:mm')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="relative">
                  {selectedPet && (
                    <div className="absolute -top-2 right-0 z-10">
                      <div className="relative">
                        <button
                          onClick={() => setCareReminderExpanded(!careReminderExpanded)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-terracotta-100 hover:bg-terracotta-200 text-terracotta-700 rounded-xl shadow-soft border border-terracotta-300 text-xs font-medium transition-colors"
                        >
                          <Bell size={14} />
                          <span>🐾 {selectedPet.name} 护理提醒</span>
                          <ChevronDown size={14} className={cn('transition-transform', careReminderExpanded && 'rotate-180')} />
                        </button>
                        <AnimatePresence>
                          {careReminderExpanded && (
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-0 top-full mt-2 w-72 p-4 bg-white rounded-2xl shadow-card-hover border border-terracotta-200"
                            >
                              <h4 className="text-sm font-bold text-terracotta-700 mb-2 flex items-center gap-1.5">
                                🐾 护理提醒 · {selectedPet.name}
                              </h4>
                              {(selectedPet.preferences && selectedPet.preferences.length > 0) || selectedPet.careNotes ? (
                                <div className="space-y-2.5">
                                  {selectedPet.preferences && selectedPet.preferences.length > 0 && (
                                    <div>
                                      <div className="text-[11px] font-medium text-terracotta-600 mb-1">偏好标签</div>
                                      <div className="flex flex-wrap gap-1">
                                        {selectedPet.preferences.map((pref, i) => (
                                          <span
                                            key={i}
                                            className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-petal-100 text-petal-700"
                                          >
                                            {pref}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {selectedPet.careNotes && (
                                    <div>
                                      <div className="text-[11px] font-medium text-terracotta-600 mb-1">护理记录</div>
                                      <p className="text-[11px] text-sage-500 whitespace-pre-wrap leading-relaxed">
                                        {selectedPet.careNotes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[11px] text-sage-400 italic">
                                  暂未填写护理信息
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-sage-700 mb-5 flex items-center gap-2">
                    <Check className="w-5 h-5 text-sage-500" />
                    确认预约信息
                  </h2>

                  <div
                    className={cn(
                      'mb-5 p-4 rounded-xl2 flex items-center gap-3 border',
                      conflictStatus === 'checking' &&
                        'bg-cream-50 border-cream-200 text-sage-600',
                      conflictStatus === 'ok' &&
                        'bg-sage-50 border-sage-300 text-sage-700',
                      conflictStatus === 'conflict' &&
                        'bg-petal-50 border-petal-300 text-petal-600',
                    )}
                  >
                    {conflictStatus === 'checking' && (
                      <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                    )}
                    {conflictStatus === 'ok' && <Check className="w-5 h-5 shrink-0" />}
                    {conflictStatus === 'conflict' && (
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                    )}
                    <div className="text-sm">
                      {conflictStatus === 'checking' && <span className="font-medium">冲突检测中...</span>}
                      {conflictStatus === 'ok' && (
                        <span className="font-medium">时间无冲突，可以预约 ✓</span>
                      )}
                      {conflictStatus === 'conflict' && (
                        <div>
                          <span className="font-medium">时间冲突，请返回第4步重新选择</span>
                          {conflictInfo && (
                            <p className="text-xs mt-0.5 opacity-80">
                              与美容师 {groomers.find((g) => g.id === conflictInfo.groomerId)?.name} 的{' '}
                              {format(parseISO(conflictInfo.startAt), 'HH:mm')} 预约重叠
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <InfoCard title="客户信息">
                      <div className="flex items-center gap-3">
                        <Avatar name={selectedMember?.name || ''} className="w-10 h-10" />
                        <div>
                          <div className="font-medium text-sage-800">{selectedMember?.name}</div>
                          <div className="text-xs text-sage-500">{selectedMember?.phone}</div>
                        </div>
                      </div>
                    </InfoCard>
                    <InfoCard title="宠物信息">
                      <div className="flex items-center gap-3">
                        <Avatar name={selectedPet?.name || ''} className="w-10 h-10" />
                        <div>
                          <div className="font-medium text-sage-800">
                            {selectedPet?.name}
                            <span
                              className={cn(
                                'ml-2 text-xs px-1.5 py-0.5 rounded-full',
                                selectedPet?.gender === '公'
                                  ? 'bg-sky2-100 text-sky2-600'
                                  : 'bg-petal-100 text-petal-400',
                              )}
                            >
                              {selectedPet?.gender}
                            </span>
                          </div>
                          <div className="text-xs text-sage-500">{selectedPet?.breed}</div>
                        </div>
                      </div>
                    </InfoCard>
                    <InfoCard title="服务信息">
                      <div className="font-medium text-sage-800">{selectedService?.name}</div>
                      <div className="text-xs text-sage-500 mt-0.5">
                        {selectedService?.duration}分钟 · ¥{selectedService?.price}
                      </div>
                    </InfoCard>
                    <InfoCard title="美容师">
                      <div className="flex items-center gap-3">
                        <Avatar name={selectedGroomer?.name || ''} className="w-10 h-10" />
                        <div className="font-medium text-sage-800">{selectedGroomer?.name}</div>
                      </div>
                    </InfoCard>
                    <InfoCard title="预约时间" span>
                      <div className="font-medium text-sage-800">
                        {selectedSlot && endAt
                          ? `${format(selectedSlot, 'yyyy-MM-dd HH:mm')} — ${format(endAt, 'HH:mm')}`
                          : '-'}
                      </div>
                    </InfoCard>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-sage-700 mb-2">备注</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="选填：特殊需求、注意事项等"
                      className="w-full px-4 py-3 rounded-xl bg-cream-50 border border-sage-200 text-sm text-sage-700 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400 resize-none"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={step === 1 ? () => navigate(-1) : goPrev}
            disabled={step === 5 && submitting}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border border-sage-200 text-sm font-medium text-sage-600 hover:bg-sage-50 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? '取消' : '上一步'}
          </button>

          {step < 5 ? (
            <button
              onClick={goNext}
              disabled={
                (step === 1 && !selectedMember) ||
                (step === 2 && !selectedPet) ||
                (step === 3 && !canGoStep3) ||
                (step === 4 && !selectedSlot)
              }
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-sage-500 text-white text-sm font-medium hover:bg-sage-600 transition-colors shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一步
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={conflictStatus !== 'ok' || submitting}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-terracotta-500 text-white text-sm font-medium hover:bg-terracotta-600 transition-colors shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  确认提交预约
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddMember && (
          <Modal title="新增客户" onClose={() => setShowAddMember(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  姓名 <span className="text-petal-400">*</span>
                </label>
                <input
                  autoFocus
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="请输入客户姓名"
                  className="w-full px-4 py-2.5 rounded-xl bg-cream-50 border border-sage-200 text-sm text-sage-700 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  手机号 <span className="text-petal-400">*</span>
                </label>
                <input
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full px-4 py-2.5 rounded-xl bg-cream-50 border border-sage-200 text-sm text-sage-700 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-sage-200 text-sm font-medium text-sage-600 hover:bg-sage-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!newMemberName.trim() || !newMemberPhone.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-sage-500 text-white text-sm font-medium hover:bg-sage-600 disabled:opacity-50"
                >
                  创建
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showAddPet && selectedMember && (
          <Modal title={`为 ${selectedMember.name} 添加宠物`} onClose={() => setShowAddPet(false)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  名字 <span className="text-petal-400">*</span>
                </label>
                <input
                  autoFocus
                  value={newPetName}
                  onChange={(e) => setNewPetName(e.target.value)}
                  placeholder="宠物名字"
                  className="w-full px-4 py-2.5 rounded-xl bg-cream-50 border border-sage-200 text-sm text-sage-700 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  品种 <span className="text-petal-400">*</span>
                </label>
                <input
                  value={newPetBreed}
                  onChange={(e) => setNewPetBreed(e.target.value)}
                  placeholder="例如：泰迪、金毛"
                  className="w-full px-4 py-2.5 rounded-xl bg-cream-50 border border-sage-200 text-sm text-sage-700 placeholder-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/50 focus:border-sage-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">性别</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['公', '母'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setNewPetGender(g)}
                      className={cn(
                        'py-2.5 rounded-xl border text-sm font-medium transition-colors',
                        newPetGender === g
                          ? g === '公'
                            ? 'bg-sky2-100 border-sky2-300 text-sky2-600'
                            : 'bg-petal-100 border-petal-300 text-petal-500'
                          : 'bg-white border-sage-200 text-sage-500 hover:bg-sage-50',
                      )}
                    >
                      {g === '公' ? '♂ 公' : '♀ 母'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddPet(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-sage-200 text-sm font-medium text-sage-600 hover:bg-sage-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddPet}
                  disabled={!newPetName.trim() || !newPetBreed.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-sage-500 text-white text-sm font-medium hover:bg-sage-600 disabled:opacity-50"
                >
                  添加
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl bg-sage-600 text-white text-sm font-medium shadow-soft-lg z-50 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoCard({
  title,
  children,
  span,
}: {
  title: string;
  children: React.ReactNode;
  span?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl2 bg-cream-50/50 border border-cream-200',
        span && 'sm:col-span-2',
      )}
    >
      <div className="text-xs text-sage-500 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl2 shadow-soft-lg w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-sage-700">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sage-400 hover:bg-sage-100 hover:text-sage-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
