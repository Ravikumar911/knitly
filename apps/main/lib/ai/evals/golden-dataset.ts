/**
 * Golden Dataset for slash.cash Assistant
 *
 * This is the source of truth for regression testing.
 * Every time you change prompts, tools, model, or instructions, run the eval.
 *
 * Structure:
 * - Each case has a query + optional followUps
 * - We capture the full trajectory (tool calls + final answer)
 * - Snapshots + assertions protect against regressions
 */

export interface AssistantTestCase {
  id: string;
  category: string;
  query: string;
  followUps?: string[];
  notes?: string;
  /** What we expect the agent to do (for assertions) */
  expectations?: {
    shouldCallOverviewFirst?: boolean;
    mustUseTools?: boolean;
    shouldHandleNoResultsGracefully?: boolean;
    shouldDistinguishGroceryVsFoodDelivery?: boolean;
  };
}

export const goldenDataset: AssistantTestCase[] = [
  // === Relative dates + data awareness ===
  {
    id: "relative-date-instamart",
    category: "relative-date",
    query: "How much did I spend on Instamart last month?",
    followUps: ["Last month is April 2026"],
    notes:
      "Classic failure case. Model must use overview to understand actual data range.",
    expectations: {
      shouldCallOverviewFirst: true,
      shouldHandleNoResultsGracefully: true,
    },
  },
  {
    id: "relative-date-highest-month",
    category: "relative-date",
    query: "What's my highest spending month this year?",
    expectations: { shouldCallOverviewFirst: true },
  },
  {
    id: "relative-date-recent-trend",
    category: "relative-date",
    query: "Have my Swiggy orders been increasing or decreasing recently?",
    expectations: { shouldCallOverviewFirst: true },
  },

  // === No results / sparse data ===
  {
    id: "no-results-specific",
    category: "no-results",
    query: "How much did I spend on Instamart in April 2026?",
    expectations: {
      shouldHandleNoResultsGracefully: true,
    },
  },
  {
    id: "low-data-advice",
    category: "low-data",
    query: "Am I spending too much on Swiggy?",
    notes: "Should be balanced and data-driven, not judgmental.",
  },
  {
    id: "no-results-platform",
    category: "no-results",
    query: "Show me my Zomato orders from last year.",
    expectations: { shouldHandleNoResultsGracefully: true },
  },

  // === Category nuance ===
  {
    id: "top-restaurant-vs-grocery",
    category: "top-merchant",
    query: "What's my top restaurant by orders?",
    followUps: ["I meant only food delivery, not grocery."],
    expectations: {
      shouldDistinguishGroceryVsFoodDelivery: true,
    },
  },
  {
    id: "top-by-spend-vs-count",
    category: "top-merchant",
    query: "Who is my most expensive restaurant overall?",
  },

  // === Advice ===
  {
    id: "advice-spending-pattern",
    category: "advice",
    query: "Where am I spending the most money?",
    followUps: ["Is this high? Should I reduce it?"],
  },
  {
    id: "advice-reduction",
    category: "advice",
    query: "How can I save money on my Swiggy orders?",
    followUps: ["What if I only order on weekends?"],
  },
  {
    id: "advice-comparison",
    category: "advice",
    query: "Is my average order value high compared to typical Swiggy users?",
  },

  // === Multi-turn ===
  {
    id: "multi-turn-orders",
    category: "multi-turn",
    query: "Show me my recent Swiggy orders.",
    followUps: [
      "Which one was the most expensive?",
      "What did I order in that one?",
      "How does that compare to my average?",
    ],
  },
  {
    id: "multi-turn-trend",
    category: "multi-turn",
    query: "How has my spending changed over the last few months?",
    followUps: ["Which month was the worst?"],
  },

  // === Platform-specific & filtering ===
  {
    id: "platform-specific-instamart",
    category: "platform-specific",
    query: "How many times did I order from Blinkit last year?",
    expectations: { shouldCallOverviewFirst: true },
  },
  {
    id: "filter-food-only",
    category: "filtering",
    query: "Show me only my food delivery orders from the last 3 months.",
  },

  // === Edge cases ===
  {
    id: "edge-empty-history",
    category: "edge-case",
    query: "What are my top 5 most expensive orders ever?",
    notes: "Test behavior when user has very few transactions.",
  },
  {
    id: "edge-advice-with-context",
    category: "advice",
    query: "Based on my spending, should I eat out less?",
  },
];
