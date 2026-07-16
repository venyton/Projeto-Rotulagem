"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = Exclude<Theme, "system">;

type ThemeContextValue = {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: string) => void;
};

type ThemeProviderProps = {
    children: React.ReactNode;
    attribute?: "class" | `data-${string}`;
    defaultTheme?: Theme;
    enableSystem?: boolean;
    enableColorScheme?: boolean;
    disableTransitionOnChange?: boolean;
    storageKey?: string;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function isTheme(value: string | null): value is Theme {
    return value === "light" || value === "dark" || value === "system";
}

export function useTheme() {
    const context = React.useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }

    return context;
}

export function ThemeProvider({
    children,
    attribute = "data-theme",
    defaultTheme = "system",
    enableSystem = true,
    enableColorScheme = true,
    disableTransitionOnChange = false,
    storageKey = "theme",
}: ThemeProviderProps) {
    const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
    const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
        defaultTheme === "dark" ? "dark" : "light",
    );
    const [mounted, setMounted] = React.useState(false);

    const resolveTheme = React.useCallback(
        (value: Theme): ResolvedTheme => {
            if (value === "system" && enableSystem) return getSystemTheme();
            return value === "dark" ? "dark" : "light";
        },
        [enableSystem],
    );

    const applyTheme = React.useCallback(
        (value: Theme) => {
            const resolved = resolveTheme(value);
            const root = document.documentElement;

            if (disableTransitionOnChange) {
                const style = document.createElement("style");
                style.textContent = "*,*::before,*::after{transition:none!important}";
                document.head.appendChild(style);
                window.setTimeout(() => style.remove(), 1);
            }

            if (attribute === "class") {
                root.classList.remove("light", "dark");
                root.classList.add(resolved);
            } else {
                root.setAttribute(attribute, resolved);
            }

            if (enableColorScheme) root.style.colorScheme = resolved;
            setResolvedTheme(resolved);
        },
        [attribute, disableTransitionOnChange, enableColorScheme, resolveTheme],
    );

    React.useEffect(() => {
        const storedTheme = window.localStorage.getItem(storageKey);
        const initialTheme = isTheme(storedTheme) ? storedTheme : defaultTheme;

        setThemeState(initialTheme);
        applyTheme(initialTheme);
        setMounted(true);
    }, [applyTheme, defaultTheme, storageKey]);

    React.useEffect(() => {
        if (!mounted) return;
        applyTheme(theme);
    }, [applyTheme, mounted, theme]);

    React.useEffect(() => {
        if (!mounted || !enableSystem || theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => applyTheme("system");

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [applyTheme, enableSystem, mounted, theme]);

    const setTheme = React.useCallback(
        (nextTheme: string) => {
            if (!isTheme(nextTheme)) return;
            setThemeState(nextTheme);
            window.localStorage.setItem(storageKey, nextTheme);
        },
        [storageKey],
    );

    const value = React.useMemo(
        () => ({ theme, resolvedTheme, setTheme }),
        [resolvedTheme, setTheme, theme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
