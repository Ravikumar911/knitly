"use client";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@workspace/ui/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import {
  Message,
  MessageBranch,
  MessageBranchContent,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@workspace/ui/components/ai-elements/model-selector";
import type { PromptInputMessage } from "@workspace/ui/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
} from "@workspace/ui/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@workspace/ui/components/ai-elements/sources";
import { SpeechInput } from "@workspace/ui/components/ai-elements/speech-input";
import { Suggestion, Suggestions } from "@workspace/ui/components/ai-elements/suggestion";
import type { AttachmentData } from "@workspace/ui/components/ai-elements/attachments";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AlertCircle, CheckIcon, GlobeIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

const DEFAULT_LOCAL_TAG = "gemma4:latest";

const models = [
  {
    chef: "Ollama",
    chefSlug: "llama",
    id: DEFAULT_LOCAL_TAG,
    name: "Gemma 4 (local)",
    providers: ["lmstudio"] as const,
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o",
    name: "GPT-4o",
    providers: ["openai", "azure"] as const,
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    providers: ["openai", "azure"] as const,
  },
  {
    chef: "Anthropic",
    chefSlug: "anthropic",
    id: "claude-opus-4-20250514",
    name: "Claude 4 Opus",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"] as const,
  },
  {
    chef: "Anthropic",
    chefSlug: "anthropic",
    id: "claude-sonnet-4-20250514",
    name: "Claude 4 Sonnet",
    providers: ["anthropic", "azure", "google", "amazon-bedrock"] as const,
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    providers: ["google"] as const,
  },
];

const chefs = ["Ollama", "OpenAI", "Anthropic", "Google"];

const suggestions = [
  "How much did I spend on Swiggy last month?",
  "What's my top restaurant by orders?",
  "Instamart vs food delivery this quarter?",
  "Show spending trends for my last 10 orders",
  "What are the latest trends in AI?",
  "Best practices for React development",
];

const AttachmentItem = ({
  attachment,
  onRemove,
}: {
  attachment: AttachmentData;
  onRemove: (id: string) => void;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(attachment.id);
  }, [onRemove, attachment.id]);

  return (
    <Attachment data={attachment} onRemove={handleRemove}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  );
};

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  const handleRemove = useCallback(
    (id: string) => {
      attachments.remove(id);
    },
    [attachments]
  );

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
        />
      ))}
    </Attachments>
  );
};

const SuggestionItem = ({
  suggestion,
  onClick,
}: {
  suggestion: string;
  onClick: (suggestion: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onClick(suggestion);
  }, [onClick, suggestion]);

  return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

const ModelItem = ({
  m,
  isSelected,
  onSelect,
}: {
  m: (typeof models)[0];
  isSelected: boolean;
  onSelect: (id: string) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(m.id);
  }, [onSelect, m.id]);

  return (
    <ModelSelectorItem onSelect={handleSelect} value={m.id}>
      <ModelSelectorLogo provider={m.chefSlug} />
      <ModelSelectorName>{m.name}</ModelSelectorName>
      <ModelSelectorLogoGroup>
        {m.providers.map((provider) => (
          <ModelSelectorLogo key={provider} provider={provider} />
        ))}
      </ModelSelectorLogoGroup>
      {isSelected ? (
        <CheckIcon className="ml-auto size-4" />
      ) : (
        <div className="ml-auto size-4" />
      )}
    </ModelSelectorItem>
  );
};

function renderAssistantMessage(m: UIMessage) {
  const sourceParts = m.parts.filter(
    (p): p is Extract<(typeof m.parts)[number], { type: "source-url" }> =>
      p.type === "source-url"
  );

  return (
    <div>
      {sourceParts.length > 0 && (
        <Sources>
          <SourcesTrigger count={sourceParts.length} />
          <SourcesContent>
            {sourceParts.map((s) => (
              <Source
                href={s.url}
                key={s.sourceId}
                title={s.title ?? s.url}
              />
            ))}
          </SourcesContent>
        </Sources>
      )}
      {m.parts.map((part, idx) => {
        if (part.type === "reasoning") {
          return (
            <Reasoning
              defaultOpen={part.state === "streaming"}
              isStreaming={part.state === "streaming"}
              key={`r-${idx}`}
            >
              <ReasoningTrigger />
              <ReasoningContent>{part.text}</ReasoningContent>
            </Reasoning>
          );
        }
        if (part.type === "text") {
          return (
            <MessageContent key={`t-${idx}`}>
              <MessageResponse>{part.text}</MessageResponse>
            </MessageContent>
          );
        }
        return null;
      })}
    </div>
  );
}

function renderUserMessage(m: UIMessage) {
  return (
    <div>
      {m.parts.map((part, idx) => {
        if (part.type === "text") {
          return (
            <MessageContent key={`t-${idx}`}>
              <MessageResponse>{part.text}</MessageResponse>
            </MessageContent>
          );
        }
        if (part.type === "file") {
          return (
            <MessageContent key={`f-${idx}`}>
              <p className="text-xs text-muted-foreground">
                {part.filename ?? "Attachment"} ({part.mediaType})
              </p>
            </MessageContent>
          );
        }
        return null;
      })}
    </div>
  );
}

