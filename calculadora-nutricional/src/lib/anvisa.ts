/**
 * Rules from IN 75/2020 ANVISA
 */

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

export function checkFOP(per100g: { sugarAdded: number, fatSat: number, sodium: number }): {
    highSugar: boolean;
    highFat: boolean;
    highSodium: boolean;
} {
    // Limits per 100g (Solids) - Assuming solid food for now. Liquids have different limits (7.5g sugar, 3g fat, 300mg sodium)
    // NOTE: The user prompt asked for specific limits:
    // Sugar Added >= 15g
    // Fat Sat >= 6g
    // Sodium >= 600mg
    // These match SOLID food limits. I will use these.

    return {
        highSugar: per100g.sugarAdded >= 15,
        highFat: per100g.fatSat >= 6,
        highSodium: per100g.sodium >= 600,
    };
}
