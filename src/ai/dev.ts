
import { config } from 'dotenv';
config({ path: '.env.local' });

import '@/ai/flows/contract-issue-alerts.ts';
import '@/ai/flows/document-expiry-alerts.ts';
import '@/ai/flows/process-attendance-file.ts';
import '@/ai/flows/process-holidays-file.ts';
import '@/ai/flows/error-analysis-alerts.ts';
