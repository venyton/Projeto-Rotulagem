import { CalculatedNutrients } from "@/features/tables/domain/nutrients";
import { AminoAcidProfileResult } from "@/features/tables/domain/amino-acids";

export type NutritionClaimStatus = "allowed" | "attention" | "blocked";

export type NutritionClaimCheck = {
    key: string;
    label: string;
    group: "Fibras alimentares" | "Proteínas" | "Sódio";
    status: NutritionClaimStatus;
    criterion: string;
    evidence: string;
    note?: string;
};

type ClaimCheckInput = {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
    portionSize: number;
    aminoAcids: AminoAcidProfileResult[];
    highSodiumFop: boolean;
};

const VDR_PROTEIN_G = 50;
const VDR_FIBER_G = 25;

function formatG(value: number) {
    return `${value.toFixed(value >= 10 ? 1 : 2).replace(".", ",")} g`;
}

function formatMg(value: number) {
    return `${Math.round(value)} mg`;
}

function statusByThreshold(value: number, threshold: number, mode: "min" | "max"): NutritionClaimStatus {
    return mode === "min"
        ? value >= threshold ? "allowed" : "blocked"
        : value <= threshold ? "allowed" : "blocked";
}

function withProteinQualityStatus(
    amountStatus: NutritionClaimStatus,
    aminoAcids: AminoAcidProfileResult[]
): { status: NutritionClaimStatus; note?: string } {
    if (amountStatus === "blocked") return { status: "blocked" };

    const filled = aminoAcids.filter((item) => item.compliant !== null);
    if (filled.length !== aminoAcids.length) {
        return {
            status: "attention",
            note: "Proteína exige perfil de aminoácidos essenciais conforme Anexo XXI.",
        };
    }

    if (filled.some((item) => item.compliant === false)) {
        return {
            status: "blocked",
            note: "Perfil de aminoácidos não atende ao Anexo XXI.",
        };
    }

    return { status: "allowed" };
}

export function checkAnnexXxNutritionClaims(input: ClaimCheckInput): NutritionClaimCheck[] {
    const fiberSourceThreshold = VDR_FIBER_G * 0.1;
    const fiberHighThreshold = VDR_FIBER_G * 0.2;
    const proteinSourceThreshold = VDR_PROTEIN_G * 0.1;
    const proteinHighThreshold = VDR_PROTEIN_G * 0.2;
    const sodiumReferenceValue = input.portionSize > 30
        ? input.perPortion.sodium
        : input.per100g.sodium / 2;
    const sodiumReferenceLabel = input.portionSize > 30
        ? "por porção de referência"
        : "por 50 g/ml";

    const proteinSourceStatus = statusByThreshold(input.perPortion.protein, proteinSourceThreshold, "min");
    const proteinHighStatus = statusByThreshold(input.perPortion.protein, proteinHighThreshold, "min");
    const proteinSource = withProteinQualityStatus(proteinSourceStatus, input.aminoAcids);
    const proteinHigh = withProteinQualityStatus(proteinHighStatus, input.aminoAcids);
    const lowSodiumAmountStatus = statusByThreshold(sodiumReferenceValue, 80, "max");
    const lowSodiumStatus = input.highSodiumFop || lowSodiumAmountStatus === "blocked" ? "blocked" : "allowed";
    const veryLowSodiumAmountStatus = statusByThreshold(sodiumReferenceValue, 40, "max");
    const veryLowSodiumStatus = input.highSodiumFop || veryLowSodiumAmountStatus === "blocked" ? "blocked" : "allowed";
    const noSodiumStatus =
        input.perPortion.sodium <= 5 && input.per100g.sodium <= 5 && !input.highSodiumFop ? "allowed" : "blocked";

    return [
        {
            key: "fiber-source",
            label: "Fonte de fibras",
            group: "Fibras alimentares",
            status: statusByThreshold(input.perPortion.fiber, fiberSourceThreshold, "min"),
            criterion: `mín. ${formatG(fiberSourceThreshold)} por porção (10% VDR).`,
            evidence: `${formatG(input.perPortion.fiber)} de fibras por porção.`,
            note: "Não declarar alegação para fibra alimentar específica.",
        },
        {
            key: "fiber-high",
            label: "Alto conteúdo / rico em fibras",
            group: "Fibras alimentares",
            status: statusByThreshold(input.perPortion.fiber, fiberHighThreshold, "min"),
            criterion: `mín. ${formatG(fiberHighThreshold)} por porção (20% VDR).`,
            evidence: `${formatG(input.perPortion.fiber)} de fibras por porção.`,
            note: "Não declarar alegação para fibra alimentar específica.",
        },
        {
            key: "protein-source",
            label: "Fonte de proteínas",
            group: "Proteínas",
            status: proteinSource.status,
            criterion: `mín. ${formatG(proteinSourceThreshold)} por porção (10% VDR) e Anexo XXI.`,
            evidence: `${formatG(input.perPortion.protein)} de proteínas por porção.`,
            note: proteinSource.note,
        },
        {
            key: "protein-high",
            label: "Alto conteúdo / rico em proteínas",
            group: "Proteínas",
            status: proteinHigh.status,
            criterion: `mín. ${formatG(proteinHighThreshold)} por porção (20% VDR) e Anexo XXI.`,
            evidence: `${formatG(input.perPortion.protein)} de proteínas por porção.`,
            note: proteinHigh.note,
        },
        {
            key: "sodium-low",
            label: "Baixo em sódio",
            group: "Sódio",
            status: lowSodiumStatus,
            criterion: `máx. 80 mg ${sodiumReferenceLabel} e sem gatilho de lupa para sódio.`,
            evidence: `${formatMg(sodiumReferenceValue)} ${sodiumReferenceLabel}; ${formatMg(input.per100g.sodium)} por 100 g/ml.`,
            note: input.highSodiumFop ? "Produto aciona rotulagem frontal de sódio." : undefined,
        },
        {
            key: "sodium-very-low",
            label: "Muito baixo em sódio",
            group: "Sódio",
            status: veryLowSodiumStatus,
            criterion: `máx. 40 mg ${sodiumReferenceLabel} e sem gatilho de lupa para sódio.`,
            evidence: `${formatMg(sodiumReferenceValue)} ${sodiumReferenceLabel}; ${formatMg(input.per100g.sodium)} por 100 g/ml.`,
            note: input.highSodiumFop ? "Produto aciona rotulagem frontal de sódio." : undefined,
        },
        {
            key: "sodium-free",
            label: "Não contém sódio",
            group: "Sódio",
            status: noSodiumStatus,
            criterion: "máx. 5 mg por porção e por 100 g/ml, sem gatilho de lupa para sódio.",
            evidence: `${formatMg(input.perPortion.sodium)} por porção; ${formatMg(input.per100g.sodium)} por 100 g/ml.`,
            note: input.highSodiumFop ? "Produto aciona rotulagem frontal de sódio." : undefined,
        },
    ];
}
