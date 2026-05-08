export const POPULATION_GROUPS = {
    ADULTS: "adultos",
    SPECIFIC_0_6_MONTHS: "especifico_0_6_meses",
    SPECIFIC_7_11_MONTHS: "especifico_7_11_meses",
    SPECIFIC_1_3_YEARS: "especifico_1_3_anos",
    SPECIFIC_4_8_YEARS: "especifico_4_8_anos",
    SPECIFIC_9_18_YEARS: "especifico_9_18_anos",
    SPECIFIC_19_PLUS: "especifico_19_mais",
    PREGNANT: "gestantes",
    LACTATING: "lactantes",

    // Legacy values kept to open old saved tables without losing data.
    INFANTS: "lactentes",
    CHILDREN_1_3: "criancas_1_3",
    CHILDREN_4_6: "criancas_4_6",
    CHILDREN_7_10: "criancas_7_10",
} as const;

export type PopGroup = typeof POPULATION_GROUPS[keyof typeof POPULATION_GROUPS];
export type RegulatoryScenario = "general" | "specific";

type VdrValues = {
    energy: number;
    carbs: number;
    sugarAdded?: number | null;
    protein: number;
    fatTotal: number;
    fatSat: number | null;
    fatTrans?: number | null;
    fiber: number | null;
    sodium: number;
    fatMono?: number | null;
    fatPoly?: number | null;
    omega6?: number | null;
    omega3?: number | null;
    cholesterol?: number | null;
    vitaminA?: number;
    vitaminD?: number;
    vitaminE?: number;
    vitaminK?: number;
    vitaminC?: number;
    thiamin?: number;
    riboflavin?: number;
    niacin?: number;
    vitaminB6?: number;
    biotin?: number;
    folicAcid?: number;
    pantothenicAcid?: number;
    vitaminB12?: number;
    calcium?: number;
    chloride?: number;
    copper?: number;
    chromium?: number;
    iron?: number;
    fluoride?: number;
    phosphorus?: number;
    iodine?: number;
    magnesium?: number;
    manganese?: number;
    molybdenum?: number;
    potassium?: number;
    selenium?: number;
    zinc?: number;
    choline?: number;
};

export const SPECIFIC_POPULATION_GROUPS = [
    POPULATION_GROUPS.SPECIFIC_0_6_MONTHS,
    POPULATION_GROUPS.SPECIFIC_7_11_MONTHS,
    POPULATION_GROUPS.SPECIFIC_1_3_YEARS,
    POPULATION_GROUPS.SPECIFIC_4_8_YEARS,
    POPULATION_GROUPS.SPECIFIC_9_18_YEARS,
    POPULATION_GROUPS.SPECIFIC_19_PLUS,
    POPULATION_GROUPS.PREGNANT,
    POPULATION_GROUPS.LACTATING,
] as const satisfies readonly PopGroup[];

export const POPULATION_LABELS: Record<PopGroup, string> = {
    [POPULATION_GROUPS.ADULTS]: "População geral - alimentos em geral (Anexo II)",
    [POPULATION_GROUPS.SPECIFIC_0_6_MONTHS]: "0-6 meses",
    [POPULATION_GROUPS.SPECIFIC_7_11_MONTHS]: "7-11 meses",
    [POPULATION_GROUPS.SPECIFIC_1_3_YEARS]: "1-3 anos",
    [POPULATION_GROUPS.SPECIFIC_4_8_YEARS]: "4-8 anos",
    [POPULATION_GROUPS.SPECIFIC_9_18_YEARS]: "9-18 anos",
    [POPULATION_GROUPS.SPECIFIC_19_PLUS]: ">=19 anos (adultos)",
    [POPULATION_GROUPS.PREGNANT]: "Gestantes",
    [POPULATION_GROUPS.LACTATING]: "Lactantes",
    [POPULATION_GROUPS.INFANTS]: "0-6 meses",
    [POPULATION_GROUPS.CHILDREN_1_3]: "1-3 anos",
    [POPULATION_GROUPS.CHILDREN_4_6]: "4-8 anos",
    [POPULATION_GROUPS.CHILDREN_7_10]: "9-18 anos",
};

export const SPECIFIC_POPULATION_LABELS = Object.fromEntries(
    SPECIFIC_POPULATION_GROUPS.map((group) => [group, POPULATION_LABELS[group]])
) as Record<(typeof SPECIFIC_POPULATION_GROUPS)[number], string>;

export function isSpecificPopulationGroup(group: PopGroup): boolean {
    return SPECIFIC_POPULATION_GROUPS.includes(group as (typeof SPECIFIC_POPULATION_GROUPS)[number]);
}

