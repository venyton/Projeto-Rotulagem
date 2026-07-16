export type SiteLanguage = "pt-BR" | "en-US" | "es-MX" | "es-CL" | "fr-CA";

export const SITE_LANGUAGE_STORAGE_KEY = "soizi-site-language";
export const SITE_LANGUAGE_EXPLICIT_STORAGE_KEY = "soizi-site-language-explicit";
export const SITE_LANGUAGE_EVENT = "soizi-language-change";

export const SITE_LANGUAGES: Array<{ value: SiteLanguage; label: string; shortLabel: string; flagSrc: string; flagAlt: string }> = [
    { value: "pt-BR", label: "Português do Brasil", shortLabel: "PT", flagSrc: "/images/flags/br.svg", flagAlt: "Bandeira do Brasil" },
    { value: "en-US", label: "English", shortLabel: "EN", flagSrc: "/images/flags/us.svg", flagAlt: "United States flag" },
    { value: "es-MX", label: "Español", shortLabel: "ES", flagSrc: "/images/flags/mx.svg", flagAlt: "Bandera de México" },
    { value: "fr-CA", label: "Français", shortLabel: "FR", flagSrc: "/images/flags/ca.svg", flagAlt: "Drapeau du Canada" },
];

export const SITE_COPY = {
    "pt-BR": {
        home: "Início",
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
        home: "Home",
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
        home: "Inicio",
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
        home: "Inicio",
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
        home: "Accueil",
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