export type ChatBotProps = {
  chatId: string;
  initialMessages?: UIMessage[];
};

function ChatBotInner({ chatId, initialMessages = [] }: ChatBotProps) {
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { textInput, attachments } = usePromptInputController();
  const [model, setModel] = useState<string>(DEFAULT_LOCAL_TAG);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/stream",
        prepareSendMessagesRequest: ({ id, messages, body }) => ({
          body: {
            id,
            messages,
            model,
            webSearch: useWebSearch,
            chatId,
            ...body,
          },
        }),
      }),
    [chatId, model, useWebSearch]
  );

  const { messages, sendMessage, status, error, clearError } = useChat({
    id: chatId,
    messages: initialMessages,
    experimental_throttle: 100,
    transport,
    onError: (err: Error) => {
      console.error("[chat-bot]", err);
      if (err.message?.includes("409") || err.message.includes("Configure")) {
        toast.error("Configure the assistant in slashcash (e.g. Ollama) before chatting.");
        return;
      }
      toast.error(err.message || "Request failed");
    },
    onFinish: ({
      isAbort,
      isError,
    }: {
      isAbort: boolean;
      isError: boolean;
    }) => {
      if (isAbort || isError) {
        return;
      }
      void queryClient.invalidateQueries(trpc.chat.list.queryFilter({ limit: 50 }));
    },
  } as any);

  const selectedModelData = useMemo(
    () => models.find((m) => m.id === model),
    [model]
  );

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.role !== "system"),
    [messages]
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text?.trim());
      const hasFiles = Boolean(message.files?.length);
      if (!(hasText || hasFiles)) {
        return;
      }
      if (message.files?.length) {
        toast.info("File attachments are not sent to the stream API yet.");
      }
      if (!message.text?.trim()) {
        return;
      }
      try {
        clearError?.();
        await sendMessage({
          role: "user",
          parts: [{ type: "text", text: message.text.trim() }],
        } as any);
      } catch {
        // onError on useChat also runs
      }
    },
    [sendMessage, clearError]
  );

  const handleSuggestionClick = useCallback(
    async (suggestion: string) => {
      try {
        clearError?.();
        await sendMessage({
          role: "user",
          parts: [{ type: "text", text: suggestion }],
        } as any);
      } catch {
        /* useChat onError */
      }
    },
    [sendMessage, clearError]
  );

  const handleTranscriptionChange = useCallback(
    (transcript: string) => {
      const v = textInput.value;
      textInput.setInput(v ? `${v} ${transcript}` : transcript);
    },
    [textInput]
  );

  const toggleWebSearch = useCallback(() => {
    setUseWebSearch((v) => !v);
  }, []);

  const handleModelSelect = useCallback((id: string) => {
    setModel(id);
    setModelSelectorOpen(false);
  }, []);

  const isBusy = status === "streaming" || status === "submitted";
  const isEmpty = !textInput.value.trim() && attachments.files.length === 0;
  const isSubmitDisabled = isBusy || isEmpty;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message || "Something went wrong. Try again."}
              </AlertDescription>
            </Alert>
          )}
          {visibleMessages.map((m) => (
            <MessageBranch defaultBranch={0} key={m.id}>
              <MessageBranchContent>
                <Message from={m.role}>
                  {m.role === "assistant"
                    ? renderAssistantMessage(m)
                    : renderUserMessage(m)}
                </Message>
              </MessageBranchContent>
            </MessageBranch>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="grid shrink-0 gap-4 border-t pt-4">
        <Suggestions className="px-4">
          {suggestions.map((s) => (
            <SuggestionItem
              key={s}
              onClick={handleSuggestionClick}
              suggestion={s}
            />
          ))}
        </Suggestions>
        <div className="w-full px-4 pb-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea placeholder="Ask about your spending or anything else…" />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <SpeechInput
                  className="shrink-0"
                  onTranscriptionChange={handleTranscriptionChange}
                  size="icon-sm"
                  variant="ghost"
                />
                <PromptInputButton
                  onClick={toggleWebSearch}
                  type="button"
                  variant={useWebSearch ? "default" : "ghost"}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <ModelSelector
                  onOpenChange={setModelSelectorOpen}
                  open={modelSelectorOpen}
                >
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton type="button">
                      {selectedModelData?.chefSlug && (
                        <ModelSelectorLogo
                          provider={selectedModelData.chefSlug}
                        />
                      )}
                      {selectedModelData?.name && (
                        <ModelSelectorName>
                          {selectedModelData.name}
                        </ModelSelectorName>
                      )}
                    </PromptInputButton>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {chefs.map((chef) => (
                        <ModelSelectorGroup heading={chef} key={chef}>
                          {models
                            .filter((x) => x.chef === chef)
                            .map((row) => (
                              <ModelItem
                                isSelected={model === row.id}
                                key={row.id}
                                m={row}
                                onSelect={handleModelSelect}
                              />
                            ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={isSubmitDisabled}
                status={status as "ready" | "submitted" | "streaming" | "error"}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

export function ChatBot(props: ChatBotProps) {
  return (
    <PromptInputProvider>
      <ChatBotInner {...props} />
    </PromptInputProvider>
  );
}

export default ChatBot;
