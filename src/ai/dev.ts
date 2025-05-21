
import { config } from 'dotenv';
config();

import '@/ai/flows/refine-persona.ts';
import '@/ai/flows/generate-persona.ts';
import '@/ai/flows/chat-with-persona.ts';
import '@/ai/flows/calibrate-favorability-flow.ts';
import '@/ai/flows/test-connectivity.ts'; // Added new test flows
