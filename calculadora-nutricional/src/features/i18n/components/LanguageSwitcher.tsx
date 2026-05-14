'use client'

import * as React from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SITE_COPY,
    SITE_LANGUAGE_EXPLICIT_STORAGE_KEY,
    SITE_LANGUAGE_EVENT,
    SITE_LANGUAGE_STORAGE_KEY,
    SITE_LANGUAGES,
    type SiteLanguage,
    isSiteLanguage,
} from "@/features/i18n/domain/site-i18n";

export function getInitialLanguage(): SiteLanguage {
    if (typeof window === "undefined") return "pt-BR";
    const hasExplicitLanguage = window.localStorage.getItem(SITE_LANGUAGE_EXPLICIT_STORAGE_KEY) === "true";
    const stored = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);
    if (hasExplicitLanguage && isSiteLanguage(stored)) return stored;
    return "pt-BR";
}

export function useSiteLanguage() {
    const [language, setLanguageState] = React.useState<SiteLanguage>("pt-BR");

    React.useEffect(() => {
        const initial = getInitialLanguage();
        setLanguageState(initial);
        document.documentElement.lang = initial;

        const onLanguageChange = (event: Event) => {
            const detail = (event as CustomEvent<SiteLanguage>).detail;
            if (!isSiteLanguage(detail)) return;
            setLanguageState(detail);
            document.documentElement.lang = detail;
        };

        window.addEventListener(SITE_LANGUAGE_EVENT, onLanguageChange);
        return () => window.removeEventListener(SITE_LANGUAGE_EVENT, onLanguageChange);
    }, []);

    const setLanguage = React.useCallback((nextLanguage: SiteLanguage) => {
        window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, nextLanguage);
        window.localStorage.setItem(SITE_LANGUAGE_EXPLICIT_STORAGE_KEY, "true");
        document.documentElement.lang = nextLanguage;
        window.dispatchEvent(new CustomEvent(SITE_LANGUAGE_EVENT, { detail: nextLanguage }));
    }, []);

    return {
        language,
        copy: SITE_COPY[language],
        setLanguage,
    };
}

export function LanguageSwitcher() {
    const { language, copy, setLanguage } = useSiteLanguage();
    const activeLanguage = SITE_LANGUAGES.find((item) => item.value === language) || SITE_LANGUAGES[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 gap-2 px-2.5 text-[13px]">
                    <Languages className="h-4 w-4" />
                    <span aria-hidden>{activeLanguage.flag}</span>
                    <span className="hidden sm:inline">{activeLanguage.shortLabel}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{copy.language}</DropdownMenuLabel>
                {SITE_LANGUAGES.map((item) => (
                    <DropdownMenuItem key={item.value} onClick={() => setLanguage(item.value)}>
                        <span className="mr-2 w-10 text-xs font-semibold text-muted-foreground">
                            <span className="mr-1" aria-hidden>{item.flag}</span>
                            {item.shortLabel}
                        </span>
                        {item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
