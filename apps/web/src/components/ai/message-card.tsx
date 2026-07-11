"use client";

import React from "react";
import { Avatar, Badge, Button, Link, Tooltip, cn } from "@heroui/react";
import { useClipboard } from "@heroui/use-clipboard";
import { Icon } from "@iconify/react";
import { toastSuccess } from "@/lib/toast";

export type AiMessageCardProps = React.HTMLAttributes<HTMLDivElement> & {
  avatar?: string;
  agentName?: string;
  role?: "persona" | "master" | "system";
  showFeedback?: boolean;
  message?: React.ReactNode;
  currentAttempt?: number;
  status?: "success" | "failed";
  attempts?: number;
  messageClassName?: string;
  timestamp?: string;
  onAttemptChange?: (attempt: number) => void;
  onMessageCopy?: (content: string | string[]) => void;
  onFeedback?: (feedback: "like" | "dislike") => void;
  onAttemptFeedback?: (feedback: "like" | "dislike" | "same") => void;
};

/**
 * Design ProMax: AI/prompt-containers message-card
 * Copied patterns: Avatar+Badge, bg-content2 bubble, absolute feedback bar, gravity-ui icons
 */
const MessageCard = React.forwardRef<HTMLDivElement, AiMessageCardProps>(
  (
    {
      avatar,
      agentName,
      role = "persona",
      message,
      showFeedback,
      attempts = 1,
      currentAttempt = 1,
      status,
      onMessageCopy,
      onAttemptChange,
      onFeedback,
      onAttemptFeedback,
      className,
      messageClassName,
      timestamp,
      ...props
    },
    ref,
  ) => {
    const [feedback, setFeedback] = React.useState<"like" | "dislike">();
    const [attemptFeedback, setAttemptFeedback] = React.useState<"like" | "dislike" | "same">();
    const messageRef = React.useRef<HTMLDivElement>(null);
    const { copied, copy } = useClipboard();

    const failedMessageClassName =
      status === "failed" ? "bg-danger-100/50 border border-danger-100 text-foreground" : "";
    const hasFailed = status === "failed";

    const roleBubble =
      role === "master"
        ? "bg-primary/10 border border-primary/20 text-default-700"
        : role === "system"
          ? "bg-content3 text-default-500"
          : "bg-content2 text-default-600";

    const handleCopy = React.useCallback(() => {
      let stringValue = "";
      if (typeof message === "string") stringValue = message;
      const valueToCopy = stringValue || messageRef.current?.textContent || "";
      copy(valueToCopy);
      onMessageCopy?.(valueToCopy);
      if (valueToCopy) toastSuccess("Copied", "Message copied to clipboard");
    }, [copy, message, onMessageCopy]);

    const handleFeedback = React.useCallback(
      (liked: boolean) => {
        setFeedback(liked ? "like" : "dislike");
        onFeedback?.(liked ? "like" : "dislike");
      },
      [onFeedback],
    );

    const handleAttemptFeedback = React.useCallback(
      (value: "like" | "dislike" | "same") => {
        setAttemptFeedback(value);
        onAttemptFeedback?.(value);
      },
      [onAttemptFeedback],
    );

    const failedMessage = (
      <p>
        That reply didn’t arrive. Try starting a new match.{" "}
        <Link href="/create" size="sm">
          Open a new arena
        </Link>
      </p>
    );

    return (
      <div {...props} ref={ref} className={cn("flex gap-2", className)}>
        <div className="relative flex-none">
          <Badge
            isOneChar
            color="danger"
            content={
              <Icon className="text-background" icon="gravity-ui:circle-exclamation-fill" />
            }
            isInvisible={!hasFailed}
            placement="bottom-right"
            shape="circle"
          >
            <Avatar
              size="sm"
              name={agentName?.slice(0, 2).toUpperCase()}
              src={avatar}
              className="bg-[#e4e4e7] text-[10px] font-semibold text-[#0a0a0b]"
            />
          </Badge>
        </div>
        <div className="flex min-w-0 w-full flex-col gap-1">
          {(agentName || role || timestamp) && (
            <div className="flex flex-wrap items-center gap-1.5 px-0.5">
              {agentName && (
                <span className="text-[12px] font-semibold text-[#0a0a0b]">
                  {agentName}
                </span>
              )}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                  role === "master" && "bg-[#5B7CFA]/15 text-[#3b5bdb]",
                  role === "persona" && "bg-[#f4f4f5] text-[#52525b]",
                  role === "system" && "bg-[#f4f4f5] text-[#71717a]",
                )}
              >
                {role === "master" ? "referee" : role}
              </span>
              {timestamp && (
                <span className="text-[10px] font-medium text-[#a1a1aa]">
                  {new Date(timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          <div
            className={cn(
              "relative w-full rounded-xl px-3 py-2",
              roleBubble,
              failedMessageClassName,
              messageClassName,
            )}
          >
            <div ref={messageRef} className="text-[13px] font-medium leading-relaxed whitespace-pre-line text-inherit">
              {hasFailed ? failedMessage : message}
            </div>

            {showFeedback && !hasFailed && (
              <div className="mt-2 flex justify-end rounded-full bg-content2 shadow-small">
                <Button isIconOnly radius="full" size="md" variant="light" aria-label="Copy message" onPress={handleCopy}>
                  {copied ? (
                    <Icon className="text-lg text-default-600" icon="gravity-ui:check" />
                  ) : (
                    <Icon className="text-lg text-default-600" icon="gravity-ui:copy" />
                  )}
                </Button>
                <Tooltip content="Useful">
                  <Button
                    isIconOnly
                    radius="full"
                    size="md"
                    variant="light"
                    aria-label="Mark message useful"
                    onPress={() => handleFeedback(true)}
                  >
                    {feedback === "like" ? (
                      <Icon className="text-lg text-default-600" icon="gravity-ui:thumbs-up-fill" />
                    ) : (
                      <Icon className="text-lg text-default-600" icon="gravity-ui:thumbs-up" />
                    )}
                  </Button>
                </Tooltip>
                <Tooltip content="Not useful">
                  <Button
                    isIconOnly
                    radius="full"
                    size="md"
                    variant="light"
                    aria-label="Mark message not useful"
                    onPress={() => handleFeedback(false)}
                  >
                    {feedback === "dislike" ? (
                      <Icon
                        className="text-lg text-default-600"
                        icon="gravity-ui:thumbs-down-fill"
                      />
                    ) : (
                      <Icon className="text-lg text-default-600" icon="gravity-ui:thumbs-down" />
                    )}
                  </Button>
                </Tooltip>
              </div>
            )}

            {attempts > 1 && !hasFailed && (
              <div className="flex w-full items-center justify-end">
                <button
                  type="button"
                  onClick={() => onAttemptChange?.(currentAttempt > 1 ? currentAttempt - 1 : 1)}
                  aria-label="Show previous version"
                  className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Icon
                    className="text-default-400 hover:text-default-500"
                    icon="gravity-ui:circle-arrow-left"
                  />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAttemptChange?.(currentAttempt < attempts ? currentAttempt + 1 : attempts)
                  }
                  aria-label="Show next version"
                  className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Icon
                    className="text-default-400 hover:text-default-500"
                    icon="gravity-ui:circle-arrow-right"
                  />
                </button>
                <p className="px-1 text-tiny font-medium text-default-500">
                  {currentAttempt}/{attempts}
                </p>
              </div>
            )}
          </div>

          {showFeedback && attempts > 1 && (
            <div className="flex items-center justify-between rounded-medium border-small border-default-100 px-4 py-3 shadow-small">
              <p className="text-small text-default-600">Was this response better or worse?</p>
              <div className="flex gap-1">
                <Tooltip content="Better">
                  <Button
                    isIconOnly
                    radius="full"
                    size="sm"
                    variant="light"
                    onPress={() => handleAttemptFeedback("like")}
                  >
                    {attemptFeedback === "like" ? (
                      <Icon className="text-lg text-primary" icon="gravity-ui:thumbs-up-fill" />
                    ) : (
                      <Icon className="text-lg text-default-600" icon="gravity-ui:thumbs-up" />
                    )}
                  </Button>
                </Tooltip>
                <Tooltip content="Worse">
                  <Button
                    isIconOnly
                    radius="full"
                    size="sm"
                    variant="light"
                    onPress={() => handleAttemptFeedback("dislike")}
                  >
                    {attemptFeedback === "dislike" ? (
                      <Icon
                        className="text-lg text-default-600"
                        icon="gravity-ui:thumbs-down-fill"
                      />
                    ) : (
                      <Icon className="text-lg text-default-600" icon="gravity-ui:thumbs-down" />
                    )}
                  </Button>
                </Tooltip>
                <Tooltip content="Same">
                  <Button
                    isIconOnly
                    radius="full"
                    size="sm"
                    variant="light"
                    onPress={() => handleAttemptFeedback("same")}
                  >
                    {attemptFeedback === "same" ? (
                      <Icon className="text-lg text-danger" icon="gravity-ui:face-sad" />
                    ) : (
                      <Icon className="text-lg text-default-600" icon="gravity-ui:face-sad" />
                    )}
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

MessageCard.displayName = "MessageCard";

export default MessageCard;
export { MessageCard as DebateMessageCard };
