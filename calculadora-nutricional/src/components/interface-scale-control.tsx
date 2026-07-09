'use client'

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type InterfaceScaleValue = "compact" | "standard" | "comfortable" | "large";

const STORAGE_KEY = "soizi-interface-scale";
const DEFAULT_SCALE: InterfaceScaleValue = "standard";

const SCALE_OPTIONS: Array<{ value: InterfaceScaleValue; label: string; fontSize: string }> = [
    { value: "compact", label: "Compacto", fontSize: "14px" },
    { value: "standard", label: "Padrão", fontSize: "15px" },
    { value: "comfortable", label: "Amplo", fontSize: "16px" },
    { value: "large", label: "Grande", fontSize: "17px" },
];

function normalizeScale(value: string | null): InterfaceScaleValue {
    return SCALE_OPTIONS.some((option) => option.value === value) ? value as InterfaceScaleValue : DEFAULT_SCALE;
}

export function applyInterfaceScale(value: string | null) {
    if (typeof document === "undefined") return DEFAULT_SCALE;

    const scale = normalizeScale(value);
    const option = SCALE_OPTIONS.find((item) => item.value === scale) || SCALE_OPTIONS[1];
    document.documentElement.dataset.interfaceScale = option.value;
    document.documentElement.style.setProperty("--interface-font-size", option.fontSize);
    return scale;
}

export function InterfaceScaleProvider() {
    useEffect(() => {
        applyInterfaceScale(window.localStorage.getItem(STORAGE_KEY));

        const onStorage = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY) {
                applyInterfaceScale(event.newValue);
            }
        };

        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    return null;
}

export function InterfaceScaleControl() {
    const [scale, setScale] = useState<InterfaceScaleValue>(() => (
        typeof window === "undefined" ? DEFAULT_SCALE : normalizeScale(window.localStorage.getItem(STORAGE_KEY))
    ));

    useEffect(() => {
        applyInterfaceScale(scale);
    }, [scale]);

    const currentIndex = Math.max(0, SCALE_OPTIONS.findIndex((option) => option.value === scale));
    const current = SCALE_OPTIONS[currentIndex] || SCALE_OPTIONS[1];

    const updateScale = (nextIndex: number) => {
        const next = SCALE_OPTIONS[Math.min(Math.max(nextIndex, 0), SCALE_OPTIONS.length - 1)];
        setScale(next.value);
        window.localStorage.setItem(STORAGE_KEY, next.value);
        applyInterfaceScale(next.value);
    };

    return (
        <div className="inline-flex min-w-0 items-center overflow-hidden rounded-lg border border-input bg-background shadow-sm">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-none border-r border-input"
                onClick={() => updateScale(currentIndex - 1)}
                disabled={currentIndex === 0}
                aria-label="Diminuir fonte e janelas"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-10 min-w-28 items-center justify-center px-4 text-sm font-semibold">
                {current.label}
            </div>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-none border-l border-input"
                onClick={() => updateScale(currentIndex + 1)}
                disabled={currentIndex === SCALE_OPTIONS.length - 1}
                aria-label="Aumentar fonte e janelas"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
