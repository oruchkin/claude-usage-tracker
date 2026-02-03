import { CalculationResult, QuotaState, WeeklyCalculationResult, MonthlyCalculationResult } from '../types';
import { 
  addDays, 
  differenceInMilliseconds, 
  format, 
  parse, 
  isValid, 
  addHours, 
  addMilliseconds, 
  isSameDay,
  isTomorrow,
  isYesterday,
  setSeconds,
  setMilliseconds,
  startOfDay,
  differenceInDays,
  setDate,
  addMonths,
  subMonths,
  parseISO
} from 'date-fns';

export const calculateQuotaStats = (
  now: Date,
  state: QuotaState
): CalculationResult => {
  const { resetTime } = state;
  const percentUsed = Number(state.percentUsed) || 0;
  const windowLengthHours = Number(state.windowLengthHours) || 1;

  let resetDate = parse(resetTime, 'HH:mm', now);
  if (!isValid(resetDate)) resetDate = startOfDay(now);

  resetDate = setSeconds(resetDate, 0);
  resetDate = setMilliseconds(resetDate, 0);

  if (resetDate.getTime() < now.getTime()) {
    resetDate = addDays(resetDate, 1);
  }

  const windowStart = addHours(resetDate, -windowLengthHours);
  const elapsedMs = differenceInMilliseconds(now, windowStart);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const isWindowActive = elapsedMs >= 0;

  const ratePerHour = (elapsedHours > 0) ? (percentUsed / elapsedHours) : 0;
  const safeRatePerHour = windowLengthHours > 0 ? (100 / windowLengthHours) : 0;
  const forecastPercent = ratePerHour * windowLengthHours;
  const remainingPercent = 100 - percentUsed;

  let estimatedFinishDate: Date | null = null;
  if (ratePerHour > 0) {
    const hoursToFull = 100 / ratePerHour;
    const msToFull = hoursToFull * 60 * 60 * 1000;
    estimatedFinishDate = addMilliseconds(windowStart, msToFull);
  }

  const timeProgressPercent = windowLengthHours > 0 
    ? Math.min(100, Math.max(0, (elapsedHours / windowLengthHours) * 100))
    : 0;

  const deviation = percentUsed - timeProgressPercent;
  let status: 'ok' | 'warning' | 'critical' = 'ok';
  
  if (deviation > 10) status = 'critical';
  else if (deviation > 0) status = 'warning';
  
  if (forecastPercent > 150) status = 'critical';

  return {
    windowStart,
    windowEnd: resetDate,
    elapsedMs,
    ratePerHour,
    safeRatePerHour,
    forecastPercent,
    remainingPercent,
    estimatedFinishDate,
    timeProgressPercent,
    status,
    isWindowActive,
  };
};

export const calculateWeeklyStats = (
  now: Date, 
  state: QuotaState
): WeeklyCalculationResult => {
  const percentUsed = Number(state.weeklyPercentUsed) || 0;
  const workDays = Math.max(1, Math.min(7, Number(state.weeklyWorkDays) || 5));
  const resetDateStr = state.weeklyResetDate;
  
  let resetDate = resetDateStr ? new Date(resetDateStr) : addDays(now, 7);
  if (!isValid(resetDate)) resetDate = addDays(now, 7);

  const startDate = addDays(resetDate, -7);
  const totalDurationMs = differenceInMilliseconds(resetDate, startDate);
  const elapsedMs = differenceInMilliseconds(now, startDate);
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  
  const timeProgressPercent = totalDurationMs > 0 
    ? Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100)) 
    : 0;
    
  const benchmarkPercent = Math.min(100, Math.max(0, elapsedDays * (100 / workDays)));
  const currentDailyPace = (elapsedDays > 0) ? (percentUsed / elapsedDays) : 0;
  const maxSafeDailyPace = 100 / workDays;

  const deviation = percentUsed - benchmarkPercent;
  let status: 'ok' | 'warning' | 'critical' = 'ok';
  
  if (deviation > 15) status = 'critical';
  else if (deviation > 5) status = 'warning';
  else if (currentDailyPace > (maxSafeDailyPace * 1.2)) status = 'warning';
  
  const msRemaining = differenceInMilliseconds(resetDate, now);
  const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  return {
    startDate,
    resetDate,
    percentUsed,
    timeProgressPercent,
    benchmarkPercent,
    status,
    daysRemaining,
    hoursRemaining,
    currentDailyPace,
    maxSafeDailyPace,
    workDays
  };
};

export const calculateMonthlyProgress = (now: Date, lastPaymentDateStr: string): MonthlyCalculationResult => {
  let lastPayment = parseISO(lastPaymentDateStr);
  if (!isValid(lastPayment)) {
    lastPayment = subMonths(startOfDay(now), 0); // fallback to start of current month
  }

  // Next payment is exactly one month later
  let nextPayment = addMonths(lastPayment, 1);
  
  // If today is already after nextPayment, the "cycle" should probably shift?
  // But user specifically said "choose date when payment happened, next is in a month"
  // So we just stick to that logic.
  
  const totalDurationMs = differenceInMilliseconds(nextPayment, lastPayment);
  const elapsedMs = differenceInMilliseconds(now, lastPayment);
  
  const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
  const daysRemaining = differenceInDays(nextPayment, now);

  return {
    progressPercent,
    nextBillingDate: nextPayment,
    daysRemaining,
    totalDaysInCycle: differenceInDays(nextPayment, lastPayment)
  };
};

export const formatDuration = (ms: number): string => {
  if (ms < 0) return '0h 0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const formatTime = (date: Date): string => format(date, 'HH:mm');

export const formatRelativeTime = (date: Date, relativeTo: Date = new Date()): string => {
  if (isSameDay(date, relativeTo)) return format(date, 'HH:mm');
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  return format(date, 'd MMM HH:mm');
};
