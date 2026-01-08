export const POPULATION_GROUPS = {
    ADULTS: "adultos",
    PREGNANT: "gestantes",
    LACTATING: "lactantes",
    INFANTS: "lactentes", // 0-12 months? Prompt says "Lactentes"
    CHILDREN_1_3: "criancas_1_3",
    CHILDREN_4_6: "criancas_4_6",
    CHILDREN_7_10: "criancas_7_10",
} as const;

export type PopGroup = typeof POPULATION_GROUPS[keyof typeof POPULATION_GROUPS];

export const POPULATION_LABELS: Record<PopGroup, string> = {
    [POPULATION_GROUPS.ADULTS]: "Adultos",
    [POPULATION_GROUPS.PREGNANT]: "Gestantes",
    [POPULATION_GROUPS.LACTATING]: "Lactantes",
    [POPULATION_GROUPS.INFANTS]: "Lactentes (0-12 meses)",
    [POPULATION_GROUPS.CHILDREN_1_3]: "Crianças (1-3 anos)",
    [POPULATION_GROUPS.CHILDREN_4_6]: "Crianças (4-6 anos)",
    [POPULATION_GROUPS.CHILDREN_7_10]: "Crianças (7-10 anos)",
};

// VDR (Valor Diário de Referência)
// Null means no established VDR or not applicable
export const VDR: Record<PopGroup, {
    energy: number;
    carbs: number;
    protein: number;
    fatTotal: number;
    fatSat: number | null;
    fiber: number | null;
    sodium: number;
}> = {
    [POPULATION_GROUPS.ADULTS]: { energy: 2000, carbs: 300, protein: 50, fatTotal: 55, fatSat: 22, fiber: 25, sodium: 2000 },
    [POPULATION_GROUPS.PREGNANT]: { energy: 2150, carbs: 300, protein: 71, fatTotal: 55, fatSat: 22, fiber: 28, sodium: 2000 },
    [POPULATION_GROUPS.LACTATING]: { energy: 2350, carbs: 300, protein: 71, fatTotal: 55, fatSat: 22, fiber: 29, sodium: 2000 },
    [POPULATION_GROUPS.INFANTS]: { energy: 570, carbs: 60, protein: 11, fatTotal: 30, fatSat: null, fiber: null, sodium: 370 },
    [POPULATION_GROUPS.CHILDREN_1_3]: { energy: 1050, carbs: 130, protein: 13, fatTotal: 35, fatSat: 11.6, fiber: 19, sodium: 800 },
    [POPULATION_GROUPS.CHILDREN_4_6]: { energy: 1350, carbs: 175, protein: 19, fatTotal: 45, fatSat: 15, fiber: 22, sodium: 1200 },
    [POPULATION_GROUPS.CHILDREN_7_10]: { energy: 1750, carbs: 225, protein: 28, fatTotal: 58, fatSat: 19.5, fiber: 25, sodium: 1600 },
};
