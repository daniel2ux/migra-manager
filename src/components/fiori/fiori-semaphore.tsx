"use client";

import { cn } from "@/lib/utils";

export type FioriSemaphoreVariant = "critical" | "warning" | "positive" | "informative" | "neutral";

interface FioriSemaphoreProps {
    variant: FioriSemaphoreVariant;
    pulse?: boolean;
    className?: string;
}

export function FioriSemaphore({ variant, pulse = false, className }: FioriSemaphoreProps) {
    return (
        <div
            className={cn(
                "fiori-semaphore",
                variant === "critical" && "fiori-semaphore--critical",
                variant === "warning" && "fiori-semaphore--warning",
                variant === "positive" && "fiori-semaphore--positive",
                variant === "informative" && "fiori-semaphore--informative",
                variant === "neutral" && "fiori-semaphore--neutral",
                pulse && "fiori-semaphore--pulse",
                className
            )}
            aria-hidden
        >
            <span className="fiori-semaphore__light" />
        </div>
    );
}
