"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";
import {
  screenLabel,
  WIZARD_SCREEN_ORDER,
  type WizardScreen,
} from "@/lib/onboard/screens";
import type { OnboardSessionSnapshot } from "@/lib/onboard/session";

type AssistantProvider = "ollama-local" | "openai-compatible" | "anthropic";

function normalizeAppPassword(value: string) {
  return value.replace(/\s+/g, "");
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function OnboardWizard() {
  const trpc = useTRPC();
  const router = useRouter();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    ...trpc.onboard.status.queryOptions(),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 500;
      if (data.complete || data.phase === "complete") return false;
      if (data.phase === "running") return 400;
      if (data.phase === "awaiting" || data.phase === "error") return false;
      return 1000;
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.onboard.status.queryKey(),
    });
  };

  const acknowledgeWelcome = useMutation(
    trpc.onboard.acknowledgeWelcome.mutationOptions({
      onSuccess: invalidate,
    }),
  );
  const start = useMutation(
    trpc.onboard.start.mutationOptions({
      onSuccess: invalidate,
    }),
  );
  const answer = useMutation(
    trpc.onboard.answer.mutationOptions({
      onSuccess: invalidate,
    }),
  );
  const openAppPasswordUrl = useMutation(
    trpc.onboard.openAppPasswordUrl.mutationOptions(),
  );
  const cancel = useMutation(
    trpc.onboard.cancel.mutationOptions({
      onSuccess: invalidate,
    }),
  );

  const status = statusQuery.data;

  const showReady = Boolean(
    status &&
      (status.phase === "complete" ||
        (status.complete && status.summary !== null)),
  );
  const alreadyCompleteOutsideSession = Boolean(
    status?.complete && !showReady,
  );

  // Resume: after welcome/assistant are done, kick the pipeline if idle.
  useEffect(() => {
    if (!status) return;
    if (status.complete) return;
    if (!status.welcomeAcknowledged) return;
    if (status.needsAssistantChoice) return;
    if (status.phase !== "idle") return;
    if (start.isPending) return;
    start.mutate({ useRecommendedDefaults: true });
    // Intentionally depend on status fields, not the mutation object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    status?.complete,
    status?.welcomeAcknowledged,
    status?.needsAssistantChoice,
    status?.phase,
    start.isPending,
  ]);

  useEffect(() => {
    if (alreadyCompleteOutsideSession) {
      router.replace("/dashboard");
    }
  }, [alreadyCompleteOutsideSession, router]);

  const busy =
    acknowledgeWelcome.isPending ||
    start.isPending ||
    answer.isPending ||
    status?.phase === "running";

  if (statusQuery.isLoading || !status) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (alreadyCompleteOutsideSession) {
    return (
      <div className="flex min-h-svh items-center justify-center gap-2 text-muted-foreground">
        <Spinner className="size-4" />
        Opening dashboard…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          slash.cash setup
        </p>
        <StepRail current={showReady ? "ready" : status.screen} />
      </div>

      {showReady ? (
        <ReadyScreen
          summary={status.summary}
          onOpen={() => router.replace("/dashboard")}
        />
      ) : null}

      {!showReady && status.screen === "welcome" ? (
        <WelcomeScreen
          banner={status.privacyBanner}
          busy={busy}
          onContinue={() => acknowledgeWelcome.mutate()}
        />
      ) : null}

      {!showReady &&
      status.screen === "assistant" &&
      status.needsAssistantChoice ? (
        <AssistantScreen
          busy={busy}
          onContinue={(input) => start.mutate(input)}
        />
      ) : null}

      {!showReady && status.screen === "ollama" ? (
        <ProgressScreen
          title="Local assistant setup"
          description="Installing and starting Ollama for the local assistant."
          status={status}
          busy={busy}
          onRetry={() => start.mutate({ useRecommendedDefaults: true })}
        />
      ) : null}

      {!showReady && status.screen === "gmail" ? (
        <GmailScreen
          pending={status.pending}
          busy={busy}
          onSubmit={(value) => answer.mutate({ value })}
        />
      ) : null}

      {!showReady && status.screen === "app-password" ? (
        <AppPasswordScreen
          copy={status.preAppPasswordCopy}
          url={status.appPasswordUrl}
          pending={status.pending}
          busy={busy}
          onOpen={() => openAppPasswordUrl.mutate()}
          onSubmit={(value) => answer.mutate({ value })}
        />
      ) : null}

      {!showReady && status.screen === "imap" ? (
        <ImapScreen
          status={status}
          busy={busy}
          onAnswer={(value) => answer.mutate({ value })}
          onCancel={() => cancel.mutate()}
          onRetry={() => start.mutate({ useRecommendedDefaults: true })}
        />
      ) : null}

      {!showReady && status.screen === "finishing" ? (
        <ProgressScreen
          title="Finishing up"
          description="Preparing local state, skills, and the first sync."
          status={status}
          busy={busy}
          onRetry={() => start.mutate({ useRecommendedDefaults: true })}
        />
      ) : null}

      {!showReady &&
      status.phase === "awaiting" &&
      status.pending &&
      status.screen !== "gmail" &&
      status.screen !== "app-password" &&
      status.screen !== "imap" &&
      status.screen !== "assistant" ? (
        <GenericPrompt
          pending={status.pending}
          busy={busy}
          onSubmit={(value) => answer.mutate({ value })}
        />
      ) : null}
    </div>
  );
}

