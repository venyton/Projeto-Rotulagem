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
    if (key === "sugarAdded") return DEFAULT_VD_SUGAR_ADDED;
    if (key === "fatTrans") return DEFAULT_VD_FAT_TRANS;
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

export const NutritionalLabel: React.FC<NutritionalLabelProps> = ({
    per100g,
    perPortion,
    portionSize,
    householdMeasure,
    servingsPerPackage,
    popGroup,
    selectedNutrients,
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

    const isLinearPreview = previewType === "LINEAR";
    const portionHeader = `${portionSize} g`;
    const servingsHeader = servingsPerPackage?.trim() || "-";
    const declarationSeparatorStyle = { borderTop: "4px solid #000000" };
    const linearBase = `Por 100 g ou ml (${portionHeader}, % VD*):`;
    const linearText = baseRows
        .map((r) => {
            const vd = r.vdPortion ? `, ${r.vdPortion}% VD*` : "";
            return `${r.label} ${r.per100} (${r.portion}${vd})`;
        })
        .join(" ● ");

    return (
        <div
            className={cn(
                "max-w-[64rem]",
                isLinearPreview ? "block w-full min-w-0 max-w-full" : "inline-block w-fit min-w-[22rem]"
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
              #${id} td {
                vertical-align: middle !important;
                line-height: 1.15 !important;
                padding-top: 2px !important;
                padding-bottom: 2px !important;
              }
              #${id} .linear-preview-content {
                white-space: normal !important;
                overflow-wrap: anywhere !important;
                word-break: break-word !important;
              }
            `}} />
            <div
                className={cn("p-4 border-2", isLinearPreview && "w-full")}
                style={{ backgroundColor: "#ffffff", borderColor: "#000000" }}
            >
            <h2 className={cn(isLinearPreview ? "text-[11px] text-left" : "text-[13px] text-center", "font-bold")} style={{ margin: 0, paddingBottom: "3px", borderBottom: "1px solid #000000" }}>
                INFORMAÇÃO NUTRICIONAL
            </h2>
            <div className={cn(isLinearPreview ? "text-[8px] text-left" : "text-[11px] text-center", "mt-2 mb-2 leading-tight")}>
                <p style={{ margin: 0 }}>Porções por embalagem: {servingsHeader}</p>
                <p style={{ margin: 0 }}>Porção: {portionHeader} ({householdMeasure})</p>
            </div>

            {previewType === "LINEAR" ? (
                <div className="linear-preview-content text-[8px] leading-relaxed pt-2 w-full text-left" style={declarationSeparatorStyle}>
                    <strong>{linearBase}</strong> {linearText}
                </div>
            ) : previewType === "SIMPLIF" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] pl-4 text-center">100 g</th>
                                <th className="py-[3px] pl-4 text-center">{portionHeader}</th>
                                <th className="py-[3px] pl-4 text-center">% VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Row4 label="Carboidratos (g)" v1={baseRows[1].per100} v2={baseRows[1].portion} v3={baseRows[1].vdPortion} />
                            <tr className="border-b text-[11px]" style={{ borderColor: "#000000" }}>
                                <td className="py-[3px] leading-[1.2]" colSpan={4}>
                                    Não contém quantidades significativas de proteínas, gorduras totais, gorduras saturadas, gorduras trans, fibras alimentares e sódio.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : previewType === "VERT-QUEB" ? (
                <div className="pt-2" style={declarationSeparatorStyle}>
                    <div className="grid grid-cols-2 gap-3">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                    <th className="py-[3px] text-left"></th>
                                    <th className="py-[3px] px-2 text-center">100 g</th>
                                    <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                    <th className="py-[3px] px-2 text-center">% VD*</th>
                                </tr>
                            </thead>
                            <tbody>
                                {baseRows.slice(0, 5).map((row) => (
                                    <Row4 key={`vert-queb-left-${row.label}`} label={row.label} v1={row.per100} v2={row.portion} v3={row.vdPortion} indentLevel={row.indentLevel} />
                                ))}
                            </tbody>
                        </table>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                    <th className="py-[3px] text-left"></th>
                                    <th className="py-[3px] px-2 text-center">100 g</th>
                                    <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                    <th className="py-[3px] px-2 text-center">% VD*</th>
                                </tr>
                            </thead>
                            <tbody>
                                {baseRows.slice(5).map((row) => (
                                    <Row4 key={`vert-queb-right-${row.label}`} label={row.label} v1={row.per100} v2={row.portion} v3={row.vdPortion} indentLevel={row.indentLevel} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : previewType === "HORIZ-QUEB" ? (
                <div className="pt-2" style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                <th className="py-[3px] px-2 text-center">% VD*</th>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                <th className="py-[3px] px-2 text-center">% VD*</th>
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
                                        <td className="py-[3px] px-2 text-center">{left?.vdPortion ?? ""}</td>
                                        <td className={cn("py-[3px] pr-2 leading-tight", getIndentClass(right?.indentLevel))}>{right?.label ?? ""}</td>
                                        <td className="py-[3px] px-2 text-center">{right?.per100 ?? ""}</td>
                                        <td className="py-[3px] px-2 text-center">{right?.portion ?? ""}</td>
                                        <td className="py-[3px] px-2 text-center">{right?.vdPortion ?? ""}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "B2B" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] pl-4 text-center">100 g</th>
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
                                <th className="py-[3px] pl-4 text-center">100 g</th>
                                <th className="py-[3px] pl-4 text-center">% VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row3 key={`100-${row.label}`} label={row.label} v1={row.per100} v2={row.vd100} indentLevel={row.indentLevel} />
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
                                <th className="py-[3px] pl-4 text-center">{portionHeader}</th>
                                <th className="py-[3px] pl-4 text-center">% VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row3 key={`sup-${row.label}`} label={row.label} v1={row.portion} v2={row.vdPortion} indentLevel={row.indentLevel} />
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
                                <th className="py-[3px] pl-4 text-center">100 g</th>
                                <th className="py-[3px] pl-4 text-center">{portionHeader}</th>
                                <th className="py-[3px] pl-4 text-center">% VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row4 key={`adicao-${row.label}`} label={row.label} v1={row.per100} v2={row.portion} v3={row.vdPortion} indentLevel={row.indentLevel} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "AGREGADO" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center" colSpan={3}>Produto 1</th>
                                <th className="py-[3px] px-2 text-center" colSpan={3}>Produto 2</th>
                            </tr>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                <th className="py-[3px] px-2 text-center">% VD*</th>
                                <th className="py-[3px] px-2 text-center">100 g</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                <th className="py-[3px] px-2 text-center">% VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <tr key={`agg-${row.label}`} className="border-b" style={{ borderColor: "#000000" }}>
                                    <td className={cn("py-[3px] pr-2", getIndentClass(row.indentLevel))}>{row.label}</td>
                                    <td className="py-[3px] px-2 text-center">{row.per100}</td>
                                    <td className="py-[3px] px-2 text-center">{row.portion}</td>
                                    <td className="py-[3px] px-2 text-center">{row.vdPortion}</td>
                                    <td className="py-[3px] px-2 text-center">{row.per100}</td>
                                    <td className="py-[3px] px-2 text-center">{row.portion}</td>
                                    <td className="py-[3px] px-2 text-center">{row.vdPortion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "SUPLEM-POP" ? (
                <div style={declarationSeparatorStyle}>
                    <table className="w-full border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center" colSpan={2}>{firstGroupLabel}</th>
                                <th className="py-[3px] px-2 text-center" colSpan={2}>{secondGroupLabel}</th>
                            </tr>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                <th className="py-[3px] px-2 text-center">% VD*</th>
                                <th className="py-[3px] px-2 text-center">{portionHeader}</th>
                                <th className="py-[3px] px-2 text-center">% VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <tr key={`pop-${row.label}`} className="border-b" style={{ borderColor: "#000000" }}>
                                    <td className={cn("py-[3px] pr-2", getIndentClass(row.indentLevel))}>{row.label}</td>
                                    <td className="py-[3px] px-2 text-center">{row.portion}</td>
                                    <td className="py-[3px] px-2 text-center">{row.vdPortion}</td>
                                    <td className="py-[3px] px-2 text-center">{row.portion}</td>
                                    <td className="py-[3px] px-2 text-center">
                                        {getSafeVD(getNutrientValue(perPortion, row.nutrientKey), getVdReference(adultsVdr, row.nutrientKey))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "HORIZ" ? (
                <div className="pt-2" style={declarationSeparatorStyle}>
                    <div className="grid grid-cols-[12rem_auto] gap-4 items-start">
                        <div className="text-[11px] border rounded-sm p-2" style={{ borderColor: "#000000" }}>
                            <div className="font-bold">INFORMAÇÃO NUTRICIONAL</div>
                            <div className="mt-1">Porções por embalagem: {servingsHeader}</div>
                            <div>Porção: {portionHeader} ({householdMeasure})</div>
                        </div>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                    <th className="py-[3px] text-left font-bold"></th>
                                    <th className="py-[3px] pl-4 text-center font-bold whitespace-nowrap">100 g</th>
                                    <th className="py-[3px] pl-4 text-center font-bold whitespace-nowrap">{portionHeader}</th>
                                    <th className="py-[3px] pl-4 text-center font-bold whitespace-nowrap">% VD*</th>
                                </tr>
                            </thead>
                            <tbody>
                                {baseRows.map((row) => (
                                    <Row4 key={`horiz-${row.label}`} label={row.label} v1={row.per100} v2={row.portion} v3={row.vdPortion} indentLevel={row.indentLevel} />
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
                                <th className="py-[3px] pl-4 text-center">100 g</th>
                                <th className="py-[3px] pl-4 text-center">{portionHeader}</th>
                                <th className="py-[3px] pl-4 text-center">% VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row4 key={`vert-${row.label}`} label={row.label} v1={row.per100} v2={row.portion} v3={row.vdPortion} indentLevel={row.indentLevel} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className={cn("mt-4 text-[8px]", isLinearPreview ? "text-left" : "text-left")}>
                * Percentual de valores diários fornecidos pela porção.
            </div>
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
