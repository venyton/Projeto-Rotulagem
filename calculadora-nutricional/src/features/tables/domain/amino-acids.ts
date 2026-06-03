export type AminoAcidKey =
    | "histidine"
    | "isoleucine"
    | "leucine"
    | "lysine"
    | "methionineCysteine"
    | "phenylalanineTyrosine"
    | "threonine"
    | "tryptophan"
    | "valine";

export type AminoAcidProfileInput = Record<AminoAcidKey, string>;

export type AminoAcidProfileResult = {
    key: AminoAcidKey;
    label: string;
    referenceMgPerGProtein: number;
    inputMgPer100g: number | null;
    calculatedMgPerGProtein: number | null;
    compliant: boolean | null;
};

export const AMINO_ACID_REFERENCE_PROFILE: Array<{
    key: AminoAcidKey;
    label: string;
    referenceMgPerGProtein: number;
}> = [
    { key: "histidine", label: "Histidina", referenceMgPerGProtein: 15 },
    { key: "isoleucine", label: "Isoleucina", referenceMgPerGProtein: 30 },
    { key: "leucine", label: "Leucina", referenceMgPerGProtein: 59 },
    { key: "lysine", label: "Lisina", referenceMgPerGProtein: 45 },
    { key: "methionineCysteine", label: "Metionina + cisteína", referenceMgPerGProtein: 22 },
    { key: "phenylalanineTyrosine", label: "Fenilalanina + tirosina", referenceMgPerGProtein: 38 },
    { key: "threonine", label: "Treonina", referenceMgPerGProtein: 23 },
    { key: "tryptophan", label: "Triptofano", referenceMgPerGProtein: 6 },
    { key: "valine", label: "Valina", referenceMgPerGProtein: 39 },
];

export const EMPTY_AMINO_ACID_PROFILE_INPUT: AminoAcidProfileInput = {
    histidine: "",
    isoleucine: "",
    leucine: "",
    lysine: "",
    methionineCysteine: "",
    phenylalanineTyrosine: "",
    threonine: "",
    tryptophan: "",
    valine: "",
};

export function toAminoAcidProfileInput(value: unknown): AminoAcidProfileInput {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { ...EMPTY_AMINO_ACID_PROFILE_INPUT };
    }

    const source = value as Partial<Record<AminoAcidKey, unknown>>;
    return Object.fromEntries(
        AMINO_ACID_REFERENCE_PROFILE.map((item) => {
            const rawValue = source[item.key];
            return [item.key, typeof rawValue === "string" ? rawValue : ""];
        })
    ) as AminoAcidProfileInput;
}

export function parsePositiveNumber(value: string) {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function calculateAminoAcidProfile(
    input: AminoAcidProfileInput,
    proteinPer100g: number
): AminoAcidProfileResult[] {
    return AMINO_ACID_REFERENCE_PROFILE.map((item) => {
        const inputMgPer100g = parsePositiveNumber(input[item.key]);
        const calculatedMgPerGProtein =
            inputMgPer100g !== null && proteinPer100g > 0
                ? inputMgPer100g / proteinPer100g
                : null;

        return {
            ...item,
            inputMgPer100g,
            calculatedMgPerGProtein,
            compliant:
                calculatedMgPerGProtein === null
                    ? null
                    : calculatedMgPerGProtein >= item.referenceMgPerGProtein,
        };
    });
}

export function hasAminoAcidProfileInput(input: AminoAcidProfileInput) {
    return Object.values(input).some((value) => value.trim().length > 0);
}
