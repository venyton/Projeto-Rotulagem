'use client'

import { useEffect, useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type InterfaceScaleValue = "compact" | "standard" | "comfortable" | "large";

const STORAGE_KEY = "soizi-interface-scale";
const DEFAULT_SCALE: InterfaceScaleValue = "standard";
const SCALE_OPTIONS: Array<{ value: InterfaceScaleValue; label: string; fontSize: string }> = [
    { value: "compact", label: "Compacto", fontSize: "12px" },
    { value: "standard", label: "Padrão", fontSize: "13px" },
    { value: "comfortable", label: "Amplo", fontSize: "14px" },
    { value: "large", label: "Grande", fontSize: "15px" },
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
        const onStorage = (event: StorageEvent) => event.key === STORAGE_KEY && applyInterfaceScale(event.newValue);
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);
    return null;
}

export function InterfaceScaleControl() {
    const [scale, setScale] = useState<InterfaceScaleValue>(DEFAULT_SCALE);

    useEffect(() => {
        const storedScale = normalizeScale(window.localStorage.getItem(STORAGE_KEY));
        applyInterfaceScale(storedScale);
        const syncState = window.setTimeout(() => setScale(storedScale), 0);
        return () => window.clearTimeout(syncState);
    }, []);

    const updateScale = (value: string) => {
        if (!value) return;
        const next = normalizeScale(value);
        setScale(next);
        window.localStorage.setItem(STORAGE_KEY, next);
        applyInterfaceScale(next);
    };

    return (
        <ToggleGroup type="single" value={scale} onValueChange={updateScale} variant="outline" aria-label="Tamanho da interface" className="flex-wrap">
            {SCALE_OPTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>{option.label}</ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
