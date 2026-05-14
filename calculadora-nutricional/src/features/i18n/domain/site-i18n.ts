export type SiteLanguage = "pt-BR" | "en-US" | "es-MX" | "es-CL" | "fr-CA";

export const SITE_LANGUAGE_STORAGE_KEY = "soizi-site-language";
export const SITE_LANGUAGE_EXPLICIT_STORAGE_KEY = "soizi-site-language-explicit";
export const SITE_LANGUAGE_EVENT = "soizi-language-change";

export const SITE_LANGUAGES: Array<{ value: SiteLanguage; label: string; shortLabel: string; flag: string }> = [
    { value: "pt-BR", label: "Português do Brasil", shortLabel: "PT", flag: "🇧🇷" },
    { value: "en-US", label: "English (US)", shortLabel: "EN", flag: "🇺🇸" },
    { value: "es-MX", label: "Español (MX)", shortLabel: "MX", flag: "🇲🇽" },
    { value: "es-CL", label: "Español (CL)", shortLabel: "CL", flag: "🇨🇱" },
    { value: "fr-CA", label: "Français (CA)", shortLabel: "FR", flag: "🇨🇦" },
];

export const SITE_COPY = {
    "pt-BR": {
        tables: "Tabelas",
        ingredients: "Ingredientes",
        enterprise: "Enterprise",
        account: "Conta",
        myAccount: "Minha conta",
        profileSecurity: "Perfil e Segurança",
        myTables: "Minhas tabelas",
        logout: "Sair",
        language: "Idioma",
    },
    "en-US": {
        tables: "Labels",
        ingredients: "Ingredients",
        enterprise: "Enterprise",
        account: "Account",
        myAccount: "My account",
        profileSecurity: "Profile and security",
        myTables: "My labels",
        logout: "Sign out",
        language: "Language",
    },
    "es-MX": {
        tables: "Etiquetas",
        ingredients: "Ingredientes",
        enterprise: "Empresarial",
        account: "Cuenta",
        myAccount: "Mi cuenta",
        profileSecurity: "Perfil y seguridad",
        myTables: "Mis etiquetas",
        logout: "Salir",
        language: "Idioma",
    },
    "es-CL": {
        tables: "Etiquetas",
        ingredients: "Ingredientes",
        enterprise: "Empresarial",
        account: "Cuenta",
        myAccount: "Mi cuenta",
        profileSecurity: "Perfil y seguridad",
        myTables: "Mis etiquetas",
        logout: "Salir",
        language: "Idioma",
    },
    "fr-CA": {
        tables: "Étiquettes",
        ingredients: "Ingrédients",
        enterprise: "Entreprise",
        account: "Compte",
        myAccount: "Mon compte",
        profileSecurity: "Profil et sécurité",
        myTables: "Mes étiquettes",
        logout: "Déconnexion",
        language: "Langue",
    },
} satisfies Record<SiteLanguage, Record<string, string>>;

export type SiteCopyKey = keyof typeof SITE_COPY["pt-BR"];

export function isSiteLanguage(value: string | null): value is SiteLanguage {
    return SITE_LANGUAGES.some((item) => item.value === value);
}