function StepRail({ current }: { current: WizardScreen }) {
  const currentIndex = WIZARD_SCREEN_ORDER.indexOf(current);
  return (
    <ol className="mt-4 flex flex-wrap gap-2">
      {WIZARD_SCREEN_ORDER.map((screen, index) => {
        const done = index < currentIndex;
        const active = screen === current;
        return (
          <li
            key={screen}
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              active && "bg-foreground text-background",
              done && !active && "bg-muted text-muted-foreground",
              !done && !active && "text-muted-foreground",
            )}
          >
            {screenLabel(screen)}
          </li>
        );
      })}
    </ol>
  );
}

function WelcomeScreen({
  banner,
  busy,
  onContinue,
}: {
  banner: string;
  busy: boolean;
  onContinue: () => void;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">slash.cash</h1>
        <p className="mt-2 text-muted-foreground">
          Local-first personal finance. Your mail and receipts stay on this
          machine.
        </p>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed text-foreground/90">
        {banner}
      </pre>
      <Button size="lg" disabled={busy} onClick={onContinue}>
        Continue
      </Button>
    </section>
  );
}

function AssistantScreen({
  busy,
  onContinue,
}: {
  busy: boolean;
  onContinue: (input: {
    provider: AssistantProvider;
    apiKey?: string;
    useRecommendedDefaults: boolean;
  }) => void;
}) {
  const [provider, setProvider] = useState<AssistantProvider>("ollama-local");
  const [useDefaults, setUseDefaults] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const needsKey =
    provider === "openai-compatible" || provider === "anthropic";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose an assistant
        </h1>
        <p className="mt-2 text-muted-foreground">
          Extraction and chat can run locally with Ollama, or through a hosted
          provider.
        </p>
      </div>

      <RadioGroup
        value={provider}
        onValueChange={(value) => setProvider(value as AssistantProvider)}
        className="space-y-3"
      >
        <ProviderOption
          value="ollama-local"
          label="Ollama"
          hint="Runs locally with gemma4:latest."
        />
        <ProviderOption
          value="openai-compatible"
          label="OpenAI"
          hint="Hosted OpenAI-compatible API."
        />
        <ProviderOption
          value="anthropic"
          label="Anthropic"
          hint="Hosted Claude-compatible config."
        />
      </RadioGroup>

      {needsKey ? (
        <div className="space-y-2">
          <Label htmlFor="api-key">API key</Label>
          <Input
            id="api-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              provider === "anthropic" ? "Anthropic API key" : "OpenAI API key"
            }
          />
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={useDefaults}
          onCheckedChange={(checked) => setUseDefaults(checked === true)}
        />
        Use recommended defaults
      </label>

      <Button
        size="lg"
        disabled={busy || (needsKey && !apiKey.trim())}
        onClick={() =>
          onContinue({
            provider,
            apiKey: needsKey ? apiKey : undefined,
            useRecommendedDefaults: useDefaults && provider === "ollama-local",
          })
        }
      >
        Continue
      </Button>
    </section>
  );
}

