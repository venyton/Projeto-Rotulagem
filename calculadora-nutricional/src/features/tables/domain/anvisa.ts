/**
 * Rules from IN 75/2020 ANVISA
 */

export type FOPFoodType = "solid" | "liquid";

export function roundEnergy(val: number): string {
    if (val < 5) return "0";
    if (val <= 50) return (Math.round(val / 5) * 5).toString();
    return (Math.round(val / 10) * 10).toString();
}

export function roundMacro(val: number): string {
    // Carbs, Protein, Total Fat, Fiber
    if (val < 0.5) return "0";
    if (val < 1) return "< 1"; // Or "menor que 1g", usually "< 1" fits table better? Standard implies "0,X" not used?
    // Rule: "0,5 a 1 -> 'menor que 1 g' ou '< 1 g'"
    // > 1 -> 1 decimal place?
    // "Acima de 1 g: declarar com uma casa decimal"
    return val.toFixed(1).replace('.', ',');
}

export function roundSaturatedTrans(val: number): string {
    if (val < 0.1) return "0";
    // ">= 0.1: declarar com uma casa decimal"
    return val.toFixed(1).replace('.', ',');
}

export function roundSugars(val: number): string {
    if (val < 0.5) return "0";
    return val.toFixed(1).replace('.', ',');
}

export function roundSodium(val: number): string {
    if (val < 5) return "0";
    if (val <= 140) return (Math.round(val / 5) * 5).toString();
    return (Math.round(val / 10) * 10).toString();
}

export function calculateVD(val: number, vdr: number | null): string {
    if (vdr === null || vdr === 0) return "-";
    const pct = (val / vdr) * 100;
    // Rule: "Arredondar para inteiro mais próximo"
    // Usually < 1% is "0"? Or just round? 
    // Standard practice: < 1 -> 0? Or just round. Math.round(0.4) = 0.
    return Math.round(pct).toString();
}

export function inferFopFoodType(householdMeasure?: string): FOPFoodType {
    const measure = (householdMeasure || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Heuristic used only when explicit product classification is unavailable.
    // If no liquid indicator is detected, keep default as "solid" (safer by current data model).
    const liquidHints = [
        "ml",
        "mililitro",
        "mililitros",
        "litro",
        "litros",
        "copo",
        "copos",
        "xicara",
        "xicaras",
        "xic.",
        "cha",
        "suco",
        "bebida",
    ];

    return liquidHints.some((hint) => measure.includes(hint)) ? "liquid" : "solid";
}

export function checkFOP(
    perReference: { sugarAdded: number, fatSat: number, sodium: number },
    foodType: FOPFoodType = "solid"
): {
    highSugar: boolean;
    highFat: boolean;
    highSodium: boolean;
} {
    // IN 75/2020 - Anexo XV:
    // Solids/Semisolid (por 100 g): sugar 15 g, sat fat 6 g, sodium 600 mg
    // Liquids (por 100 ml): sugar 7.5 g, sat fat 3 g, sodium 300 mg
    const limits = foodType === "liquid"
        ? { sugarAdded: 7.5, fatSat: 3, sodium: 300 }
        : { sugarAdded: 15, fatSat: 6, sodium: 600 };

    return {
        highSugar: perReference.sugarAdded >= limits.sugarAdded,
        highFat: perReference.fatSat >= limits.fatSat,
        highSodium: perReference.sodium >= limits.sodium,
    };
}
