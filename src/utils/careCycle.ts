import { ConsumptionRecord, FollowUpRecord, Pet, Member, Service, ServiceCategory } from '@/types';
import { addDays, differenceInDays, startOfDay, parseISO } from 'date-fns';

export interface PetCareCycle {
  petId: string;
  petName: string;
  memberId: string;
  memberName: string;
  lastServiceDate: Date | null;
  lastServiceName: string;
  lastGroomerId?: string;
  lastGroomerName?: string;
  nextSuggestedDate: Date | null;
  nextServiceName: string;
  nextServiceId: string;
  daysUntilNext: number;
  status: 'upcoming' | 'due_soon' | 'overdue';
  source: 'followup' | 'auto';
}

const DEFAULT_CYCLE_DAYS: Record<ServiceCategory, number> = {
  '基础洗护': 14,
  '造型修剪': 30,
  'SPA护理': 21,
  '其他': 20,
};

export function getLastServiceRecord(
  petId: string,
  consumptionRecords: ConsumptionRecord[]
): ConsumptionRecord | null {
  const petRecords = consumptionRecords
    .filter((r) => r.petId === petId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return petRecords[0] || null;
}

export function getLastServiceDate(
  petId: string,
  consumptionRecords: ConsumptionRecord[]
): Date | null {
  const last = getLastServiceRecord(petId, consumptionRecords);
  return last ? new Date(last.createdAt) : null;
}

function parseFollowUpSuggestion(suggestion: string, baseDate: Date): Date | null {
  if (!suggestion || !suggestion.trim()) return null;

  const datePattern = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
  const dateMatch = suggestion.match(datePattern);
  if (dateMatch) {
    const parsed = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const weekMatch = suggestion.match(/(\d+)\s*周/);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10);
    return addDays(baseDate, weeks * 7);
  }

  const monthMatch = suggestion.match(/(\d+)\s*个月/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    return addDays(baseDate, months * 30);
  }

  const dayMatch = suggestion.match(/(\d+)\s*天/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    return addDays(baseDate, days);
  }

  if (suggestion.includes('两周') || suggestion.includes('2周')) {
    return addDays(baseDate, 14);
  }
  if (suggestion.includes('三周') || suggestion.includes('3周')) {
    return addDays(baseDate, 21);
  }
  if (suggestion.includes('一个月') || suggestion.includes('1个月')) {
    return addDays(baseDate, 30);
  }
  if (suggestion.includes('一周') || suggestion.includes('1周')) {
    return addDays(baseDate, 7);
  }

  return null;
}

