import { ReactNode, useEffect, useRef, useState } from "react";

import { Box, BoxProps } from "@mui/material";

interface AutoScrollProps extends BoxProps {
  children: ReactNode;
  /**
   * Value to watch for changes - component will scroll to bottom when this changes
   */
  triggerValue?: unknown;
  /**
   * Array of values to watch for changes - component will scroll when any of these change
   */
  triggerValues?: unknown[];
  /**
   * Custom function that returns true when scrolling should be triggered
   */
  shouldScrollFn?: () => boolean;
}

/**
 * A component that automatically scrolls to the bottom when content changes.
 *
 * Usage examples:
 *
 * 1. Watch a single value: <AutoScroll triggerValue={messages.length}>...</AutoScroll>
 * 2. Watch multiple values: <AutoScroll triggerValues={[items.length, status]}>...</AutoScroll>
 * 3. Custom logic: <AutoScroll shouldScrollFn={() => newMessages > 0}>...</AutoScroll>
 */
export function AutoScroll({
  children,
  triggerValue,
  triggerValues = [],
  shouldScrollFn,
  ...props
}: AutoScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Handle scroll events to determine if auto-scroll should remain enabled
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If user is near the bottom (within 20px), keep auto-scrolling enabled
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 20);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (autoScroll && scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  };

  // Watch for changes in trigger values
  useEffect(() => {
    if (shouldScrollFn) {
      if (shouldScrollFn()) {
        scrollToBottom();
      }
    } else {
      scrollToBottom();
    }
  }, [triggerValue, ...triggerValues, shouldScrollFn]);

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      sx={{
        overflow: "auto",
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