export function normalizePopulationGroupForScenario(scenario: RegulatoryScenario, group: PopGroup): PopGroup {
    if (scenario === "general") return POPULATION_GROUPS.ADULTS;
    if (isSpecificPopulationGroup(group)) return group;

    const legacyMap: Partial<Record<PopGroup, PopGroup>> = {
        [POPULATION_GROUPS.INFANTS]: POPULATION_GROUPS.SPECIFIC_0_6_MONTHS,
        [POPULATION_GROUPS.CHILDREN_1_3]: POPULATION_GROUPS.SPECIFIC_1_3_YEARS,
        [POPULATION_GROUPS.CHILDREN_4_6]: POPULATION_GROUPS.SPECIFIC_4_8_YEARS,
        [POPULATION_GROUPS.CHILDREN_7_10]: POPULATION_GROUPS.SPECIFIC_9_18_YEARS,
    };

    return legacyMap[group] ?? POPULATION_GROUPS.SPECIFIC_19_PLUS;
}

const GENERAL_VDR: VdrValues = {
    energy: 2000, carbs: 300, sugarAdded: 50, protein: 50, fatTotal: 65, fatSat: 20, fatTrans: 2, fiber: 25, sodium: 2000,
    fatMono: 20, fatPoly: 20, omega6: 18, omega3: 4000, cholesterol: 300,
    vitaminA: 800, vitaminD: 15, vitaminE: 15, vitaminK: 120, vitaminC: 100,
    thiamin: 1.2, riboflavin: 1.2, niacin: 15, vitaminB6: 1.3, biotin: 30, folicAcid: 400, pantothenicAcid: 5, vitaminB12: 2.4,
    calcium: 1000, chloride: 2300, copper: 900, chromium: 35, iron: 14, fluoride: 4, phosphorus: 700, iodine: 150, magnesium: 420, manganese: 3, molybdenum: 45, potassium: 3500, selenium: 60, zinc: 11, choline: 550,
};