export function getNextSuggestedDate(
  petId: string,
  consumptionRecords: ConsumptionRecord[],
  followUpRecords: FollowUpRecord[],
  services: Service[]
): { date: Date | null; source: 'followup' | 'auto'; serviceId: string; serviceName: string } {
  const lastService = getLastServiceRecord(petId, consumptionRecords);
  const lastServiceDate = lastService ? new Date(lastService.createdAt) : null;

  const petFollowUps = followUpRecords
    .filter((f) => f.petId === petId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  for (const fu of petFollowUps) {
    if (fu.nextCareSuggestion && lastServiceDate) {
      const parsed = parseFollowUpSuggestion(fu.nextCareSuggestion, lastServiceDate);
      if (parsed) {
        const lastServiceObj = lastService
          ? services.find((s) => s.id === lastService.serviceId)
          : null;
        const serviceName =
          extractServiceNameFromSuggestion(fu.nextCareSuggestion, services) ||
          lastServiceObj?.name ||
          '护理服务';
        const serviceId =
          findServiceIdByName(serviceName, services) || lastService?.serviceId || '';
        return {
          date: parsed,
          source: 'followup',
          serviceId,
          serviceName,
        };
      }
    }
  }

  if (!lastService || !lastServiceDate) {
    return { date: null, source: 'auto', serviceId: '', serviceName: '' };
  }

  const lastServiceObj = services.find((s) => s.id === lastService.serviceId);
  const category: ServiceCategory = lastServiceObj?.category || '其他';
  const cycleDays = DEFAULT_CYCLE_DAYS[category];
  const nextDate = addDays(lastServiceDate, cycleDays);

  return {
    date: nextDate,
    source: 'auto',
    serviceId: lastService.serviceId,
    serviceName: lastServiceObj?.name || '护理服务',
  };
}

function extractServiceNameFromSuggestion(suggestion: string, services: Service[]): string | null {
  for (const svc of services) {
    if (suggestion.includes(svc.name)) {
      return svc.name;
    }
  }
  if (suggestion.includes('洗澡')) return '基础洗澡';
  if (suggestion.includes('造型')) return '泰迪造型';
  if (suggestion.includes('SPA') || suggestion.includes('spa')) return 'SPA护理';
  if (suggestion.includes('药浴')) return '药浴护理';
  return null;
}

function findServiceIdByName(name: string, services: Service[]): string | null {
  const svc = services.find((s) => s.name === name);
  return svc?.id || null;
}

export function computePetCareCycle(
  pet: Pet,
  member: Member,
  consumptionRecords: ConsumptionRecord[],
  followUpRecords: FollowUpRecord[],
  services: Service[],
  groomers: { id: string; name: string }[]
): PetCareCycle {
  const lastService = getLastServiceRecord(pet.id, consumptionRecords);
  const lastServiceDate = lastService ? new Date(lastService.createdAt) : null;
  const lastServiceObj = lastService
    ? services.find((s) => s.id === lastService.serviceId)
    : null;
  const lastGroomer = lastService?.groomerId
    ? groomers.find((g) => g.id === lastService.groomerId)
    : undefined;

  const nextResult = getNextSuggestedDate(
    pet.id,
    consumptionRecords,
    followUpRecords,
    services
  );

  const today = startOfDay(new Date());
  let daysUntilNext = 0;
  let status: 'upcoming' | 'due_soon' | 'overdue' = 'upcoming';

  if (nextResult.date) {
    daysUntilNext = differenceInDays(startOfDay(nextResult.date), today);
    if (daysUntilNext < 0) {
      status = 'overdue';
    } else if (daysUntilNext <= 7) {
      status = 'due_soon';
    } else {
      status = 'upcoming';
    }
  }

  return {
    petId: pet.id,
    petName: pet.name,
    memberId: member.id,
    memberName: member.name,
    lastServiceDate,
    lastServiceName: lastServiceObj?.name || '暂无服务记录',
    lastGroomerId: lastService?.groomerId,
    lastGroomerName: lastGroomer?.name,
    nextSuggestedDate: nextResult.date,
    nextServiceName: nextResult.serviceName || '护理服务',
    nextServiceId: nextResult.serviceId,
    daysUntilNext,
    status,
    source: nextResult.source,
  };
}

export function computeAllPetCareCycles(
  pets: Pet[],
  members: Member[],
  consumptionRecords: ConsumptionRecord[],
  followUpRecords: FollowUpRecord[],
  services: Service[],
  groomers: { id: string; name: string }[]
): PetCareCycle[] {
  return pets.map((pet) => {
    const member = members.find((m) => m.id === pet.memberId);
    if (!member) {
      return {
        petId: pet.id,
        petName: pet.name,
        memberId: pet.memberId,
        memberName: '未知会员',
        lastServiceDate: null,
        lastServiceName: '暂无服务记录',
        nextSuggestedDate: null,
        nextServiceName: '护理服务',
        nextServiceId: '',
        daysUntilNext: 0,
        status: 'upcoming' as const,
        source: 'auto' as const,
      };
    }
    return computePetCareCycle(
      pet,
      member,
      consumptionRecords,
      followUpRecords,
      services,
      groomers
    );
  });
}
