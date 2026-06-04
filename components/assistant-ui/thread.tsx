import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import {
  AssistantPendingIndicator,
  AssistantText,
} from "@/components/assistant-ui/thinking-block";
import {
  Reasoning,
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@/components/assistant-ui/reasoning";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/tool-group";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { WelcomeRotatingHeadline } from "@/components/assistant-ui/welcome-rotating-headline";
import { VoiceOrb } from "@/components/assistant-ui/voice";
import type { VoiceOrbState } from "@/components/assistant-ui/voice";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { useComposerCancel, useComposerDictate, useComposerSend } from "@assistant-ui/core/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MicIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, FC } from "react";

const ComposerTooltipButton: FC<
  ComponentPropsWithoutRef<"button"> & {
    tooltip: string;
    side?: "top" | "bottom" | "left" | "right";
  }
> = ({ tooltip, side = "bottom", className, children, ...props }) => (
  <TooltipProvider delay={0}>
    <Tooltip>
      <TooltipTrigger
        render={
          <button type="button" className={className} {...props} />
        }
      >
        {children}
        <span className="sr-only">{tooltip}</span>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container grid h-full min-h-0 max-w-full flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-(--claude-bg)"
      style={{
        ["--thread-max-width" as string]: "56rem",
        ["--composer-radius" as string]: "28px",
        ["--composer-padding" as string]: "14px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="relative min-h-0 overflow-x-hidden overflow-y-auto scroll-smooth no-scrollbar"
      >
        <ThreadViewportContent />

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 mx-auto flex w-full max-w-(--thread-max-width) justify-center px-4 md:px-6">
          <div className="pointer-events-auto">
            <ThreadScrollToBottom />
          </div>
        </div>
      </ThreadPrimitive.Viewport>

      <div
        data-slot="aui_thread-footer"
        className="aui-thread-footer z-10 flex min-w-0 max-w-full shrink-0 flex-col gap-2 overflow-x-hidden bg-(--claude-bg) px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(245,244,239,0.95)] md:gap-3 md:px-6 md:pb-8 md:pt-4"
      >
        <div className="mx-auto w-full max-w-(--thread-max-width)">
          <Composer />
          <p className="mt-2.5 text-center text-xs text-(--claude-muted) md:mt-3">
            CRM Chatbot có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
          </p>
        </div>
      </div>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);

  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
};

const ThreadViewportContent: FC = () => {
  const isEmpty = useAuiState((s) => s.thread.isEmpty);

  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-(--thread-max-width) flex-col overflow-x-hidden px-4 md:px-6",
        isEmpty ? "min-h-full" : "min-h-0",
      )}
    >
      {isEmpty && (
        <div className="aui-thread-welcome-shell flex min-h-0 flex-1 flex-col items-center justify-center py-6 md:py-12">
          <ThreadWelcome />
        </div>
      )}

      <div
        data-slot="aui_message-group"
        className={cn(
          "flex flex-col gap-y-8 pb-6 md:gap-y-10 md:pb-8",
          isEmpty ? "hidden" : "pt-4 md:pt-6",
        )}
      >
        <ThreadPrimitive.Messages>
          {() => <ThreadMessage />}
        </ThreadPrimitive.Messages>
      </div>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom
      render={
        <TooltipIconButton
          tooltip="Cuộn xuống"
          variant="outline"
          className="aui-thread-scroll-to-bottom rounded-full border-(--claude-border) bg-(--claude-surface) p-3 shadow-sm hover:bg-(--claude-card) disabled:invisible"
        />
      }
    >
      <ArrowDownIcon className="size-4" />
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  const dictation = useAuiState((s) => s.composer.dictation);

  if (dictation) {
    const orbState: VoiceOrbState =
      dictation.status.type === "starting" ? "connecting" : "listening";
    return (
      <div className="aui-thread-welcome-root flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-6">
        <VoiceOrb state={orbState} variant="blue" className="size-40 md:size-56" />
        <p className="fade-in animate-in text-lg text-(--claude-muted) duration-300">
          {dictation.status.type === "starting" ? "Đang khởi động..." : "Đang lắng nghe..."}
        </p>
      </div>
    );
  }

  return (
    <div className="aui-thread-welcome-root flex w-full min-w-0 max-w-full flex-col items-center gap-6 px-1 text-center md:gap-8">
      <div className="aui-thread-welcome-center flex w-full flex-col items-center justify-center">
        <WelcomeRotatingHeadline />
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions mx-auto grid w-full min-w-0 max-w-full gap-2 @md:grid-cols-2">
      <ThreadPrimitive.Suggestions>
        {() => <ThreadSuggestionItem />}
      </ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200 nth-[n+3]:hidden @md:nth-[n+3]:block">
      <SuggestionPrimitive.Trigger
        send
        render={
          <Button
            variant="ghost"
            className="aui-thread-welcome-suggestion h-auto w-full min-w-0 max-w-full flex-wrap items-start justify-start gap-1 rounded-2xl border border-(--claude-border-subtle) bg-(--claude-card) px-4 py-3.5 text-start text-sm transition-all hover:border-(--claude-border) hover:bg-[#e5e3dd] @md:flex-col"
          />
        }
      >
        <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 font-medium break-words text-(--claude-text)" />
        <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 break-words text-(--claude-muted) empty:hidden" />
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const ComposerInlineDictationOrb: FC = () => {
  const dictation = useAuiState((s) => s.composer.dictation);
  const hasMessages = useAuiState((s) => !s.thread.isEmpty);

  if (!dictation || !hasMessages) return null;

  const orbState: VoiceOrbState =
    dictation.status.type === "starting" ? "connecting" : "listening";

  return (
    <div className="flex items-center gap-3 px-1 py-1">
      <VoiceOrb state={orbState} variant="blue" className="size-10 shrink-0" />
      <p className="text-sm text-(--claude-muted)">
        {dictation.status.type === "starting" ? "Đang khởi động..." : "Đang lắng nghe..."}
      </p>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full min-w-0 max-w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone
        render={
          <div
            data-slot="aui_composer-shell"
            className="flex w-full min-w-0 max-w-full flex-col gap-2 rounded-(--composer-radius) border border-(--claude-border) bg-(--claude-surface) p-(--composer-padding) shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-shadow focus-within:border-(--claude-border) focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.12)] data-[dragging=true]:border-(--claude-accent) data-[dragging=true]:border-dashed data-[dragging=true]:bg-[#eeecea]"
          />
        }
      >
        <ComposerAttachments />
        <ComposerInlineDictationOrb />
        <ComposerPrimitive.Input
          placeholder="Trả lời CRM Chatbot..."
          className="aui-composer-input max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-1 text-[15px] text-(--claude-text) outline-none placeholder:text-(--claude-muted)"
          rows={1}
          autoFocus
          aria-label="Nhập tin nhắn"
        />
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const COMPOSER_FILLED_BTN =
  "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#1a1915] bg-[#1a1915] p-0 text-white shadow-sm transition-colors hover:bg-[#2d2c28] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1915]/30 disabled:pointer-events-none disabled:border-(--claude-border) disabled:bg-(--claude-card) disabled:text-(--claude-muted) disabled:shadow-none";

const ComposerSendButton: FC = () => {
  const { disabled, send } = useComposerSend();

  return (
    <ComposerTooltipButton
      tooltip="Gửi tin nhắn"
      disabled={disabled}
      onClick={() => send()}
      className={cn(COMPOSER_FILLED_BTN, "aui-composer-send")}
      aria-label="Gửi tin nhắn"
    >
      <ArrowUpIcon className="aui-composer-send-icon size-4" />
    </ComposerTooltipButton>
  );
};

const ComposerCancelButton: FC = () => {
  const { disabled, cancel } = useComposerCancel();

  return (
    <ComposerTooltipButton
      tooltip="Dừng tạo phản hồi"
      disabled={disabled}
      onClick={() => cancel()}
      className={cn(COMPOSER_FILLED_BTN, "aui-composer-cancel")}
      aria-label="Dừng tạo phản hồi"
    >
      <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
    </ComposerTooltipButton>
  );
};

const COMPOSER_ICON_BTN =
  "size-9 shrink-0 cursor-pointer rounded-xl border p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1915]/30";

const ComposerDictationButton: FC = () => {
  const { startDictation, disabled: cantStart } = useComposerDictate();
  const aui = useAui();
  const isActive = useAuiState((s) => s.composer.dictation != null);

  if (cantStart && !isActive) return null;

  return (
    <TooltipIconButton
      tooltip={isActive ? "Dừng ghi âm" : "Ghi âm giọng nói"}
      side="bottom"
      type="button"
      variant="ghost"
      onClick={() => (isActive ? aui.composer().stopDictation() : startDictation())}
      className={cn(
        COMPOSER_ICON_BTN,
        "aui-composer-dictate",
        isActive
          ? "animate-pulse border-red-400 bg-red-50 text-red-500 hover:bg-red-100"
          : "border-(--claude-border) bg-transparent text-(--claude-muted) hover:bg-(--claude-card) hover:text-(--claude-text)",
      )}
      aria-label={isActive ? "Dừng ghi âm" : "Ghi âm giọng nói"}
    >
      <MicIcon className="size-4" />
    </TooltipIconButton>
  );
};

const ComposerAction: FC = () => {
  const hasText = useAuiState((s) => s.composer.text.trim().length > 0);
  const isDictating = useAuiState((s) => s.composer.dictation != null);
  const showSend = hasText && !isDictating;

  return (
    <div className="aui-composer-action-wrapper flex items-end justify-between gap-2 pt-1">
      <ComposerAddAttachment />
      <div className="ml-auto flex items-center gap-1">
        <AuiIf condition={(s) => !s.thread.isRunning}>
          {showSend ? <ComposerSendButton /> : <ComposerDictationButton />}
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerCancelButton />
        </AuiIf>
      </div>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  const ACTION_BAR_PT = "pt-1.5";
  const ACTION_BAR_HEIGHT = `-mb-7.5 min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="group fade-in slide-in-from-bottom-1 animate-in relative duration-200"
    >
      <div className="min-w-0">
        <div
          data-slot="aui_assistant-message-content"
          className="text-(--claude-text) wrap-break-word"
        >
            <MessagePrimitive.GroupedParts
              groupBy={groupPartByType({
                reasoning: ["group-chainOfThought", "group-reasoning"],
                "tool-call": ["group-chainOfThought", "group-tool"],
                "standalone-tool-call": [],
              })}
            >
              {({ part, children }) => {
                switch (part.type) {
                  case "group-chainOfThought":
                    return (
                      <div data-slot="aui_chain-of-thought">{children}</div>
                    );
                  case "group-reasoning": {
                    const running = part.status.type === "running";
                    return (
                      <ReasoningRoot defaultOpen={running}>
                        <ReasoningTrigger active={running} />
                        <ReasoningContent aria-busy={running}>
                          <ReasoningText>{children}</ReasoningText>
                        </ReasoningContent>
                      </ReasoningRoot>
                    );
                  }
                  case "group-tool":
                    return (
                      <ToolGroupRoot>
                        <ToolGroupTrigger
                          count={part.indices.length}
                          active={part.status.type === "running"}
                        />
                        <ToolGroupContent>{children}</ToolGroupContent>
                      </ToolGroupRoot>
                    );
                  case "text":
                    return <AssistantText />;
                  case "reasoning":
                    return <Reasoning {...part} />;
                  case "tool-call":
                    return part.toolUI ?? <ToolFallback {...part} />;
                  case "indicator":
                    return <AssistantPendingIndicator />;
                  default:
                    return null;
                }
              }}
            </MessagePrimitive.GroupedParts>
            <MessageError />
        </div>

        <div
          data-slot="aui_assistant-message-footer"
          className={cn("flex items-center", ACTION_BAR_HEIGHT)}
        >
          <BranchPicker />
          <AssistantActionBar />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root -ms-1 flex gap-0.5 text-(--claude-muted)"
    >
      <ActionBarPrimitive.Copy
        render={
          <TooltipIconButton
            tooltip="Sao chép"
            className="size-7 text-(--claude-muted) hover:bg-(--claude-card) hover:text-(--claude-text)"
          />
        }
      >
        <AuiIf condition={(s) => s.message.isCopied}>
          <CheckIcon className="size-3.5" />
        </AuiIf>
        <AuiIf condition={(s) => !s.message.isCopied}>
          <CopyIcon className="size-3.5" />
        </AuiIf>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload
        render={
          <TooltipIconButton
            tooltip="Tạo lại"
            className="size-7 text-(--claude-muted) hover:bg-(--claude-card) hover:text-(--claude-text)"
          />
        }
      >
        <RefreshCwIcon className="size-3.5" />
      </ActionBarPrimitive.Reload>
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger
          render={
            <TooltipIconButton
              tooltip="Thêm"
              className="size-7 text-(--claude-muted) hover:bg-(--claude-card) hover:text-(--claude-text) data-[state=open]:bg-(--claude-card)"
            />
          }
        >
          <MoreHorizontalIcon className="size-3.5" />
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-xl border border-(--claude-border) bg-(--claude-surface) p-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
        >
          <ActionBarPrimitive.ExportMarkdown
            render={
              <ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none hover:bg-(--claude-card)" />
            }
          >
            <DownloadIcon className="size-4" />
            Xuất Markdown
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
    </ActionBarPrimitive.Root>
  );
};

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in flex justify-end duration-200"
      data-role="user"
    >
      <div className="flex max-w-[85%] flex-col items-end gap-2">
        <UserMessageAttachments />
        <div className="aui-user-message-content-wrapper group relative min-w-0">
          <div className="aui-user-message-content peer rounded-3xl bg-(--claude-user-bubble) px-4 py-3 text-[15px] leading-relaxed text-(--claude-text) wrap-break-word empty:hidden">
            <MessagePrimitive.Parts />
          </div>
          <div className="aui-user-action-bar-wrapper absolute top-1/2 -inset-s-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 peer-empty:hidden">
            <UserActionBar />
          </div>
        </div>
        <BranchPicker
          data-slot="aui_user-branch-picker"
          className="-me-1 justify-end"
        />
      </div>
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit
        render={
          <TooltipIconButton
            tooltip="Chỉnh sửa"
            className="aui-user-action-edit size-7 text-(--claude-muted) hover:bg-(--claude-card)"
          />
        }
      >
        <PencilIcon className="size-3.5" />
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex justify-end px-2"
    >
      <ComposerPrimitive.Root className="aui-edit-composer-root flex w-full max-w-[85%] flex-col rounded-3xl border border-(--claude-border) bg-(--claude-user-bubble)">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-[15px] text-(--claude-text) outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel
            render={
              <Button variant="ghost" size="sm" className="text-(--claude-muted)" />
            }
          >
            Hủy
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            render={
              <Button
                size="sm"
                className="rounded-lg bg-(--claude-text) text-white hover:bg-[#2d2c28]"
              />
            }
          >
            Cập nhật
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root inline-flex items-center text-xs text-(--claude-muted)",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous
        render={
          <TooltipIconButton
            tooltip="Trước"
            className="size-6 text-(--claude-muted)"
          />
        }
      >
        <ChevronLeftIcon className="size-3.5" />
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state px-1 font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next
        render={
          <TooltipIconButton
            tooltip="Sau"
            className="size-6 text-(--claude-muted)"
          />
        }
      >
        <ChevronRightIcon className="size-3.5" />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
