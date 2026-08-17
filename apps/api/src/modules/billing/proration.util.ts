import { BillingCycle } from '@prisma/client';

interface ProrationInput {
  oldPlanPrice: number;
  newPlanPrice: number;
  billingCycle: BillingCycle;
  cycleStartDate: Date;
  changeDate: Date;
}

interface ProrationResult {
  /** Positive = tenant owes more now; negative = tenant gets credit */
  proratedAmount: number;
  daysRemainingInCycle: number;
  totalDaysInCycle: number;
}

/**
 * Simple day-based proration: charges/credits the difference between
 * old and new plan price for the days remaining in the current cycle.
 */
export function calculateProration(input: ProrationInput): ProrationResult {
  const {
    oldPlanPrice,
    newPlanPrice,
    billingCycle,
    cycleStartDate,
    changeDate,
  } = input;

  const totalDaysInCycle = billingCycle === 'yearly' ? 365 : 30;

  const cycleEnd = new Date(cycleStartDate);
  if (billingCycle === 'yearly') {
    cycleEnd.setFullYear(cycleEnd.getFullYear() + 1);
  } else {
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemainingInCycle = Math.max(
    0,
    Math.ceil((cycleEnd.getTime() - changeDate.getTime()) / msPerDay),
  );

  const dailyOldRate = oldPlanPrice / totalDaysInCycle;
  const dailyNewRate = newPlanPrice / totalDaysInCycle;

  const proratedAmount =
    Math.round((dailyNewRate - dailyOldRate) * daysRemainingInCycle * 100) /
    100;

  return { proratedAmount, daysRemainingInCycle, totalDaysInCycle };
}
