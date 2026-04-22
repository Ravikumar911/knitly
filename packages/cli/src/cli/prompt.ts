import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export type Choice = {
  label: string;
  value: string;
  description: string;
};

export async function selectChoice(options: {
  question: string;
  choices: Choice[];
  defaultValue: string;
  nonInteractive?: boolean;
}) {
  const defaultChoice = options.choices.find(
    (choice) => choice.value === options.defaultValue,
  );
  if (!defaultChoice) {
    throw new Error(`Invalid default choice: ${options.defaultValue}`);
  }

  if (options.nonInteractive || !process.stdin.isTTY) {
    return options.defaultValue;
  }

  console.log(options.question);
  options.choices.forEach((choice, index) => {
    const marker =
      choice.value === options.defaultValue ? "default" : `${index + 1}`;
    console.log(`  ${marker}. ${choice.label} - ${choice.description}`);
  });

  const rl = createInterface({ input, output });
  try {
    const answer = (
      await rl.question(`Choose [${defaultChoice.label}]: `)
    ).trim();
    if (!answer) return options.defaultValue;

    const byIndex = Number(answer);
    if (
      Number.isInteger(byIndex) &&
      byIndex >= 1 &&
      byIndex <= options.choices.length
    ) {
      return options.choices[byIndex - 1]!.value;
    }

    const byValue = options.choices.find(
      (choice) =>
        choice.value === answer ||
        choice.label.toLowerCase() === answer.toLowerCase(),
    );
    if (byValue) return byValue.value;

    throw new Error(`Unknown choice: ${answer}`);
  } finally {
    rl.close();
  }
}
