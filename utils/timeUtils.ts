import { CalculationResult, QuotaState, WeeklyCalculationResult } from '../types';
import { 
  addDays, 
  differenceInMilliseconds, 
  format, 
  parse, 
  isValid, 
  addHours, 
  addMilliseconds, 
  startOfToday,
  isSameDay,
  isTomorrow,
  isYesterday,
  setSeconds,
  setMilliseconds,
  startOfDay,
  differenceInHours,
  differenceInDays
} from 'date-fns';

export const calculateQuotaStats = (
  now: Date,
  state: QuotaState
): CalculationResult => {
  const { resetTime } = state;
  
  // Safely parse inputs to numbers, defaulting to 0 or sane minimums if invalid
  const percentUsed = Number(state.percentUsed) || 0;
  const windowLengthHours = Number(state.windowLengthHours) || 1; // Avoid divide by zero

  // 1. Determine Reset Date (Window End)
  // Parse the user input HH:mm against the CURRENT SIMULATED DAY (now)
  let resetDate = parse(resetTime, 'HH:mm', now);
  
  if (!isValid(resetDate)) {
    // If parsing fails, fall back to start of 'now' day
    resetDate = startOfDay(now);
  }

  // Zero out seconds/ms to ensure stable comparison
  resetDate = setSeconds(resetDate, 0);
  resetDate = setMilliseconds(resetDate, 0);

  // "If reset time is earlier than now → treat as tomorrow"
  if (resetDate.getTime() < now.getTime()) {
    resetDate = addDays(resetDate, 1);
  }

  // 2. Determine Window Start
  const windowStart = addHours(resetDate, -windowLengthHours);

  // 3. Calculate Elapsed
  const elapsedMs = differenceInMilliseconds(now, windowStart);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  // Check if we are physically inside the window
  const isWindowActive = elapsedMs >= 0;

  // 4. Rate (Percent per Hour)
  const ratePerHour = (elapsedHours > 0) ? (percentUsed / elapsedHours) : 0;
  
  // Safe rate: The rate required to hit exactly 100% at the end of the window
  const safeRatePerHour = windowLengthHours > 0 ? (100 / windowLengthHours) : 0;

  // 5. Forecast for full window
  const forecastPercent = ratePerHour * windowLengthHours;

  // 6. Remaining
  const remainingPercent = 100 - percentUsed;

  // 7. Estimated Finish Time
  let estimatedFinishDate: Date | null = null;
  if (ratePerHour > 0) {
    const hoursToFull = 100 / ratePerHour;
    const msToFull = hoursToFull * 60 * 60 * 1000;
    estimatedFinishDate = addMilliseconds(windowStart, msToFull);
  }

  // 8. Time Progress (0 to 100%)
  const timeProgressPercent = windowLengthHours > 0 
    ? Math.min(100, Math.max(0, (elapsedHours / windowLengthHours) * 100))
    : 0;

  // 9. Status
  // We determine status by comparing Usage vs Time
  // Deviation: Positive means we are OVER budget (using more than time passed)
  const deviation = percentUsed - timeProgressPercent;
  
  let status: 'ok' | 'warning' | 'critical' = 'ok';
  
  // Tolerance logic:
  if (deviation > 10) {
    status = 'critical';
  } else if (deviation > 0) {
    status = 'warning';
  } else {
    status = 'ok';
  }

  // Override: If forecast is catastrophic (>150%), always critical
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
  const workDays = Math.max(1, Math.min(7, Number(state.weeklyWorkDays) || 5)); // Bound between 1 and 7
  const resetDateStr = state.weeklyResetDate;
  
  // Parse Reset Date
  let resetDate = resetDateStr ? new Date(resetDateStr) : addDays(now, 7);
  if (!isValid(resetDate)) {
    resetDate = addDays(now, 7);
  }

  // Assume a 7-day fixed window ending at resetDate
  const startDate = addDays(resetDate, -7);
  
  const totalDurationMs = differenceInMilliseconds(resetDate, startDate);
  const elapsedMs = differenceInMilliseconds(now, startDate);
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  
  // Time Progress (Physical 7-day window)
  const timeProgressPercent = totalDurationMs > 0 
    ? Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100)) 
    : 0;
    
  // Benchmark Progress (Adjusted for Work Days)
  // Logic: 100% of quota should be used over 'workDays'. 
  // So progress speed is (100 / workDays) % per day.
  // We cap it at 100% because you can't be "expected" to use more than 100%.
  // If elapsedDays > workDays, benchmark stays at 100.
  const benchmarkPercent = Math.min(100, Math.max(0, elapsedDays * (100 / workDays)));

  // Pace Calculations
  // Current Daily Pace: How much percent used per day elapsed
  const currentDailyPace = (elapsedDays > 0) ? (percentUsed / elapsedDays) : 0;

  // Max Safe Pace: 100% divided by number of working days
  const maxSafeDailyPace = 100 / workDays;

  // Status Logic
  // We compare Usage vs Benchmark
  const deviation = percentUsed - benchmarkPercent;
  
  let status: 'ok' | 'warning' | 'critical' = 'ok';
  
  if (deviation > 15) {
     status = 'critical';
  } else if (deviation > 5) {
     status = 'warning';
  } else if (currentDailyPace > (maxSafeDailyPace * 1.2)) {
     status = 'warning';
  }
  
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

export const formatDuration = (ms: number): string => {
  if (ms < 0) return '0h 0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

export const formatRelativeTime = (date: Date, relativeTo: Date = new Date()): string => {
  if (isSameDay(date, relativeTo)) {
    return format(date, 'HH:mm');
  } else if (isTomorrow(date)) {
    return `Tomorrow ${format(date, 'HH:mm')}`;
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, 'HH:mm')}`;
  }
  return format(date, 'd MMM HH:mm');
};