const SPECIFIC_VDR: Record<(typeof SPECIFIC_POPULATION_GROUPS)[number], VdrValues> = {
    [POPULATION_GROUPS.SPECIFIC_0_6_MONTHS]: {
        energy: 550, carbs: 60, sugarAdded: null, protein: 9, fatTotal: 30, fatSat: null, fatTrans: null, fiber: null, sodium: 120,
        fatMono: null, fatPoly: null, omega6: null, omega3: null, cholesterol: null,
        vitaminA: 400, vitaminD: 10, vitaminE: 4, vitaminK: 2, vitaminC: 40, thiamin: 0.2, riboflavin: 0.3, niacin: 2, vitaminB6: 0.1, biotin: 5, folicAcid: 65, pantothenicAcid: 1.7, vitaminB12: 0.4,
        calcium: 200, chloride: 180, copper: 200, chromium: 0.2, iron: 0.27, fluoride: 0.01, phosphorus: 100, iodine: 110, magnesium: 30, manganese: 0.003, molybdenum: 2, potassium: 400, selenium: 15, zinc: 2, choline: 125,
    },
    [POPULATION_GROUPS.SPECIFIC_7_11_MONTHS]: {
        energy: 700, carbs: 95, sugarAdded: null, protein: 11, fatTotal: 27, fatSat: null, fatTrans: null, fiber: null, sodium: 370,
        fatMono: null, fatPoly: null, omega6: null, omega3: null, cholesterol: null,
        vitaminA: 500, vitaminD: 10, vitaminE: 5, vitaminK: 2.5, vitaminC: 50, thiamin: 0.3, riboflavin: 0.4, niacin: 4, vitaminB6: 0.3, biotin: 6, folicAcid: 80, pantothenicAcid: 1.8, vitaminB12: 0.5,
        calcium: 260, chloride: 570, copper: 220, chromium: 5.5, iron: 11, fluoride: 0.5, phosphorus: 275, iodine: 130, magnesium: 75, manganese: 0.6, molybdenum: 3, potassium: 700, selenium: 20, zinc: 3, choline: 150,
    },
    [POPULATION_GROUPS.SPECIFIC_1_3_YEARS]: {
        energy: 1000, carbs: 150, sugarAdded: 25, protein: 25, fatTotal: 33, fatSat: 11, fatTrans: 1, fiber: 19, sodium: 1000,
        fatMono: 11, fatPoly: 11, omega6: 9, omega3: 2000, cholesterol: 300,
        vitaminA: 300, vitaminD: 15, vitaminE: 6, vitaminK: 30, vitaminC: 15, thiamin: 0.5, riboflavin: 0.5, niacin: 6, vitaminB6: 0.5, biotin: 8, folicAcid: 150, pantothenicAcid: 2, vitaminB12: 0.9,
        calcium: 700, chloride: 1500, copper: 340, chromium: 11, iron: 7, fluoride: 0.7, phosphorus: 460, iodine: 90, magnesium: 80, manganese: 1.2, molybdenum: 17, potassium: 3000, selenium: 20, zinc: 3, choline: 200,
    },
    [POPULATION_GROUPS.SPECIFIC_4_8_YEARS]: {
        energy: 1500, carbs: 225, sugarAdded: 35, protein: 35, fatTotal: 50, fatSat: 16, fatTrans: 1.5, fiber: 25, sodium: 2000,
        fatMono: 16, fatPoly: 16, omega6: 13, omega3: 3000, cholesterol: 300,
        vitaminA: 400, vitaminD: 15, vitaminE: 7, vitaminK: 55, vitaminC: 25, thiamin: 0.6, riboflavin: 0.6, niacin: 8, vitaminB6: 0.6, biotin: 12, folicAcid: 200, pantothenicAcid: 3, vitaminB12: 1.2,
        calcium: 1000, chloride: 1900, copper: 440, chromium: 15, iron: 10, fluoride: 1, phosphorus: 500, iodine: 90, magnesium: 130, manganese: 1.5, molybdenum: 22, potassium: 3500, selenium: 30, zinc: 5, choline: 250,
    },
    [POPULATION_GROUPS.SPECIFIC_9_18_YEARS]: {
        energy: 2500, carbs: 375, sugarAdded: 60, protein: 60, fatTotal: 80, fatSat: 27, fatTrans: 2.5, fiber: 38, sodium: 2000,
        fatMono: 27, fatPoly: 27, omega6: 22, omega3: 5000, cholesterol: 300,
        vitaminA: 900, vitaminD: 15, vitaminE: 15, vitaminK: 75, vitaminC: 75, thiamin: 1.2, riboflavin: 1.3, niacin: 16, vitaminB6: 1.3, biotin: 25, folicAcid: 400, pantothenicAcid: 5, vitaminB12: 2.4,
        calcium: 1300, chloride: 2300, copper: 890, chromium: 35, iron: 15, fluoride: 3, phosphorus: 1250, iodine: 150, magnesium: 410, manganese: 2.2, molybdenum: 43, potassium: 3500, selenium: 55, zinc: 11, choline: 550,
    },
    [POPULATION_GROUPS.SPECIFIC_19_PLUS]: {
        ...GENERAL_VDR,
        fatTotal: 65,
        fatSat: 20,
    },
    [POPULATION_GROUPS.PREGNANT]: {
        energy: 2300, carbs: 345, sugarAdded: 55, protein: 55, fatTotal: 75, fatSat: 25, fatTrans: 2.5, fiber: 28, sodium: 2000,
        fatMono: 25, fatPoly: 25, omega6: 20, omega3: 5000, cholesterol: 300,
        vitaminA: 770, vitaminD: 15, vitaminE: 15, vitaminK: 90, vitaminC: 85, thiamin: 1.4, riboflavin: 1.4, niacin: 18, vitaminB6: 1.9, biotin: 30, folicAcid: 600, pantothenicAcid: 6, vitaminB12: 2.6,
        calcium: 1300, chloride: 2300, copper: 1000, chromium: 30, iron: 27, fluoride: 3, phosphorus: 1250, iodine: 220, magnesium: 400, manganese: 2, molybdenum: 50, potassium: 3500, selenium: 60, zinc: 12, choline: 450,
    },
    [POPULATION_GROUPS.LACTATING]: {
        energy: 2600, carbs: 360, sugarAdded: 65, protein: 65, fatTotal: 85, fatSat: 28, fatTrans: 2.5, fiber: 29, sodium: 2000,
        fatMono: 28, fatPoly: 28, omega6: 23, omega3: 5000, cholesterol: 300,
        vitaminA: 1300, vitaminD: 15, vitaminE: 15, vitaminK: 90, vitaminC: 120, thiamin: 1.4, riboflavin: 1.6, niacin: 17, vitaminB6: 2, biotin: 35, folicAcid: 500, pantothenicAcid: 7, vitaminB12: 2.8,
        calcium: 1300, chloride: 2300, copper: 1300, chromium: 45, iron: 10, fluoride: 3, phosphorus: 1250, iodine: 290, magnesium: 360, manganese: 2.6, molybdenum: 50, potassium: 3500, selenium: 70, zinc: 13, choline: 550,
    },
};

export const VDR: Record<PopGroup, VdrValues> = {
    [POPULATION_GROUPS.ADULTS]: GENERAL_VDR,
    ...SPECIFIC_VDR,
    [POPULATION_GROUPS.INFANTS]: SPECIFIC_VDR[POPULATION_GROUPS.SPECIFIC_0_6_MONTHS],
    [POPULATION_GROUPS.CHILDREN_1_3]: SPECIFIC_VDR[POPULATION_GROUPS.SPECIFIC_1_3_YEARS],
    [POPULATION_GROUPS.CHILDREN_4_6]: SPECIFIC_VDR[POPULATION_GROUPS.SPECIFIC_4_8_YEARS],
    [POPULATION_GROUPS.CHILDREN_7_10]: SPECIFIC_VDR[POPULATION_GROUPS.SPECIFIC_9_18_YEARS],
};
