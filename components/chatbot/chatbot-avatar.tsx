import Image from "next/image";
import { cn } from "@/lib/utils";

export const CHATBOT_MASCOT_PATH = "/images/chatbot-mascot.png";

const sizeMap = {
  xs: 24,
  sm: 28,
  md: 40,
  lg: 56,
  xl: 96,
} as const;

type ChatbotAvatarSize = keyof typeof sizeMap;

type ChatbotAvatarProps = {
  size?: ChatbotAvatarSize;
  className?: string;
};

export function ChatbotAvatar({ size = "sm", className }: ChatbotAvatarProps) {
  const pixels = sizeMap[size];

  return (
    <Image
      src={CHATBOT_MASCOT_PATH}
      alt=""
      width={pixels}
      height={pixels}
      aria-hidden
      className={cn(
        "shrink-0 object-contain",
        size === "xs" && "size-6",
        size === "sm" && "size-7",
        size === "md" && "size-10",
        size === "lg" && "size-14",
        size === "xl" && "size-24",
        className,
      )}
    />
  );
}

type ChatbotMascotProps = {
  className?: string;
};

export function ChatbotMascot({ className }: ChatbotMascotProps) {
  return (
    <Image
      src={CHATBOT_MASCOT_PATH}
      alt="CRM Chatbot"
      width={192}
      height={192}
      priority
      className={cn("mx-auto mb-10 size-48 object-contain", className)}
    />
  );
}
