import React from "react";
import { cn } from "@/lib/utils";
import { MICRONUTRIENTS } from "@/features/tables/domain/micronutrients";
import { POPULATION_GROUPS, POPULATION_LABELS, PopGroup, VDR } from "@/features/tables/domain/constants";
import { CalculatedNutrients } from "@/features/tables/domain/nutrients";
import { MagnifyingGlassLabel } from "./MagnifyingGlassLabel";
import { 
    roundEnergy, 
    roundMacro, 
    roundSaturatedTrans, 
    roundSodium, 
    roundSugars,
    calculateVD
} from "@/features/tables/domain/anvisa";

export interface NutritionalLabelProps {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
    portionSize: number;
    householdMeasure: string;
    servingsPerPackage?: string;
    popGroup: PopGroup;
    selectedNutrients: string[];
    extraConstituents?: Array<{
        name: string;
        amount: string;
        unit: string;
    }>;
    showDailyValue?: boolean;
    fop?: {
        highSugar: boolean;
        highFat: boolean;
        highSodium: boolean;
    };
    previewType?: string;
    id?: string;
}

const getSafeVD = (value: number, vdr?: number | null) => {
    return calculateVD(value || 0, vdr || null);
};

const getZeroWhenNoVd = (value: number, vdr?: number | null) => {
    const vd = calculateVD(value || 0, vdr ?? null);
    return vd === "-" ? "0" : vd;
};

type NutrientKey = keyof CalculatedNutrients;
type VdrValues = (typeof VDR)[PopGroup];
type VdrKey = keyof VdrValues;
type IndentLevel = 0 | 1 | 2;
const DEFAULT_VD_SUGAR_ADDED = 50;
const DEFAULT_VD_FAT_TRANS = 2;

const getNutrientValue = (nutrients: CalculatedNutrients, key: NutrientKey) => nutrients[key] || 0;

const getVdrValue = (vdr: VdrValues, key: NutrientKey): number | null | undefined => {
    if (key in vdr) {
        return vdr[key as VdrKey] as number | null | undefined;
    }
    return undefined;
};

const getVdReference = (vdr: VdrValues, key: NutrientKey) => {
    if (key === "sugarAdded") {
        const ref = getVdrValue(vdr, key);
        return ref !== undefined ? ref : DEFAULT_VD_SUGAR_ADDED;
    }
    if (key === "fatTrans") {
        const ref = getVdrValue(vdr, key);
        return ref !== undefined ? ref : DEFAULT_VD_FAT_TRANS;
    }
    return getVdrValue(vdr, key) ?? null;
};

const getIndentClass = (indentLevel: IndentLevel = 0) => {
    if (indentLevel === 2) return "pl-6";
    if (indentLevel === 1) return "pl-3";
    return "";
};

const Row4 = ({ label, v1, v2, v3, indentLevel }: { label: string; v1: string; v2: string; v3: string; indentLevel?: IndentLevel }) => (
    <tr className="border-b text-[11px]" style={{ borderColor: "#000000" }}>
        <td className={cn("py-[3px] pr-2 leading-tight", getIndentClass(indentLevel))}>{label}</td>
        <td className="py-[3px] px-2 text-center">{v1}</td>
        <td className="py-[3px] px-2 text-center">{v2}</td>
        <td className="py-[3px] px-2 text-center">{v3}</td>
    </tr>
);

const Row3 = ({ label, v1, v2, indentLevel }: { label: string; v1: string; v2: string; indentLevel?: IndentLevel }) => (
    <tr className="border-b text-[11px]" style={{ borderColor: "#000000" }}>
        <td className={cn("py-[3px] pr-2 leading-tight", getIndentClass(indentLevel))}>{label}</td>
        <td className="py-[3px] px-2 text-center">{v1}</td>
        <td className="py-[3px] px-2 text-center">{v2}</td>
    </tr>
);

const Row2 = ({ label, v1, indentLevel }: { label: string; v1: string; indentLevel?: IndentLevel }) => (
    <tr className="border-b text-[11px]" style={{ borderColor: "#000000" }}>
        <td className={cn("py-[3px] pr-2 leading-tight", getIndentClass(indentLevel))}>{label}</td>
        <td className="py-[3px] px-2 text-center">{v1}</td>
    </tr>
);

