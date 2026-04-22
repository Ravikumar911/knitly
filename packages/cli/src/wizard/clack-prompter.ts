import {
  cancel,
  confirm,
  intro,
  isCancel,
  note,
  outro,
  password,
  select,
  spinner,
  text,
} from "@clack/prompts";
import type { WizardPrompter } from "./prompts.js";

export class WizardCancelledError extends Error {
  constructor() {
    super("Setup cancelled.");
    this.name = "WizardCancelledError";
  }
}

export function createClackPrompter(): WizardPrompter {
  return {
    intro(title) {
      intro(title);
    },
    outro(message) {
      outro(message);
    },
    note(message, title) {
      note(message, title);
    },
    async select<T extends string>(options: {
      message: string;
      options: Array<{
        value: T;
        label: string;
        hint?: string;
      }>;
      initialValue: T;
    }) {
      return ensurePromptValue(
        (await select<string>({
          message: options.message,
          options: options.options as Array<{
            value: string;
            label: string;
            hint?: string;
          }>,
          initialValue: options.initialValue,
        })) as T,
      );
    },
    async text(options) {
      return ensurePromptValue(
        await text({
          message: options.message,
          placeholder: options.placeholder,
          defaultValue: options.defaultValue,
          validate: options.validate,
        }),
      );
    },
    async password(options) {
      return ensurePromptValue(
        await password({
          message: options.message,
          mask: "*",
          validate: options.validate,
        }),
      );
    },
    async confirm(options) {
      return ensurePromptValue(
        await confirm({
          message: options.message,
          initialValue: options.initialValue,
        }),
      );
    },
    spinner() {
      return spinner();
    },
  };
}

function ensurePromptValue<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Setup cancelled. Run `slashcash doctor --fix` to resume.");
    throw new WizardCancelledError();
  }

  return value;
}
