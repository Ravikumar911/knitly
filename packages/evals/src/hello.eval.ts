import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { Eval } from "braintrust";
import { Levenshtein } from "autoevals";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file (supports both .env and .env.local)
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

/**
 * Simple greeting function to test
 * This is the "task" we're evaluating
 */
function sayHi(name: string): string {
  return `Hi ${name}!`;
}

/**
 * Basic evaluation to test Braintrust setup
 * 
 * This serves as a foundation pattern for future evaluations
 * like Swiggy data extraction tests.
 */
Eval("say-hi-bot", {
  data: () => {
    return [
      {
        input: "Alice",
        expected: "Hi Alice!",
      },
      {
        input: "Bob",
        expected: "Hi Bob!",
      },
      {
        input: "Charlie",
        expected: "Hi Charlie!",
      },
    ];
  },
  task: (input) => {
    return sayHi(input);
  },
  scores: [Levenshtein],
});