const RowBase = ({
    row,
    variant,
    showDailyValue = true,
}: {
    row: {
        label: string;
        per100: string;
        portion: string;
        vdPortion: string;
        vd100: string;
        indentLevel?: IndentLevel;
    };
    variant: "full" | "portion-vd" | "per100-vd" | "per100-only";
    showDailyValue?: boolean;
}) => {
    if (variant === "portion-vd") {
        return showDailyValue
            ? <Row3 label={row.label} v1={row.portion} v2={row.vdPortion} indentLevel={row.indentLevel} />
            : <Row2 label={row.label} v1={row.portion} indentLevel={row.indentLevel} />;
    }
    if (variant === "per100-vd") {
        return showDailyValue
            ? <Row3 label={row.label} v1={row.per100} v2={row.vd100} indentLevel={row.indentLevel} />
            : <Row2 label={row.label} v1={row.per100} indentLevel={row.indentLevel} />;
    }
    if (variant === "per100-only") {
        return <Row2 label={row.label} v1={row.per100} indentLevel={row.indentLevel} />;
    }
    if (!showDailyValue) {
        return <Row3 label={row.label} v1={row.per100} v2={row.portion} indentLevel={row.indentLevel} />;
    }
    return <Row4 label={row.label} v1={row.per100} v2={row.portion} v3={row.vdPortion} indentLevel={row.indentLevel} />;
};

