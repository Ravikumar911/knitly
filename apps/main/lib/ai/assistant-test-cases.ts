/**
 * Legacy test cases file.
 *
 * The canonical golden dataset now lives in:
 *   apps/main/lib/ai/evals/golden-dataset.ts
 *
 * Use `pnpm --filter @knitly/main eval:assistant` to run evaluations.
 * Use `vitest` to run the regression snapshot tests in `evals/assistant-regression.test.ts`.
 */

export const testCases = [
  // === Relative date + sparse data problems ===
  {
    category: "relative-date",
    question: "How much did I spend on Instamart last month?",
    expectedBehavior:
      "Should not guess random months. Should use overview to understand actual data range and activity, then answer accurately or clarify gracefully.",
    followUps: ["Last month is April 2026", "What about March?"],
  },
  {
    category: "relative-date",
    question: "What's my highest spending month this year?",
    followUps: ["Can you break it down by service type?"],
  },

  // === "No results" + graceful handling ===
  {
    category: "no-results",
    question: "How much did I spend on Instamart in April 2026?",
    expectedBehavior:
      "Be honest, show what grocery activity exists instead, offer alternatives. Never defensive.",
  },
  {
    category: "no-results",
    question: "Show me my orders from KFC in January.",
  },

  // === Low data / overall context ===
  {
    category: "low-data",
    question: "Am I spending too much on Swiggy?",
    expectedBehavior:
      "Should first understand overall volume and patterns before giving any advice. Be balanced, not judgmental.",
  },

  // === Top merchant with category nuance ===
  {
    category: "top-merchant",
    question: "What's my top restaurant by orders?",
    followUps: [
      "I meant only food delivery, not dineout or grocery.",
      "Okay, now show me by spend instead of count.",
    ],
  },

  // === Advice seeking ===
  {
    category: "advice",
    question: "Where am I spending the most money?",
    followUps: ["Is this normal? Should I try to reduce it?"],
  },
  {
    category: "advice",
    question: "How can I save money on my Swiggy orders?",
  },

  // === Multi-turn context ===
  {
    category: "multi-turn",
    question: "Show me my recent Swiggy orders.",
    followUps: [
      "Which one was the most expensive?",
      "What did I order in the most expensive one?",
      "How does that compare to my average order value?",
    ],
  },

  // === Edge: very specific platform inside grocery ===
  {
    category: "platform-specific",
    question: "How many times did I order from Blinkit last year?",
  },
];

export const edgeCaseNotes = `
Key behaviors we want:
1. Never guess "last month" without checking actual data range first.
2. When data is limited or a filter returns nothing → be transparent and helpful, not interrogative.
3. Advice should feel thoughtful, not generic. Base it on the user's actual patterns.
4. Maintain context well across 4-6 turns.
5. Tone: friendly personal finance companion, not a database query engine.
`;
