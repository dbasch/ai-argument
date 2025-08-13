import { restaurantAgent } from './restaurant';
import { touristAgent } from './tourist';
import { jobInterviewAgent } from './jobInterview';
import { shoppingAgent } from './shopping';
import { randomRoleplayAgent } from './randomRoleplay';

// Cast to `any` to satisfy TypeScript until the core types make RealtimeAgent
// assignable to `Agent<unknown>` (current library versions are invariant on
// the context type).
(restaurantAgent.handoffs as any).push(touristAgent, jobInterviewAgent, shoppingAgent, randomRoleplayAgent);
(touristAgent.handoffs as any).push(restaurantAgent, jobInterviewAgent, shoppingAgent, randomRoleplayAgent);
(jobInterviewAgent.handoffs as any).push(restaurantAgent, touristAgent, shoppingAgent, randomRoleplayAgent);
(shoppingAgent.handoffs as any).push(restaurantAgent, touristAgent, jobInterviewAgent, randomRoleplayAgent);
(randomRoleplayAgent.handoffs as any).push(restaurantAgent, touristAgent, jobInterviewAgent, shoppingAgent);

export const languagePracticeScenario = [
  restaurantAgent,
  touristAgent,
  jobInterviewAgent,
  shoppingAgent,
  randomRoleplayAgent,
];

// Name of the company represented by this agent set. Used by guardrails
export const languagePracticeCompanyName = 'Language Practice App';

export const roleDescriptions = {
  restaurant: {
    title: 'Restaurant Customer & Waiter',
    description: 'Practice ordering food, asking about dishes, and having a restaurant conversation',
    userRole: 'Customer',
    agentRole: 'Waiter',
    scenario: 'You are dining at a restaurant and need to order food, ask questions about the menu, and interact with the waiter.'
  },
  tourist: {
    title: 'Tourist & Local',
    description: 'Practice asking for directions, recommendations, and tourist information',
    userRole: 'Tourist',
    agentRole: 'Local Resident',
    scenario: 'You are a tourist in a new city and need to ask for directions, recommendations, and information from a local resident.'
  },
  jobInterview: {
    title: 'Job Interviewer & Candidate',
    description: 'Practice job interview questions and professional conversation',
    userRole: 'Job Candidate',
    agentRole: 'Interviewer',
    scenario: 'You are interviewing for a job and need to answer questions, ask about the company, and demonstrate your skills.'
  },
  shopping: {
    title: 'Shopper & Store Clerk',
    description: 'Practice shopping conversations, asking about products, and making purchases',
    userRole: 'Shopper',
    agentRole: 'Store Clerk',
    scenario: 'You are shopping for items and need to ask about products, prices, and make purchasing decisions with the help of a store clerk.'
  },
  randomRoleplay: {
    title: 'Random Roleplay',
    description: 'Practice persuasive communication in random scenarios where you need to convince someone',
    userRole: 'Persuader',
    agentRole: 'Skeptic (varies by scenario)',
    scenario: 'You will be given a random scenario where you need to convince the AI agent of something. The agent will be skeptical and need good arguments to be persuaded.'
  }
}; 