export const NutritionalLabel: React.FC<NutritionalLabelProps> = ({
    per100g,
    perPortion,
    portionSize,
    householdMeasure,
    servingsPerPackage,
    popGroup,
    selectedNutrients,
    extraConstituents = [],
    showDailyValue = true,
    fop,
    previewType = "VERT",
    id = "nutrition-label-container",
}) => {
    const vdr = VDR[popGroup] || VDR[POPULATION_GROUPS.ADULTS];
    const adultsVdr = VDR[POPULATION_GROUPS.ADULTS];
    const firstGroupLabel = POPULATION_LABELS[popGroup] || POPULATION_LABELS[POPULATION_GROUPS.ADULTS];
    const secondGroupLabel = POPULATION_LABELS[POPULATION_GROUPS.ADULTS];

    type BaseRow = {
        label: string;
        nutrientKey: NutrientKey;
        per100: string;
        portion: string;
        vdPortion: string;
        vd100: string;
        indentLevel?: IndentLevel;
    };

    const baseRows: BaseRow[] = [
        { 
            label: "Valor energético (kcal)", 
            nutrientKey: "energy" as NutrientKey,
            per100: roundEnergy(per100g.energy || 0).replace(".", ","), 
            portion: roundEnergy(perPortion.energy || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.energy || 0, vdr.energy), 
            vd100: getSafeVD(per100g.energy || 0, vdr.energy)
        },
        { 
            label: "Carboidratos (g)", 
            nutrientKey: "carbs" as NutrientKey,
            per100: roundMacro(per100g.carbs || 0).replace(".", ","), 
            portion: roundMacro(perPortion.carbs || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.carbs || 0, vdr.carbs), 
            vd100: getSafeVD(per100g.carbs || 0, vdr.carbs)
        },
        { 
            label: "Açúcares totais (g)", 
            nutrientKey: "sugarTotal" as NutrientKey,
            per100: roundSugars(per100g.sugarTotal || 0).replace(".", ","), 
            portion: roundSugars(perPortion.sugarTotal || 0).replace(".", ","), 
            vdPortion: "", 
            vd100: "", 
            indentLevel: 1
        },
        { 
            label: "Açúcares adicionados (g)", 
            nutrientKey: "sugarAdded" as NutrientKey,
            per100: roundSugars(per100g.sugarAdded || 0).replace(".", ","), 
            portion: roundSugars(perPortion.sugarAdded || 0).replace(".", ","), 
            vdPortion: getZeroWhenNoVd(perPortion.sugarAdded || 0, getVdReference(vdr, "sugarAdded")), 
            vd100: getZeroWhenNoVd(per100g.sugarAdded || 0, getVdReference(vdr, "sugarAdded")), 
            indentLevel: 2
        },
        { 
            label: "Proteínas (g)", 
            nutrientKey: "protein" as NutrientKey,
            per100: roundMacro(per100g.protein || 0).replace(".", ","), 
            portion: roundMacro(perPortion.protein || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.protein || 0, vdr.protein), 
            vd100: getSafeVD(per100g.protein || 0, vdr.protein)
        },
        { 
            label: "Gorduras totais (g)", 
            nutrientKey: "fatTotal" as NutrientKey,
            per100: roundMacro(per100g.fatTotal || 0).replace(".", ","), 
            portion: roundMacro(perPortion.fatTotal || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.fatTotal || 0, vdr.fatTotal), 
            vd100: getSafeVD(per100g.fatTotal || 0, vdr.fatTotal)
        },
        { 
            label: "Gorduras saturadas (g)", 
            nutrientKey: "fatSat" as NutrientKey,
            per100: roundSaturatedTrans(per100g.fatSat || 0).replace(".", ","), 
            portion: roundSaturatedTrans(perPortion.fatSat || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.fatSat || 0, vdr.fatSat), 
            vd100: getSafeVD(per100g.fatSat || 0, vdr.fatSat), 
            indentLevel: 1
        },
        { 
            label: "Gorduras trans (g)", 
            nutrientKey: "fatTrans" as NutrientKey,
            per100: roundSaturatedTrans(per100g.fatTrans || 0).replace(".", ","), 
            portion: roundSaturatedTrans(perPortion.fatTrans || 0).replace(".", ","), 
            vdPortion: getZeroWhenNoVd(perPortion.fatTrans || 0, getVdReference(vdr, "fatTrans")), 
            vd100: getZeroWhenNoVd(per100g.fatTrans || 0, getVdReference(vdr, "fatTrans")), 
            indentLevel: 1
        },
        { 
            label: "Fibras alimentares (g)", 
            nutrientKey: "fiber" as NutrientKey,
            per100: roundMacro(per100g.fiber || 0).replace(".", ","), 
            portion: roundMacro(perPortion.fiber || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.fiber || 0, vdr.fiber), 
            vd100: getSafeVD(per100g.fiber || 0, vdr.fiber)
        },
        { 
            label: "Sódio (mg)", 
            nutrientKey: "sodium" as NutrientKey,
            per100: roundSodium(per100g.sodium || 0).replace(".", ","), 
            portion: roundSodium(perPortion.sodium || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.sodium || 0, vdr.sodium), 
            vd100: getSafeVD(per100g.sodium || 0, vdr.sodium)
        },
    ];

    MICRONUTRIENTS.forEach((m) => {
        if (selectedNutrients.includes(m.name)) {
            const nutrientKey = m.name as NutrientKey;
            const val100 = getNutrientValue(per100g, nutrientKey);
            const valPortion = getNutrientValue(perPortion, nutrientKey);
            const ref = getVdrValue(vdr, nutrientKey);
            
            const format = (v: number) => {
                if (v === 0) return "0";
                if (v < 1) return v.toFixed(1).replace(".", ",");
                return Math.round(v).toString();
            };

            baseRows.push({
                label: `${m.label} (${m.unit})`,
                nutrientKey,
                per100: format(val100),
                portion: format(valPortion),
                vdPortion: getSafeVD(valPortion, ref),
                vd100: getSafeVD(val100, ref)
            });
        }
    });

    extraConstituents
        .filter((item) => item.name.trim() && item.amount.trim())
        .forEach((item) => {
            const formattedAmount = `${item.amount.trim()}${item.unit.trim() ? ` ${item.unit.trim()}` : ""}`;
            baseRows.push({
                label: item.name.trim(),
                nutrientKey: "energy",
                per100: "-",
                portion: formattedAmount,
                vdPortion: "",
                vd100: "",
            });
        });

    if (!showDailyValue) {
        baseRows.forEach((row) => {
            row.vdPortion = "";
            row.vd100 = "";
        });
    }

    const isLinearPreview = previewType === "LINEAR";
    const portionHeader = `${portionSize} g`;
    const servingsHeader = servingsPerPackage?.trim() || "-";
    const declarationSeparatorStyle = { borderTop: "4px solid #000000" };
    const linearBase = showDailyValue ? `Por 100 g ou ml (${portionHeader}, % VD*):` : `Por 100 g ou ml (${portionHeader}):`;
    const linearText = baseRows
        .map((r) => {
            const vd = showDailyValue && r.vdPortion ? `, ${r.vdPortion}%` : "";
            return `${r.label} ${r.per100} (${r.portion}${vd})`;
        })
        .join(" ● ");
    const sideHeaderTypes = ["HORIZ", "HORIZ-QUEB", "AGREGADO", "SUPLEM-POP"];
    const hasSideHeader = sideHeaderTypes.includes(previewType);
    const hasServingBlock = !hasSideHeader && previewType !== "B2B";
    const hasFootnote = previewType !== "B2B";
    const simplifiedAbsentText =
        "Não contém quantidades significativas de valor energético, açúcares totais, açúcares adicionados, proteínas, gorduras totais, gorduras saturadas, gorduras trans, fibras alimentares e sódio.";
    const sideHeader = (
        <div className="text-[11px] leading-tight">
            <div className="inline-block border-b-[4px] pb-1 font-bold leading-tight" style={{ borderColor: "#000000" }}>
                INFORMAÇÃO<br />NUTRICIONAL
            </div>
            <div className="mt-3">Porções por emb.:</div>
            <div>{servingsHeader}</div>
            <div className="mt-2">Porção: {portionHeader}</div>
            <div>({householdMeasure})</div>
        </div>
    );

    return (
        <div
            className={cn(
                "max-w-[64rem]",
                isLinearPreview ? "inline-block w-[88mm] min-w-0 max-w-full" : "inline-block w-fit min-w-[22rem]"
            )}
            id={id}
            style={{ color: "#000000", fontFamily: "Arial, Helvetica, sans-serif" }}
        >
            <style dangerouslySetInnerHTML={{ __html: `
              #${id} td, #${id} th, #${id} p, #${id} span, #${id} div, #${id} h1, #${id} h2, #${id} h3 {
                white-space: nowrap !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
              }
              #${id} td,
              #${id} th {
                vertical-align: middle !important;
                line-height: 1.15 !important;
                padding-top: 2px !important;
                padding-bottom: 2px !important;
              }
              #${id} table th + th,
              #${id} table td + td {
                border-left: 1px solid #000000 !important;
              }
              #${id} .linear-preview-content {
                white-space: normal !important;
                overflow-wrap: anywhere !important;
                word-break: break-word !important;
              }
              #${id} .nutrition-wrap-cell {
                white-space: normal !important;
                overflow-wrap: anywhere !important;
                word-break: normal !important;
              }
            `}} />
            <div
                className={cn(isLinearPreview ? "w-full border p-[4px]" : "border-2 p-4")}
                style={{ backgroundColor: "#ffffff", borderColor: "#000000" }}
            >
            {!hasSideHeader && (
                <h2 className={cn(isLinearPreview ? "text-[8pt] text-left" : "text-[13px] text-center", "font-bold")} style={{ margin: 0, paddingBottom: "3px", borderBottom: "1px solid #000000" }}>
                    INFORMAÇÃO NUTRICIONAL
                </h2>
            )}
            {hasServingBlock && (
                <div className={cn(isLinearPreview ? "my-[4px] text-[6pt]" : "mt-2 mb-2 text-[11px]", "text-left leading-tight")}>
                    {previewType === "VERT-QUEB" ? (
                        <p style={{ margin: 0 }}>Porções por embalagem: {servingsHeader} ● Porção: {portionHeader} ({householdMeasure})</p>
                    ) : (
                        <>
                            <p style={{ margin: 0 }}>Porções por embalagem: {servingsHeader}</p>
                            <p style={{ margin: 0 }}>Porção: {portionHeader} ({householdMeasure})</p>
                        </>
                    )}
                </div>
            )}

            {previewType === "LINEAR" ? (
                <div className="linear-preview-content w-full pt-[4px] text-left text-[6pt] leading-[1.08]" style={declarationSeparatorStyle}>
                    <strong>{linearBase}</strong> {linearText}
                </div>
            ) : previewType === "SIMPLIF" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                            </tr>
                        </thead>
                        <tbody>
                            <RowBase row={baseRows[1]} variant="full" showDailyValue={showDailyValue} />
                            <tr className="border-b text-[11px]" style={{ borderColor: "#000000" }}>
                                <td className="nutrition-wrap-cell py-[3px] leading-[1.2]" colSpan={showDailyValue ? 4 : 3}>
                                    {simplifiedAbsentText}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : previewType === "VERT-QUEB" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 5 }).map((_, idx) => {
                                const left = baseRows[idx];
                                const right = baseRows[idx + 5];
                                return (
                                    <tr key={`vert-queb-${idx}`} className="border-b text-[11px]" style={{ borderColor: "#000000" }}>
                                        <td className={cn("py-[3px] pr-2 leading-tight", getIndentClass(left?.indentLevel))}>{left?.label ?? ""}</td>
                                        <td className="py-[3px] px-2 text-center">{left?.per100 ?? ""}</td>
                                        <td className="py-[3px] px-2 text-center">{left?.portion ?? ""}</td>
                                        {showDailyValue && <td className="py-[3px] px-2 text-center">{left?.vdPortion ?? ""}</td>}
                                        <td className={cn("py-[3px] pr-2 leading-tight", getIndentClass(right?.indentLevel))}>{right?.label ?? ""}</td>
                                        <td className="py-[3px] px-2 text-center">{right?.per100 ?? ""}</td>
                                        <td className="py-[3px] px-2 text-center">{right?.portion ?? ""}</td>
                                        {showDailyValue && <td className="py-[3px] px-2 text-center">{right?.vdPortion ?? ""}</td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "HORIZ-QUEB" ? (
                <div className="grid grid-cols-[10rem_auto] items-start gap-3">
                    {sideHeader}
                    <div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                    <th className="py-[3px] text-left"></th>
                                    <th className="py-[3px] px-2 text-center">100 g</th>
                                    <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                    {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                                    <th className="py-[3px] text-left"></th>
                                    <th className="py-[3px] px-2 text-center">100 g</th>
                                    <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                    {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 5 }).map((_, idx) => {
                                    const left = baseRows[idx];
                                    const right = baseRows[idx + 5];
                                    return (
                                        <tr key={`horiz-queb-${idx}`} className="border-b text-[11px]" style={{ borderColor: "#000000" }}>
                                            <td className={cn("py-[3px] pr-2 leading-tight", getIndentClass(left?.indentLevel))}>{left?.label ?? ""}</td>
                                            <td className="py-[3px] px-2 text-center">{left?.per100 ?? ""}</td>
                                            <td className="py-[3px] px-2 text-center">{left?.portion ?? ""}</td>
                                            {showDailyValue && <td className="py-[3px] px-2 text-center">{left?.vdPortion ?? ""}</td>}
                                            <td className={cn("py-[3px] pr-2 leading-tight", getIndentClass(right?.indentLevel))}>{right?.label ?? ""}</td>
                                            <td className="py-[3px] px-2 text-center">{right?.per100 ?? ""}</td>
                                            <td className="py-[3px] px-2 text-center">{right?.portion ?? ""}</td>
                                            {showDailyValue && <td className="py-[3px] px-2 text-center">{right?.vdPortion ?? ""}</td>}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : previewType === "B2B" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row2 key={`b2b-${row.label}`} label={row.label} v1={row.per100} indentLevel={row.indentLevel} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "100" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <RowBase key={`100-${row.label}`} row={row} variant="per100-vd" showDailyValue={showDailyValue} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "SUPLEM" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <RowBase key={`sup-${row.label}`} row={row} variant="portion-vd" showDailyValue={showDailyValue} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "ADICAO" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g**</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <RowBase key={`adicao-${row.label}`} row={row} variant="full" showDailyValue={showDailyValue} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "AGREGADO" ? (
                <div className="grid grid-cols-[10rem_auto] items-start gap-3">
                    <div className="text-[11px] leading-tight">
                        <div className="inline-block border-b-[4px] pb-1 font-bold leading-tight" style={{ borderColor: "#000000" }}>
                            INFORMAÇÃO<br />NUTRICIONAL
                        </div>
                    </div>
                    <table className="w-full border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b align-top" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-left" colSpan={3}>
                                    <strong>Produto 1</strong><br />
                                    Porções por emb.: {servingsHeader}<br />
                                    Porção: {portionHeader} ({householdMeasure})
                                </th>
                                <th className="py-[3px] px-2 text-left" colSpan={3}>
                                    <strong>Produto 2</strong><br />
                                    Porções por emb.: {servingsHeader}<br />
                                    Porção: {portionHeader} ({householdMeasure})
                                </th>
                            </tr>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <tr key={`agg-${row.label}`} className="border-b" style={{ borderColor: "#000000" }}>
                                    <td className={cn("py-[3px] pr-2", getIndentClass(row.indentLevel))}>{row.label}</td>
                                    <td className="py-[3px] px-2 text-center">{row.per100}</td>
                                    <td className="py-[3px] px-2 text-center">{row.portion}</td>
                                    {showDailyValue && <td className="py-[3px] px-2 text-center">{row.vdPortion}</td>}
                                    <td className="py-[3px] px-2 text-center">{row.per100}</td>
                                    <td className="py-[3px] px-2 text-center">{row.portion}</td>
                                    {showDailyValue && <td className="py-[3px] px-2 text-center">{row.vdPortion}</td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "SUPLEM-POP" ? (
                <div className="grid grid-cols-[10rem_auto] items-start gap-3">
                    <div className="text-[11px] leading-tight">
                        <div className="inline-block border-b-[4px] pb-1 font-bold leading-tight" style={{ borderColor: "#000000" }}>
                            INFORMAÇÃO<br />NUTRICIONAL
                        </div>
                    </div>
                    <table className="w-full border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b align-top" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-left" colSpan={2}>
                                    <strong>{firstGroupLabel}</strong><br />
                                    Porções por emb.: {servingsHeader}<br />
                                    Porção: {portionHeader} ({householdMeasure})
                                </th>
                                <th className="py-[3px] px-2 text-left" colSpan={2}>
                                    <strong>{secondGroupLabel}</strong><br />
                                    Porções por emb.: {servingsHeader}<br />
                                    Porção: {portionHeader} ({householdMeasure})
                                </th>
                            </tr>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <tr key={`pop-${row.label}`} className="border-b" style={{ borderColor: "#000000" }}>
                                    <td className={cn("py-[3px] pr-2", getIndentClass(row.indentLevel))}>{row.label}</td>
                                    <td className="py-[3px] px-2 text-center">{row.portion}</td>
                                    {showDailyValue && <td className="py-[3px] px-2 text-center">{row.vdPortion}</td>}
                                    <td className="py-[3px] px-2 text-center">{row.portion}</td>
                                    {showDailyValue && (
                                        <td className="py-[3px] px-2 text-center">
                                            {getSafeVD(getNutrientValue(perPortion, row.nutrientKey), getVdReference(adultsVdr, row.nutrientKey))}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "HORIZ" ? (
                <div>
                    <div className="grid grid-cols-[10rem_auto] gap-3 items-start">
                        {sideHeader}
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                    <th className="py-[3px] text-left font-bold"></th>
                                    <th className="py-[3px] px-2 text-center font-bold whitespace-nowrap">100 g</th>
                                    <th className="py-[3px] px-2 text-center font-bold whitespace-nowrap">{portionHeader}</th>
                                    {showDailyValue && <th className="py-[3px] px-2 text-center font-bold whitespace-nowrap">% VD*</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {baseRows.map((row) => (
                                    <RowBase key={`horiz-${row.label}`} row={row} variant="full" showDailyValue={showDailyValue} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                {showDailyValue && <th className="py-[3px] px-2 text-center">% VD*</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <RowBase key={`vert-${row.label}`} row={row} variant="full" showDailyValue={showDailyValue} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {hasFootnote && showDailyValue && (
                <div
                    className={cn(
                        "text-left",
                        isLinearPreview ? "mt-[3px] border-t pt-[2px] text-[6pt] leading-[1.05]" : "mt-4 text-[8px]"
                    )}
                    style={isLinearPreview ? { borderColor: "#000000" } : undefined}
                >
                    <p style={{ margin: 0 }}>* Percentual de valores diários fornecidos pela porção.</p>
                    {previewType === "ADICAO" && <p style={{ margin: 0 }}>** No alimento pronto para o consumo.</p>}
                </div>
            )}
            </div>

            {fop && (fop.highSugar || fop.highFat || fop.highSodium) && (
                <div className="mt-3 flex justify-center w-full pt-1">
                    <div
                        className="border-[4px] rounded-[10px] p-[2px] inline-block leading-none"
                        style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}
                    >
                        <MagnifyingGlassLabel
                            highSugar={!!fop.highSugar}
                            highFat={!!fop.highFat}
                            highSodium={!!fop.highSodium}
                            layout="horizontal"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
