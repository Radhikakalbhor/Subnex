const cron = require('node-cron');
const config = require('../config/env');
const invoiceService = require('./invoiceService');

let billingJob = null;
let isJobRunning = false;

/**
 * Initializes and starts the recurring billing cron scheduler.
 */
function initBillingCron(customSchedule = null) {
  if (billingJob) {
    console.log('[Cron] Billing cron job is already scheduled.');
    return billingJob;
  }

  const schedule = customSchedule || config.billing.cronSchedule || '0 0 * * *';

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid cron schedule pattern: '${schedule}'`);
  }

  console.log(`[Cron] Initializing Recurring Billing Engine with schedule: "${schedule}"`);

  billingJob = cron.schedule(schedule, async () => {
    if (isJobRunning) {
      console.warn('[Cron] Previous billing run is still executing, skipping this tick to prevent overlap.');
      return;
    }

    isJobRunning = true;
    console.log(`[Cron Tick] Starting automatic billing run at ${new Date().toISOString()}...`);

    try {
      const summary = await invoiceService.processDueBilling({ targetDate: new Date() });
      console.log(
        `[Cron Tick Completed] Due: ${summary.totalDue}, Processed: ${summary.processedCount}, Success: ${summary.successCount}, Failed: ${summary.failureCount}`
      );
    } catch (err) {
      console.error('[Cron Tick Error] Unhandled error during scheduled billing run:', err);
    } finally {
      isJobRunning = false;
    }
  });

  return billingJob;
}

/**
 * On-demand manual trigger for testing and admin operations
 */
async function triggerBillingCronNow(targetDate = new Date()) {
  console.log(`[Billing Manual Trigger] Executing billing run for target date: ${new Date(targetDate).toISOString()}`);
  return invoiceService.processDueBilling({ targetDate });
}

/**
 * Stop and destroy the cron job
 */
function stopBillingCron() {
  if (billingJob) {
    billingJob.stop();
    billingJob = null;
    console.log('[Cron] Billing cron job stopped.');
  }
}

module.exports = {
  initBillingCron,
  triggerBillingCronNow,
  stopBillingCron,
  isJobRunning: () => isJobRunning,
};

