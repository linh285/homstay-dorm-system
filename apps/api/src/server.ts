import { createApp } from './app.js';
import { env } from './config/env.js';
import { startExpireDepositHoldsJob } from './jobs/expire-deposit-holds.job.js';

const app = createApp();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`HomeStay Dorm API listening on port ${env.PORT}.`);
});

startExpireDepositHoldsJob();
