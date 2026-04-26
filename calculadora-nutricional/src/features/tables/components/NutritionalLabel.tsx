import React from "react";
import { cn } from "@/lib/utils";
import { MICRONUTRIENTS_A_TO_Z as MICRONUTRIENTS } from "@/features/tables/domain/micronutrients";
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

type NutrientKey = keyof CalculatedNutrients;
type VdrValues = (typeof VDR)[PopGroup];
type VdrKey = keyof VdrValues;

const getNutrientValue = (nutrients: CalculatedNutrients, key: NutrientKey) => nutrients[key] || 0;

const getVdrValue = (vdr: VdrValues, key: NutrientKey): number | null | undefined => {
    if (key in vdr) {
        return vdr[key as VdrKey] as number | null | undefined;
    }
    return undefined;
};

const Row4 = ({ label, v1, v2, v3, sub, bold }: { label: string; v1: string; v2: string; v3: string; sub?: boolean; bold?: boolean }) => (
    <tr className="border-b text-[11px]" style={{ borderColor: "#d1d5db" }}>
        <td className={cn("py-[3px] pr-2 leading-tight", sub && "pl-4", bold && "font-bold")}>{label}</td>
        <td className="py-[3px] px-2 text-right">{v1}</td>
        <td className="py-[3px] px-2 text-right">{v2}</td>
        <td className="py-[3px] px-2 text-right font-bold">{v3}</td>
    </tr>
);

const Row3 = ({ label, v1, v2, sub, bold }: { label: string; v1: string; v2: string; sub?: boolean; bold?: boolean }) => (
    <tr className="border-b text-[11px]" style={{ borderColor: "#d1d5db" }}>
        <td className={cn("py-[3px] pr-2 leading-tight", sub && "pl-4", bold && "font-bold")}>{label}</td>
        <td className="py-[3px] px-2 text-right">{v1}</td>
        <td className="py-[3px] px-2 text-right font-bold">{v2}</td>
    </tr>
);

const Row2 = ({ label, v1, sub, bold }: { label: string; v1: string; sub?: boolean; bold?: boolean }) => (
    <tr className="border-b text-[11px]" style={{ borderColor: "#d1d5db" }}>
        <td className={cn("py-[3px] pr-2 leading-tight", sub && "pl-4", bold && "font-bold")}>{label}</td>
        <td className="py-[3px] px-2 text-right">{v1}</td>
    </tr>
);