function ProviderOption({
  value,
  label,
  hint,
}: {
  value: AssistantProvider;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
      <RadioGroupItem value={value} className="mt-1" />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

function ProgressScreen({
  title,
  description,
  status,
  busy,
  onRetry,
}: {
  title: string;
  description: string;
  status: OnboardSessionSnapshot;
  busy: boolean;
  onRetry: () => void;
}) {
  const relevant = useMemo(() => {
    const ollamaIds = new Set([
      "homebrew",
      "ollama-install",
      "ollama-service",
      "chat-model",
      "ollama-pull",
    ]);
    const finishingIds = new Set([
      "state-dir",
      "db-migrate",
      "local-profile",
      "python-env",
      "bundled-skills",
      "kickoff-sync",
      "dashboard-service",
    ]);
    const ids = status.screen === "ollama" ? ollamaIds : finishingIds;
    return status.checklist.filter((item) => ids.has(item.stepId));
  }, [status]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>

      <ul className="space-y-2">
        {relevant.length === 0 && busy ? (
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Working…
          </li>
        ) : null}
        {relevant.map((item) => (
          <li
            key={item.stepId}
            className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <StatusDot status={item.status} />
            <span>
              <span className="font-medium">{item.label}</span>
              {item.message ? (
                <span className="mt-0.5 block text-muted-foreground">
                  {item.message}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {status.spinnerMessage ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {status.spinnerMessage}
        </p>
      ) : null}

      {status.error ? (
        <ErrorBlock error={status.error} onRetry={onRetry} />
      ) : null}
    </section>
  );
}

function GmailScreen({
  pending,
  busy,
  onSubmit,
}: {
  pending: OnboardSessionSnapshot["pending"];
  busy: boolean;
  onSubmit: (value: string) => void;
}) {
  const [email, setEmail] = useState(pending?.defaultValue ?? "");
  const valid = isEmailAddress(email);

  if (pending && pending.kind !== "text") {
    return (
      <GenericPrompt
        pending={pending}
        busy={busy}
        onSubmit={(value) => onSubmit(String(value))}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gmail address</h1>
        <p className="mt-2 text-muted-foreground">
          Enter the Gmail inbox slash.cash should sync over IMAP.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="gmail">Email</Label>
        <Input
          id="gmail"
          type="email"
          placeholder={pending?.placeholder ?? "you@gmail.com"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <Button
        size="lg"
        disabled={busy || !valid}
        onClick={() => onSubmit(email.trim().toLowerCase())}
      >
        Continue
      </Button>
    </section>
  );
}

function AppPasswordScreen({
  copy,
  url,
  pending,
  busy,
  onOpen,
  onSubmit,
}: {
  copy: string;
  url: string;
  pending: OnboardSessionSnapshot["pending"];
  busy: boolean;
  onOpen: () => void;
  onSubmit: (value: string) => void;
}) {
  const [password, setPassword] = useState("");
  const normalized = normalizeAppPassword(password);
  const valid = normalized.length === 16;
  const waitingForPassword = !pending || pending.kind === "password";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Gmail app password
        </h1>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{copy}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            onOpen();
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        >
          Open Google App Passwords
        </Button>
      </div>

      {waitingForPassword ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="app-password">16-character app password</Label>
            <Input
              id="app-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="xxxx xxxx xxxx xxxx"
            />
          </div>
          <Button
            size="lg"
            disabled={busy || !valid || pending?.kind !== "password"}
            onClick={() => onSubmit(normalized)}
          >
            Continue
          </Button>
          {busy && pending?.kind !== "password" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Preparing password step…
            </p>
          ) : null}
        </>
      ) : (
        <GenericPrompt
          pending={pending}
          busy={busy}
          onSubmit={(value) => onSubmit(String(value))}
        />
      )}
    </section>
  );
}

function ImapScreen({
  status,
  busy,
  onAnswer,
  onCancel,
  onRetry,
}: {
  status: OnboardSessionSnapshot;
  busy: boolean;
  onAnswer: (value: string | boolean) => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const pending = status.pending;

  if (status.error && status.phase === "error") {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Could not connect
          </h1>
        </div>
        <ErrorBlock error={status.error} onRetry={onRetry} />
        <Button variant="outline" onClick={onCancel}>
          Cancel setup
        </Button>
      </section>
    );
  }

  if (pending?.kind === "confirm") {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            IMAP check failed
          </h1>
          <p className="mt-2 text-muted-foreground">{pending.message}</p>
        </div>
        {status.error ? <ErrorBlock error={status.error} /> : null}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => onAnswer(true)}>
            Retry with a different app password
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onAnswer(false)}
          >
            Cancel
          </Button>
        </div>
      </section>
    );
  }

  if (pending?.kind === "password") {
    return (
      <AppPasswordScreen
        copy={status.preAppPasswordCopy}
        url={status.appPasswordUrl}
        pending={pending}
        busy={busy}
        onOpen={() => window.open(status.appPasswordUrl, "_blank")}
        onSubmit={(value) => onAnswer(value)}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Connecting to Gmail
        </h1>
        <p className="mt-2 text-muted-foreground">
          Verifying IMAP login with your app password.
        </p>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        {status.spinnerMessage ?? "Verifying imap.gmail.com…"}
      </p>
    </section>
  );
}

function ReadyScreen({
  summary,
  onOpen,
}: {
  summary: OnboardSessionSnapshot["summary"];
  onOpen: () => void;
}) {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          You&apos;re ready
        </h1>
        <p className="mt-2 text-muted-foreground">
          Local setup is complete. Open the dashboard to explore your inbox
          data.
        </p>
      </div>
      {summary ? (
        <pre className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
          {[
            `Home: ${summary.home}`,
            `Database: ${summary.database}`,
            `Skills: ${summary.skills}`,
            `Assistant: ${summary.assistant}`,
            "",
            summary.privacy,
          ].join("\n")}
        </pre>
      ) : null}
      <Button size="lg" onClick={onOpen}>
        Open slash.cash
      </Button>
    </section>
  );
}

function GenericPrompt({
  pending,
  busy,
  onSubmit,
}: {
  pending: NonNullable<OnboardSessionSnapshot["pending"]>;
  busy: boolean;
  onSubmit: (value: string | boolean) => void;
}) {
  const [text, setText] = useState(
    typeof pending.defaultValue === "string"
      ? pending.defaultValue
      : typeof pending.initialValue === "string"
        ? pending.initialValue
        : "",
  );

  if (pending.kind === "confirm") {
    return (
      <section className="space-y-4">
        <p>{pending.message}</p>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => onSubmit(true)}>
            Yes
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onSubmit(false)}
          >
            No
          </Button>
        </div>
      </section>
    );
  }

  if (pending.kind === "select" && pending.options) {
    return (
      <section className="space-y-4">
        <p>{pending.message}</p>
        <div className="flex flex-col gap-2">
          {pending.options.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              disabled={busy}
              onClick={() => onSubmit(option.value)}
            >
              {option.label}
              {option.hint ? (
                <span className="text-muted-foreground"> — {option.hint}</span>
              ) : null}
            </Button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <p>{pending.message}</p>
      <Input
        type={pending.kind === "password" ? "password" : "text"}
        value={text}
        placeholder={pending.placeholder}
        onChange={(event) => setText(event.target.value)}
      />
      <Button disabled={busy || !text.trim()} onClick={() => onSubmit(text)}>
        Continue
      </Button>
    </section>
  );
}

function StatusDot({
  status,
}: {
  status: "pending" | "running" | "done" | "skipped" | "error";
}) {
  if (status === "running") return <Spinner className="mt-0.5 size-4" />;
  if (status === "done")
    return <span className="mt-0.5 text-emerald-600">✓</span>;
  if (status === "skipped")
    return <span className="mt-0.5 text-muted-foreground">–</span>;
  if (status === "error") return <span className="mt-0.5 text-destructive">!</span>;
  return <span className="mt-0.5 text-muted-foreground">•</span>;
}

function ErrorBlock({
  error,
  onRetry,
}: {
  error: {
    symptom: string;
    cause: string;
    fix: string;
    docs?: string;
  };
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p>
        <span className="font-medium">Symptom:</span> {error.symptom}
      </p>
      <p>
        <span className="font-medium">Cause:</span> {error.cause}
      </p>
      <p>
        <span className="font-medium">Fix:</span> {error.fix}
      </p>
      {error.docs ? (
        <a
          href={error.docs}
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline"
        >
          {error.docs}
        </a>
      ) : null}
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
