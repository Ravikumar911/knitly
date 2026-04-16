import { Levenshtein } from "autoevals";

/**
 * Simple greeting function to test
 * This is the task we're evaluating.
 */
function sayHi(name: string): string {
  return `Hi ${name}!`;
}

const testCases = [
  { input: "Alice", expected: "Hi Alice!" },
  { input: "Bob", expected: "Hi Bob!" },
  { input: "Charlie", expected: "Hi Charlie!" },
];

let total = 0;

for (const testCase of testCases) {
  const output = sayHi(testCase.input);
  const score = await Levenshtein({ output, expected: testCase.expected });
  total += score.score ?? 0;

  console.log(
    `${testCase.input}: ${output} | expected ${testCase.expected} | score ${score.score?.toFixed(2)}`,
  );
}

const average = total / testCases.length;
console.log(`Average score: ${average.toFixed(2)}`);

if (average < 1) {
  process.exitCode = 1;
}
