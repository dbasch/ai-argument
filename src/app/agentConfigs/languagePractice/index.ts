import { createRandomRoleplayAgent } from './randomRoleplay';

// Default agent for initial connection
export const defaultRandomRoleplayAgent = createRandomRoleplayAgent("Waiting for scenario to be generated...");

export const languagePracticeScenario = [
  defaultRandomRoleplayAgent,
];

// Name of the company represented by this agent set. Used by guardrails
export const languagePracticeCompanyName = 'Language Practice App';

export const roleDescriptions = {
  randomRoleplay: {
    title: 'Random Roleplay',
    description: 'Practice persuasive communication in random scenarios where you need to convince someone',
    userRole: 'Persuader',
    agentRole: 'Skeptic (varies by scenario)',
    scenario: 'You will be given a random scenario where you need to convince the AI agent of something. The agent will be skeptical and need good arguments to be persuaded.'
  }
}; 