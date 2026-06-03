import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
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
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { ChatbotAvatar, ChatbotMascot } from "@/components/chatbot/chatbot-avatar";
import { Button } from "@/components/ui/button";
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
  useAuiState,
} from "@assistant-ui/react";
import { useComposerCancel, useComposerSend } from "@assistant-ui/core/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import type { FC } from "react";

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root @container flex h-full flex-col bg-[var(--claude-bg)]"
      style={{
        ["--thread-max-width" as string]: "48rem",
        ["--composer-radius" as string]: "28px",
        ["--composer-padding" as string]: "14px",
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        data-slot="aui_thread-viewport"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div className="mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-6 md:px-6">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>

          <div
            data-slot="aui_message-group"
            className="mb-6 flex flex-col gap-y-10 empty:hidden"
          >
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer sticky bottom-0 mt-auto flex flex-col gap-3 overflow-visible bg-gradient-to-t from-[var(--claude-bg)] from-60% to-transparent pb-4 pt-6 md:pb-8">
            <ThreadScrollToBottom />
            <Composer />
            <p className="text-center text-xs text-[var(--claude-muted)]">
              CRM Chatbot có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
            </p>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
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

const AssistantAvatar: FC = () => (
  <ChatbotAvatar size="xl" className="mt-1" />
);

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom
      render={
        <TooltipIconButton
          tooltip="Cuộn xuống"
          variant="outline"
          className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full border-[var(--claude-border)] bg-[var(--claude-surface)] p-3 shadow-sm hover:bg-[#f5f4f0] disabled:invisible"
        />
      }
    >
      <ArrowDownIcon className="size-4" />
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <div className="aui-thread-welcome-root my-auto flex min-h-[50vh] grow flex-col justify-center">
      <div className="aui-thread-welcome-center flex w-full flex-col items-center justify-center text-center">
        <ChatbotMascot />
        <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-serif text-3xl font-normal text-[var(--claude-text)] duration-300 md:text-4xl">
          Tôi có thể hỗ trợ gì cho bạn?
        </h1>
        <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both mt-3 max-w-md text-[15px] text-[var(--claude-muted)] delay-75 duration-300">
          Tra cứu khách hàng, tạo ticket, xem báo cáo hoặc hỏi về CRM
        </p>
      </div>
      <ThreadSuggestions />
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions mx-auto mt-8 grid w-full max-w-2xl gap-2 @md:grid-cols-2">
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
            className="aui-thread-welcome-suggestion h-auto w-full flex-wrap items-start justify-start gap-1 rounded-2xl border border-[var(--claude-border)] bg-[var(--claude-surface)] px-4 py-3.5 text-start text-sm shadow-sm transition-all hover:border-[var(--claude-accent)]/30 hover:bg-[#faf9f5] hover:shadow-md @md:flex-col"
          />
        }
      >
        <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 font-medium text-[var(--claude-text)]" />
        <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-[var(--claude-muted)] empty:hidden" />
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone
        render={
          <div
            data-slot="aui_composer-shell"
            className="flex w-full flex-col gap-2 rounded-(--composer-radius) border border-[var(--claude-border)] bg-[var(--claude-surface)] p-(--composer-padding) shadow-md transition-shadow focus-within:border-[var(--claude-accent)]/40 focus-within:shadow-lg data-[dragging=true]:border-[var(--claude-accent)] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[#faf9f5]"
          />
        }
      >
        <ComposerAttachments />
        <ComposerPrimitive.Input
          placeholder="Trả lời CRM Chatbot..."
          className="aui-composer-input max-h-40 min-h-12 w-full resize-none bg-transparent px-1 py-1 text-[15px] text-[var(--claude-text)] outline-none placeholder:text-[var(--claude-muted)]"
          rows={1}
          autoFocus
          aria-label="Nhập tin nhắn"
        />
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerSendButton: FC = () => {
  const hasText = useAuiState((s) => s.composer.text.trim().length > 0);
  const { disabled, send } = useComposerSend();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => send()}
      className={cn(
        "aui-composer-send inline-flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1915]/30",
        "disabled:pointer-events-none",
        hasText && !disabled
          ? "border-[#1a1915] bg-[#1a1915] text-white shadow-sm hover:bg-[#2d2c28]"
          : "border-[#d4d0c8] bg-[#eceae4] text-[#6b6860]",
      )}
      aria-label="Gửi tin nhắn"
    >
      <ArrowUpIcon className="aui-composer-send-icon size-4" />
    </button>
  );
};

