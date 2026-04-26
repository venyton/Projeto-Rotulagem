export const HOUSEHOLD_MEASURE_CODES = {
    TABLESPOON: "TABLESPOON",
    TEASPOON: "TEASPOON",
    DESSERT_SPOON: "DESSERT_SPOON",
    COFFEE_SPOON: "COFFEE_SPOON",
    CUP: "CUP",
    GLASS: "GLASS",
    UNIT: "UNIT",
    SLICE: "SLICE",
    FRACTION: "FRACTION",
    PLATE: "PLATE",
    LADLE: "LADLE",
    POT: "POT",
    CAN: "CAN",
    BOTTLE: "BOTTLE",
    CLOVE: "CLOVE",
    PIECE: "PIECE",
    UNIT_OR_SLICE: "UNIT_OR_SLICE",
    UNIT_OR_CUP: "UNIT_OR_CUP",
    PLATE_OR_CUP: "PLATE_OR_CUP",
    OTHER: "OTHER",
} as const;

export type HouseholdMeasureCode = (typeof HOUSEHOLD_MEASURE_CODES)[keyof typeof HOUSEHOLD_MEASURE_CODES];

type HouseholdMeasureOption = {
    code: HouseholdMeasureCode;
    label: string;
    aliases: string[];
};

const OFFICIAL_MEASURE_OPTIONS: HouseholdMeasureOption[] = [
    { code: HOUSEHOLD_MEASURE_CODES.TABLESPOON, label: "Colher de sopa", aliases: ["colher de sopa", "colheres de sopa"] },
    { code: HOUSEHOLD_MEASURE_CODES.TEASPOON, label: "Colher de chá", aliases: ["colher de cha", "colheres de cha", "colher de chá", "colheres de chá"] },
    { code: HOUSEHOLD_MEASURE_CODES.DESSERT_SPOON, label: "Colher de sobremesa", aliases: ["colher de sobremesa", "colheres de sobremesa"] },
    { code: HOUSEHOLD_MEASURE_CODES.COFFEE_SPOON, label: "Colher de café", aliases: ["colher de cafe", "colheres de cafe", "colher de café", "colheres de café"] },
    { code: HOUSEHOLD_MEASURE_CODES.CUP, label: "Xícara", aliases: ["xicara", "xicaras", "xícara", "xícaras"] },
    { code: HOUSEHOLD_MEASURE_CODES.GLASS, label: "Copo", aliases: ["copo", "copos"] },
    { code: HOUSEHOLD_MEASURE_CODES.UNIT, label: "Unidade", aliases: ["unidade", "unidades"] },
    { code: HOUSEHOLD_MEASURE_CODES.SLICE, label: "Fatia", aliases: ["fatia", "fatias"] },
    { code: HOUSEHOLD_MEASURE_CODES.FRACTION, label: "Fração", aliases: ["fracao", "fracoes", "fração", "frações"] },
    { code: HOUSEHOLD_MEASURE_CODES.PLATE, label: "Prato", aliases: ["prato", "pratos"] },
    { code: HOUSEHOLD_MEASURE_CODES.LADLE, label: "Concha", aliases: ["concha", "conchas"] },
    { code: HOUSEHOLD_MEASURE_CODES.POT, label: "Pote", aliases: ["pote", "potes"] },
    { code: HOUSEHOLD_MEASURE_CODES.CAN, label: "Lata", aliases: ["lata", "latas"] },
    { code: HOUSEHOLD_MEASURE_CODES.BOTTLE, label: "Garrafa", aliases: ["garrafa", "garrafas"] },
    { code: HOUSEHOLD_MEASURE_CODES.CLOVE, label: "Dente", aliases: ["dente", "dentes"] },
    { code: HOUSEHOLD_MEASURE_CODES.PIECE, label: "Pedaço", aliases: ["pedaco", "pedacos", "pedaço", "pedaços"] },
    { code: HOUSEHOLD_MEASURE_CODES.UNIT_OR_SLICE, label: "Unidade ou fatia", aliases: ["unidade ou fatia", "unidades ou fatias"] },
    { code: HOUSEHOLD_MEASURE_CODES.UNIT_OR_CUP, label: "Unidade ou xícara", aliases: ["unidade ou xicara", "unidades ou xicaras", "unidade ou xícara", "unidades ou xícaras"] },
    { code: HOUSEHOLD_MEASURE_CODES.PLATE_OR_CUP, label: "Prato ou xícara", aliases: ["prato ou xicara", "pratos ou xicaras", "prato ou xícara", "pratos ou xícaras"] },
];

export const HOUSEHOLD_MEASURE_OPTIONS = [
    ...OFFICIAL_MEASURE_OPTIONS.map(({ code, label }) => ({ code, label })),
    { code: HOUSEHOLD_MEASURE_CODES.OTHER, label: "Outra (digitar)" },
] as const;

const MEASURE_BY_CODE = new Map(OFFICIAL_MEASURE_OPTIONS.map((item) => [item.code, item]));

const ALIAS_TO_CODE = new Map<string, HouseholdMeasureCode>();
for (const option of OFFICIAL_MEASURE_OPTIONS) {
    for (const alias of option.aliases) {
        ALIAS_TO_CODE.set(normalizeMeasure(alias), option.code);
    }
}

function normalizeMeasure(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

export function parseHouseholdMeasureValue(rawValue: string): {
    code: HouseholdMeasureCode;
    customValue: string;
} {
    const raw = rawValue?.trim() ?? "";
    if (!raw) {
        return { code: HOUSEHOLD_MEASURE_CODES.OTHER, customValue: "" };
    }

    const normalized = normalizeMeasure(raw);
    const found = ALIAS_TO_CODE.get(normalized);
    if (found) {
        return { code: found, customValue: "" };
    }

    return { code: HOUSEHOLD_MEASURE_CODES.OTHER, customValue: raw };
}

export function toHouseholdMeasureLabel(code: HouseholdMeasureCode, customValue: string) {
    if (code === HOUSEHOLD_MEASURE_CODES.OTHER) {
        return customValue.trim();
    }

    return MEASURE_BY_CODE.get(code)?.label ?? "";
}
