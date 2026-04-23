export type WizardOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

export type WizardSpinner = {
  start(message?: string): void;
  message(message?: string): void;
  stop(message?: string): void;
  error(message?: string): void;
  cancel(message?: string): void;
};

export interface WizardPrompter {
  intro(title: string): void;
  outro(message: string): void;
  note(message: string, title?: string): void;
  select<T extends string>(options: {
    message: string;
    options: WizardOption<T>[];
    initialValue: T;
  }): Promise<T>;
  text(options: {
    message: string;
    placeholder?: string;
    defaultValue?: string;
    validate?: (value: string | undefined) => string | Error | undefined;
  }): Promise<string>;
  password(options: {
    message: string;
    validate?: (value: string | undefined) => string | Error | undefined;
  }): Promise<string>;
  confirm(options: {
    message: string;
    initialValue?: boolean;
  }): Promise<boolean>;
  spinner(): WizardSpinner;
}
