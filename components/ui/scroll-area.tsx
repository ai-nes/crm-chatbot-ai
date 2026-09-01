"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.Root.Props
>(({ className, children, ...props }, ref) => {
  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      {children}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.Scrollbar.Props
>(({ className, orientation = "vertical", ...props }, ref) => {
  return (
    <ScrollAreaPrimitive.Scrollbar
      ref={ref}
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none rounded-full bg-transparent p-0.5 opacity-70 transition-opacity duration-200 select-none hover:opacity-100 data-horizontal:h-2 data-horizontal:w-full data-horizontal:flex-col data-vertical:h-full data-vertical:w-2",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-[rgba(107,114,128,0.4)] transition-colors hover:bg-[var(--claude-accent)]"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
});
ScrollBar.displayName = "ScrollBar";

const ScrollAreaViewport = React.forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.Viewport.Props
>(({ className, style, children, ...props }, ref) => {
  return (
    <ScrollAreaPrimitive.Viewport
      ref={ref}
      data-slot="scroll-area-viewport"
      className={cn(
        "no-scrollbar size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
        className
      )}
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        ...style,
      }}
      {...props}
    >
      <ScrollAreaPrimitive.Content
        className="w-full min-w-0"
        style={{ minWidth: 0, width: "100%" }}
      >
        {children}
      </ScrollAreaPrimitive.Content>
    </ScrollAreaPrimitive.Viewport>
  );
});
ScrollAreaViewport.displayName = "ScrollAreaViewport";

export { ScrollArea, ScrollAreaViewport, ScrollBar };
