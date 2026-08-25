import { FOOD_GROUPS } from "./food-groups";

function greatestCommonDivisor(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
        const next = x % y;
        x = y;
        y = next;
    }
    return x || 1;
}

function toScaledInteger(value: number) {
    return Math.round(value * 10_000_000);
}

export function formatUnitFraction(portion: number, unitWeight: number) {
    if (!Number.isFinite(portion) || !Number.isFinite(unitWeight) || portion <= 0 || unitWeight <= 0) return "";

    let numerator = toScaledInteger(portion);
    let denominator = toScaledInteger(unitWeight);
    const divisor = greatestCommonDivisor(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;

    if (denominator === 1) return `${numerator} ${numerator === 1 ? "unidade" : "unidades"}`;
    if (numerator > denominator) {
        const whole = Math.floor(numerator / denominator);
        const remainder = numerator % denominator;
        return `${whole} ${remainder}/${denominator} unidade`;
    }
    return `${numerator}/${denominator} unidade`;
}

export function getIndividualPackagePortion(referencePortion: number, packageContent: number) {
    if (!Number.isFinite(referencePortion) || !Number.isFinite(packageContent) || referencePortion <= 0 || packageContent <= 0) return null;

    const useFullPackage = packageContent < referencePortion * 2;
    const portion = useFullPackage ? packageContent : referencePortion;
    return {
        portion,
        unitWeight: packageContent,
        measure: formatUnitFraction(portion, packageContent),
        useFullPackage,
    };
}

export function getOfficialProductReferencePortion(groupName: string, productName: string) {
    return FOOD_GROUPS
        .find((group) => group.group === groupName)
        ?.products.find((product) => product.name === productName)
        ?.portion ?? null;
}
