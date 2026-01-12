import { CalculatedNutrients } from "@/lib/nutrients";
import { calculateVD, roundEnergy, roundMacro, roundSodium, roundSugars, roundSaturatedTrans } from "@/lib/anvisa";
import { VDR, PopGroup, POPULATION_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface NutritionalLabelProps {
    per100g: CalculatedNutrients;
    perPortion: CalculatedNutrients;
    portionSize: number; // g
    householdMeasure: string;
    popGroup: PopGroup;
}

export function NutritionalLabel({
    per100g,
    perPortion,
    portionSize,
    householdMeasure,
    popGroup,
}: NutritionalLabelProps) {
    const vdr = VDR[popGroup];

    const Row = ({ label, val100, valPortion, vd, sub = false, bold = false }: { label: string, val100: string, valPortion: string, vd: string, sub?: boolean, bold?: boolean }) => (
        <div className={cn("flex justify-between border-b py-1 text-sm", sub && "pl-4")} style={{ borderColor: '#d1d5db', backgroundColor: '#ffffff' }}>
            <span className={cn(bold && "font-bold")}>{label}</span>
            <div className="flex gap-4 min-w-[140px] justify-end" style={{ backgroundColor: '#ffffff' }}>
                <span className="w-12 text-right">{val100}</span>
                <span className="w-12 text-right">{valPortion}</span>
                <span className="w-8 text-right font-bold ml-2">{vd}</span>
            </div>
        </div>
    );

    const getVD = (val: number, ref: number | null) => calculateVD(val, ref);

    return (
        <div className="p-4 border-2 max-w-md font-sans" id="nutrition-label-container" style={{ backgroundColor: '#ffffff', borderColor: '#000000', color: '#000000' }}>
            <h2 className="text-xl font-bold border-b-4 pb-1" style={{ borderColor: '#000000' }}>INFORMAÇÃO NUTRICIONAL</h2>
            <div className="text-sm mb-2">
                <p>Porção de {portionSize}g ({householdMeasure})</p>
            </div>

            <div className="border-t-2" style={{ borderColor: '#000000' }}>
                <div className="flex justify-between font-bold text-xs border-b py-1" style={{ backgroundColor: '#f3f4f6', borderColor: '#000000' }}>
                    <span></span>
                    <div className="flex gap-4 min-w-[140px] justify-end">
                        <span className="w-12 text-right">100g</span>
                        <span className="w-12 text-right">Porção</span>
                        <span className="w-8 text-right">%VD*</span>
                    </div>
                </div>

                <Row
                    label="Valor energético (kcal)"
                    val100={roundEnergy(per100g.energy)}
                    valPortion={roundEnergy(perPortion.energy)}
                    vd={getVD(perPortion.energy, vdr.energy)}
                    bold
                />

                <Row
                    label="Carboidratos totais (g)"
                    val100={roundMacro(per100g.carbs)}
                    valPortion={roundMacro(perPortion.carbs)}
                    vd={getVD(perPortion.carbs, vdr.carbs)}
                    bold
                />
                <Row
                    label="Açúcares totais (g)"
                    val100={roundSugars(per100g.sugarTotal)}
                    valPortion={roundSugars(perPortion.sugarTotal)}
                    vd="-" sub
                />
                <Row
                    label="Açúcares adicion. (g)"
                    val100={roundSugars(per100g.sugarAdded)}
                    valPortion={roundSugars(perPortion.sugarAdded)}
                    vd="-" sub
                />

                <Row
                    label="Proteínas (g)"
                    val100={roundMacro(per100g.protein)}
                    valPortion={roundMacro(perPortion.protein)}
                    vd={getVD(perPortion.protein, vdr.protein)}
                    bold
                />

                <Row
                    label="Gorduras totais (g)"
                    val100={roundMacro(per100g.fatTotal)}
                    valPortion={roundMacro(perPortion.fatTotal)}
                    vd={getVD(perPortion.fatTotal, vdr.fatTotal)}
                    bold
                />
                <Row
                    label="Gorduras saturadas (g)"
                    val100={roundSaturatedTrans(per100g.fatSat)}
                    valPortion={roundSaturatedTrans(perPortion.fatSat)}
                    vd={getVD(perPortion.fatSat, vdr.fatSat)}
                    sub
                />
                <Row
                    label="Gorduras trans (g)"
                    val100={roundSaturatedTrans(per100g.fatTrans)}
                    valPortion={roundSaturatedTrans(perPortion.fatTrans)}
                    vd="-" sub
                />

                <Row
                    label="Fibra alimentar (g)"
                    val100={roundMacro(per100g.fiber)}
                    valPortion={roundMacro(perPortion.fiber)}
                    vd={getVD(perPortion.fiber, vdr.fiber)}
                    bold
                />

                <Row
                    label="Sódio (mg)"
                    val100={roundSodium(per100g.sodium)}
                    valPortion={roundSodium(perPortion.sodium)}
                    vd={getVD(perPortion.sodium, vdr.sodium)}
                    bold
                />

            </div>
            <div className="text-xs mt-2 border-t pt-1" style={{ borderColor: '#000000' }}>
                *Percentual de valores diários fornecidos pela porção.
                {vdr.fatSat === null && " (Gorduras saturadas: VDR não estabelecido para este grupo)."}
            </div>
        </div>
    );
}
