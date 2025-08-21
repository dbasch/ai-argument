import { languagePracticeScenario } from './languagePractice';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  languagePractice: languagePracticeScenario,
};

export const defaultAgentSetKey = 'languagePractice';