const ComposerCancelButton: FC = () => {
  const { disabled, cancel } = useComposerCancel();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => cancel()}
      className={cn(
        "aui-composer-cancel inline-flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
        "border-[#1a1915] bg-[#1a1915] text-white shadow-sm hover:bg-[#2d2c28]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a1915]/30",
        "disabled:pointer-events-none disabled:border-[#d4d0c8] disabled:bg-[#eceae4] disabled:text-[#6b6860] disabled:shadow-none",
      )}
      aria-label="Dừng tạo phản hồi"
    >
      <SquareIcon className="aui-composer-cancel-icon size-3 fill-current" />
    </button>
  );
};

const ComposerAction: FC = () => {
  return (
    <div className="aui-composer-action-wrapper flex items-end justify-between gap-2 pt-1">
      <ComposerAddAttachment />
      <div className="ml-auto flex items-center">
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerSendButton />
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
      <div className="flex gap-3 md:gap-4">
        <AssistantAvatar />
        <div className="min-w-0 flex-1">
          <div
            data-slot="aui_assistant-message-content"
            className="text-[var(--claude-text)] wrap-break-word [contain-intrinsic-size:auto_24px] [content-visibility:auto]"
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
                    return <MarkdownText />;
                  case "reasoning":
                    return <Reasoning {...part} />;
                  case "tool-call":
                    return part.toolUI ?? <ToolFallback {...part} />;
                  case "indicator":
                    return (
                      <span
                        data-slot="aui_assistant-message-indicator"
                        className="animate-pulse font-serif text-[var(--claude-muted)]"
                        aria-label="Assistant is working"
                      >
                        ●
                      </span>
                    );
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
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-assistant-action-bar-root -ms-1 flex gap-0.5 text-[var(--claude-muted)] opacity-0 transition-opacity group-hover:opacity-100 data-[floating]:opacity-100"
    >
      <ActionBarPrimitive.Copy
        render={
          <TooltipIconButton
            tooltip="Sao chép"
            className="size-7 text-[var(--claude-muted)] hover:bg-[#eceae4] hover:text-[var(--claude-text)]"
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
            className="size-7 text-[var(--claude-muted)] hover:bg-[#eceae4] hover:text-[var(--claude-text)]"
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
              className="size-7 text-[var(--claude-muted)] hover:bg-[#eceae4] hover:text-[var(--claude-text)] data-[state=open]:bg-[#eceae4]"
            />
          }
        >
          <MoreHorizontalIcon className="size-3.5" />
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          className="aui-action-bar-more-content z-50 min-w-32 overflow-hidden rounded-xl border border-[var(--claude-border)] bg-[var(--claude-surface)] p-1 shadow-lg"
        >
          <ActionBarPrimitive.ExportMarkdown
            render={
              <ActionBarMorePrimitive.Item className="aui-action-bar-more-item flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none hover:bg-[#f5f4f0]" />
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
      className="fade-in slide-in-from-bottom-1 animate-in flex justify-end duration-200 [contain-intrinsic-size:auto_60px] [content-visibility:auto]"
      data-role="user"
    >
      <div className="flex max-w-[85%] flex-col items-end gap-2">
        <UserMessageAttachments />
        <div className="aui-user-message-content-wrapper group relative min-w-0">
          <div className="aui-user-message-content peer rounded-3xl bg-[var(--claude-user-bubble)] px-4 py-3 text-[15px] leading-relaxed text-[var(--claude-text)] wrap-break-word empty:hidden">
            <MessagePrimitive.Parts />
          </div>
          <div className="aui-user-action-bar-wrapper absolute top-1/2 -start-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 peer-empty:hidden">
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
            className="aui-user-action-edit size-7 text-[var(--claude-muted)] hover:bg-[#eceae4]"
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
      <ComposerPrimitive.Root className="aui-edit-composer-root flex w-full max-w-[85%] flex-col rounded-3xl border border-[var(--claude-border)] bg-[var(--claude-user-bubble)]">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent p-4 text-[15px] text-[var(--claude-text)] outline-none"
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel
            render={
              <Button variant="ghost" size="sm" className="text-[var(--claude-muted)]" />
            }
          >
            Hủy
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            render={
              <Button
                size="sm"
                className="rounded-lg bg-[var(--claude-text)] text-white hover:bg-[#2d2c28]"
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
        "aui-branch-picker-root inline-flex items-center text-xs text-[var(--claude-muted)]",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous
        render={
          <TooltipIconButton
            tooltip="Trước"
            className="size-6 text-[var(--claude-muted)]"
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
            className="size-6 text-[var(--claude-muted)]"
          />
        }
      >
        <ChevronRightIcon className="size-3.5" />
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
