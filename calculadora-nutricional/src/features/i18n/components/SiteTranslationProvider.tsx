'use client'

import * as React from "react";

import { useSiteLanguage } from "@/features/i18n/components/LanguageSwitcher";
import { GENERATED_UI_TRANSLATIONS } from "@/features/i18n/domain/generated-ui-translations";
import type { SiteLanguage } from "@/features/i18n/domain/site-i18n";

type TranslationTuple = readonly [string, string, string];

const LANGUAGE_INDEX: Record<SiteLanguage, number> = {
    "pt-BR": 0,
    "en-US": 1,
    "es-MX": 2,
    "es-CL": 2,
    "fr-CA": 0,
};

const TRANSLATABLE_ATTRIBUTES = ["alt", "aria-label", "placeholder", "title"] as const;
const SKIPPED_ELEMENTS = new Set(["CODE", "PRE", "SCRIPT", "STYLE"]);
const SKIPPED_TEXT_ELEMENTS = new Set([...SKIPPED_ELEMENTS, "TEXTAREA"]);
const catalog = Object.entries(GENERATED_UI_TRANSLATIONS) as [string, TranslationTuple][];

function normalize(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

function buildLookup(language: SiteLanguage) {
    const targetIndex = LANGUAGE_INDEX[language];
    const lookup = new Map<string, string>();

    for (const [source, translations] of catalog) {
        const target = translations[targetIndex];
        lookup.set(normalize(source), target);
        for (const translation of translations) {
            const normalized = normalize(translation);
            if (normalized && !lookup.has(normalized)) lookup.set(normalized, target);
        }
    }

    return lookup;
}

function preserveWhitespace(original: string, translated: string) {
    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    return `${leading}${translated}${trailing}`;
}

function shouldSkip(element: Element | null) {
    if (!element) return true;
    return SKIPPED_ELEMENTS.has(element.tagName) || Boolean(element.closest("[data-i18n-skip]"));
}

function translateTextNode(node: Text, lookup: Map<string, string>) {
    if (shouldSkip(node.parentElement) || (node.parentElement && SKIPPED_TEXT_ELEMENTS.has(node.parentElement.tagName))) return;
    const normalized = normalize(node.data);
    if (!normalized) return;
    const translated = lookup.get(normalized);
    if (translated && translated !== normalized) node.data = preserveWhitespace(node.data, translated);
}

function translateElement(element: Element, lookup: Map<string, string>) {
    if (shouldSkip(element)) return;

    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
        const current = element.getAttribute(attribute);
        if (!current) continue;
        const translated = lookup.get(normalize(current));
        if (translated && translated !== current) element.setAttribute(attribute, translated);
    }

    if (element instanceof HTMLInputElement && ["button", "reset", "submit"].includes(element.type)) {
        const translated = lookup.get(normalize(element.value));
        if (translated && translated !== element.value) element.value = translated;
    }
}

function translateTree(root: Node, lookup: Map<string, string>) {
    if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text, lookup);
        return;
    }

    if (!(root instanceof Element) && !(root instanceof DocumentFragment) && !(root instanceof Document)) return;
    if (root instanceof Element) translateElement(root, lookup);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
        if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text, lookup);
        else translateElement(current as Element, lookup);
        current = walker.nextNode();
    }
}

export function SiteTranslationProvider({ children }: { children: React.ReactNode }) {
    const { language } = useSiteLanguage();
    const languageRef = React.useRef(language);

    React.useEffect(() => {
        languageRef.current = language;
        const lookup = buildLookup(language);
        translateTree(document.body, lookup);

        const title = lookup.get(normalize(document.title));
        if (title) document.title = title;
        const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (description?.content) {
            const translated = lookup.get(normalize(description.content));
            if (translated) description.content = translated;
        }

        const observer = new MutationObserver((mutations) => {
            const currentLookup = buildLookup(languageRef.current);
            for (const mutation of mutations) {
                if (mutation.type === "characterData") translateTextNode(mutation.target as Text, currentLookup);
                if (mutation.type === "attributes") translateElement(mutation.target as Element, currentLookup);
                mutation.addedNodes.forEach((node) => translateTree(node, currentLookup));
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
            childList: true,
            characterData: true,
            subtree: true,
        });
        return () => observer.disconnect();
    }, [language]);

    return children;
}