export const NutritionalLabel: React.FC<NutritionalLabelProps> = ({
    per100g,
    perPortion,
    portionSize,
    householdMeasure,
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

    const baseRows = [
        { 
            label: "Valor energético (kcal)", 
            nutrientKey: "energy" as NutrientKey,
            per100: roundEnergy(per100g.energy || 0).replace(".", ","), 
            portion: roundEnergy(perPortion.energy || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.energy || 0, vdr.energy), 
            vd100: getSafeVD(per100g.energy || 0, vdr.energy), 
            bold: true 
        },
        { 
            label: "Carboidratos (g)", 
            nutrientKey: "carbs" as NutrientKey,
            per100: roundMacro(per100g.carbs || 0).replace(".", ","), 
            portion: roundMacro(perPortion.carbs || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.carbs || 0, vdr.carbs), 
            vd100: getSafeVD(per100g.carbs || 0, vdr.carbs), 
            bold: true 
        },
        { 
            label: "Açúcares totais (g)", 
            nutrientKey: "sugarTotal" as NutrientKey,
            per100: roundSugars(per100g.sugarTotal || 0).replace(".", ","), 
            portion: roundSugars(perPortion.sugarTotal || 0).replace(".", ","), 
            vdPortion: "-", 
            vd100: "-", 
            sub: true 
        },
        { 
            label: "Açúcares adicionados (g)", 
            nutrientKey: "sugarAdded" as NutrientKey,
            per100: roundSugars(per100g.sugarAdded || 0).replace(".", ","), 
            portion: roundSugars(perPortion.sugarAdded || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.sugarAdded || 0, getVdrValue(vdr, "sugarAdded")), 
            vd100: getSafeVD(per100g.sugarAdded || 0, getVdrValue(vdr, "sugarAdded")), 
            sub: true 
        },
        { 
            label: "Proteínas (g)", 
            nutrientKey: "protein" as NutrientKey,
            per100: roundMacro(per100g.protein || 0).replace(".", ","), 
            portion: roundMacro(perPortion.protein || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.protein || 0, vdr.protein), 
            vd100: getSafeVD(per100g.protein || 0, vdr.protein), 
            bold: true 
        },
        { 
            label: "Gorduras totais (g)", 
            nutrientKey: "fatTotal" as NutrientKey,
            per100: roundMacro(per100g.fatTotal || 0).replace(".", ","), 
            portion: roundMacro(perPortion.fatTotal || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.fatTotal || 0, vdr.fatTotal), 
            vd100: getSafeVD(per100g.fatTotal || 0, vdr.fatTotal), 
            bold: true 
        },
        { 
            label: "Gorduras saturadas (g)", 
            nutrientKey: "fatSat" as NutrientKey,
            per100: roundSaturatedTrans(per100g.fatSat || 0).replace(".", ","), 
            portion: roundSaturatedTrans(perPortion.fatSat || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.fatSat || 0, vdr.fatSat), 
            vd100: getSafeVD(per100g.fatSat || 0, vdr.fatSat), 
            sub: true, 
            bold: true 
        },
        { 
            label: "Gorduras trans (g)", 
            nutrientKey: "fatTrans" as NutrientKey,
            per100: roundSaturatedTrans(per100g.fatTrans || 0).replace(".", ","), 
            portion: roundSaturatedTrans(perPortion.fatTrans || 0).replace(".", ","), 
            vdPortion: "-", 
            vd100: "-", 
            sub: true, 
            bold: true 
        },
        { 
            label: "Fibras alimentares (g)", 
            nutrientKey: "fiber" as NutrientKey,
            per100: roundMacro(per100g.fiber || 0).replace(".", ","), 
            portion: roundMacro(perPortion.fiber || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.fiber || 0, vdr.fiber), 
            vd100: getSafeVD(per100g.fiber || 0, vdr.fiber), 
            bold: true 
        },
        { 
            label: "Sódio (mg)", 
            nutrientKey: "sodium" as NutrientKey,
            per100: roundSodium(per100g.sodium || 0).replace(".", ","), 
            portion: roundSodium(perPortion.sodium || 0).replace(".", ","), 
            vdPortion: getSafeVD(perPortion.sodium || 0, vdr.sodium), 
            vd100: getSafeVD(per100g.sodium || 0, vdr.sodium), 
            bold: true 
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
                vd100: getSafeVD(val100, ref),
                bold: false
            });
        }
    });

    const linearText = baseRows
        .map((r) => `${r.label.split(" (")[0]} ${r.portion} (${r.vdPortion}% VD*)`)
        .join("; ");

    return (
        <div
            className="p-4 border-2 inline-block w-fit min-w-[22rem] max-w-[64rem]"
            id={id}
            style={{ backgroundColor: "#ffffff", borderColor: "#000000", color: "#000000", fontFamily: "Arial, Helvetica, sans-serif" }}
        >
            <style dangerouslySetInnerHTML={{ __html: `
              #${id} td, #${id} th, #${id} p, #${id} span, #${id} div, #${id} h1, #${id} h2, #${id} h3 {
                white-space: nowrap !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
              }
              #${id} td {
                vertical-align: middle !important;
                line-height: 1.4 !important;
                padding-top: 4px !important;
                padding-bottom: 4px !important;
              }
            `}} />
            <h2 className="text-[13px] font-bold" style={{ margin: 0, paddingBottom: '4px', borderBottom: '4px solid #000000' }}>
                INFORMAÇÃO NUTRICIONAL
            </h2>
            <div className="text-[11px] mt-2 mb-2 leading-tight">
                <p style={{ margin: 0 }}>Porção de {portionSize}g ({householdMeasure})</p>
            </div>

            {previewType === "LINEAR" ? (
                <div className="text-[11px] leading-relaxed border-t-2 pt-2" style={{ borderColor: "#000000" }}>
                    {linearText}
                </div>
            ) : previewType === "SIMPLIF" ? (
                <div className="border-t-2" style={{ borderColor: "#000000" }}>
                    <table className="w-auto border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] pl-4 text-right">100g</th>
                                <th className="py-[3px] pl-4 text-right">Porção</th>
                                <th className="py-[3px] pl-4 text-right">%VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Row4 label="Carboidratos (g)" v1={baseRows[1].per100} v2={baseRows[1].portion} v3={baseRows[1].vdPortion} bold />
                            <tr className="border-b text-[11px]" style={{ borderColor: "#d1d5db" }}>
                                <td className="py-[3px] leading-[1.2]" colSpan={4}>
                                    Não contém quantidades significativas dos demais nutrientes obrigatórios.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : previewType === "B2B" ? (
                <div className="border-t-2" style={{ borderColor: "#000000" }}>
                    <table className="w-auto border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] pl-4 text-right">100g</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row2 key={`b2b-${row.label}`} label={row.label} v1={row.per100} sub={row.sub} bold={row.bold} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "100" ? (
                <div className="border-t-2" style={{ borderColor: "#000000" }}>
                    <table className="w-auto border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] pl-4 text-right">100g</th>
                                <th className="py-[3px] pl-4 text-right">%VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row3 key={`100-${row.label}`} label={row.label} v1={row.per100} v2={row.vd100} sub={row.sub} bold={row.bold} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "SUPLEM" ? (
                <div className="border-t-2" style={{ borderColor: "#000000" }}>
                    <table className="w-auto border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] pl-4 text-right">Porção</th>
                                <th className="py-[3px] pl-4 text-right">%VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row3 key={`sup-${row.label}`} label={row.label} v1={row.portion} v2={row.vdPortion} sub={row.sub} bold={row.bold} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "AGREGADO" ? (
                <div className="border-t-2" style={{ borderColor: "#000000" }}>
                    <table className="w-auto border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center" colSpan={3}>Produto 1</th>
                                <th className="py-[3px] px-2 text-center" colSpan={3}>Produto 2</th>
                            </tr>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-right">100g</th>
                                <th className="py-[3px] px-2 text-right">Porção</th>
                                <th className="py-[3px] px-2 text-right">%VD*</th>
                                <th className="py-[3px] px-2 text-right">100g</th>
                                <th className="py-[3px] px-2 text-right">Porção</th>
                                <th className="py-[3px] px-2 text-right">%VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <tr key={`agg-${row.label}`} className="border-b" style={{ borderColor: "#d1d5db" }}>
                                    <td className={cn("py-[3px] pr-2", row.sub && "pl-4", row.bold && "font-bold")}>{row.label}</td>
                                    <td className="py-[3px] px-2 text-right">{row.per100}</td>
                                    <td className="py-[3px] px-2 text-right">{row.portion}</td>
                                    <td className="py-[3px] px-2 text-right font-bold">{row.vdPortion}</td>
                                    <td className="py-[3px] px-2 text-right">{row.per100}</td>
                                    <td className="py-[3px] px-2 text-right">{row.portion}</td>
                                    <td className="py-[3px] px-2 text-right font-bold">{row.vdPortion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "SUPLEM-POP" ? (
                <div className="border-t-2" style={{ borderColor: "#000000" }}>
                    <table className="w-auto border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-center" colSpan={2}>{firstGroupLabel}</th>
                                <th className="py-[3px] px-2 text-center" colSpan={2}>{secondGroupLabel}</th>
                            </tr>
                            <tr className="border-b" style={{ borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] px-2 text-right">Porção</th>
                                <th className="py-[3px] px-2 text-right">%VD*</th>
                                <th className="py-[3px] px-2 text-right">Porção</th>
                                <th className="py-[3px] px-2 text-right">%VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <tr key={`pop-${row.label}`} className="border-b" style={{ borderColor: "#d1d5db" }}>
                                    <td className={cn("py-[3px] pr-2", row.sub && "pl-4", row.bold && "font-bold")}>{row.label}</td>
                                    <td className="py-[3px] px-2 text-right">{row.portion}</td>
                                    <td className="py-[3px] px-2 text-right font-bold">{row.vdPortion}</td>
                                    <td className="py-[3px] px-2 text-right">{row.portion}</td>
                                    <td className="py-[3px] px-2 text-right font-bold">
                                        {getSafeVD(getNutrientValue(perPortion, row.nutrientKey), getVdrValue(adultsVdr, row.nutrientKey))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : previewType === "HORIZ" ? (
                <div className="border-t-2 pt-2" style={{ borderColor: "#000000" }}>
                    <div className="grid grid-cols-[12rem_auto] gap-4 items-start">
                        <div className="text-[11px] border rounded-sm p-2" style={{ borderColor: "#d1d5db" }}>
                            <div className="font-bold">INFORMAÇÃO NUTRICIONAL</div>
                            <div className="mt-1">Porções por emb.: ...</div>
                            <div>Porção: {portionSize} g</div>
                            <div>({householdMeasure})</div>
                        </div>
                        <table className="w-auto border-collapse">
                            <thead>
                                <tr className="font-bold text-[11px] border-b" style={{ backgroundColor: "#f3f4f6", borderColor: "#000000" }}>
                                    <th className="py-[3px] text-left font-bold"></th>
                                    <th className="py-[3px] pl-4 text-right font-bold whitespace-nowrap">100g</th>
                                    <th className="py-[3px] pl-4 text-right font-bold whitespace-nowrap">Porção</th>
                                    <th className="py-[3px] pl-4 text-right font-bold whitespace-nowrap">%VD*</th>
                                </tr>
                            </thead>
                            <tbody>
                                {baseRows.map((row) => (
                                    <Row4 key={`horiz-${row.label}`} label={row.label} v1={row.per100} v2={row.portion} v3={row.vdPortion} sub={row.sub} bold={row.bold} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="border-t-2" style={{ borderColor: "#000000" }}>
                    <table className="w-auto border-collapse">
                        <thead>
                            <tr className="font-bold text-[11px] border-b" style={{ backgroundColor: "#f3f4f6", borderColor: "#000000" }}>
                                <th className="py-[3px] text-left"></th>
                                <th className="py-[3px] pl-4 text-right">100g</th>
                                <th className="py-[3px] pl-4 text-right">Porção</th>
                                <th className="py-[3px] pl-4 text-right">%VD*</th>
                            </tr>
                        </thead>
                        <tbody>
                            {baseRows.map((row) => (
                                <Row4 key={`vert-${row.label}`} label={row.label} v1={row.per100} v2={row.portion} v3={row.vdPortion} sub={row.sub} bold={row.bold} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 text-[10px] italic">
                * Percentual de valores diários fornecidos pela porção.
            </div>

            {fop && (fop.highSugar || fop.highFat || fop.highSodium) && (
                <div className="mt-4 flex justify-center w-full border-t border-border/40 pt-4">
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
