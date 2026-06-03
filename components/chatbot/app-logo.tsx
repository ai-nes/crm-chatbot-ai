import Image from "next/image";
import { cn } from "@/lib/utils";

export const APP_LOGO_PATH = "/images/logo-app.png";

type AppLogoProps = {
  className?: string;
  priority?: boolean;
};

export function AppLogo({ className, priority }: AppLogoProps) {
  return (
    <Image
      src={APP_LOGO_PATH}
      alt="FPT University"
      width={220}
      height={56}
      priority={priority}
      className={cn("h-8 w-auto max-w-[180px] object-contain object-left", className)}
    />
  );
}
