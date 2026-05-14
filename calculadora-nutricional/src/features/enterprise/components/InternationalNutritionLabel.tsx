import * as React from "react";
import {
    getFrontWarnings,
    getMarketRules,
    getNutritionLines,
    type EnterpriseTable,
    type FoodPhysicalState,
    type InternationalMarket,
} from "@/features/enterprise/domain/enterprise";
import { cn } from "@/lib/utils";

interface InternationalNutritionLabelProps {
    table: EnterpriseTable;
    market: InternationalMarket;
    foodState: FoodPhysicalState;
    id?: string;
}

export function InternationalNutritionLabel({
    table,
    market,
    foodState,
    id = "international-nutrition-label",
}: InternationalNutritionLabelProps) {
    if (market === "us") return <UsNutritionFacts table={table} market={market} foodState={foodState} id={id} />;
    if (market === "ca") return <CanadaNutritionFacts table={table} market={market} foodState={foodState} id={id} />;
    if (market === "eu") return <EuropeanNutritionDeclaration table={table} market={market} foodState={foodState} id={id} />;
    if (market === "mx") return <MexicoNutritionLabel table={table} market={market} foodState={foodState} id={id} />;
    if (market === "cl") return <ChileNutritionLabel table={table} market={market} foodState={foodState} id={id} />;
    return <BrazilNutritionLabel table={table} market={market} foodState={foodState} id={id} />;
}

function UsNutritionFacts({ table, market, id }: InternationalNutritionLabelProps) {
    const lines = getNutritionLines(table, market);
    const calories = lines.find((line) => line.key === "energy");
    const detailLines = lines.filter((line) => line.key !== "energy");

    return (
        <LabelShell id={id} className="w-[280px] border-[2.5px] border-black p-[5px] font-[Arial] text-black">
            <h2 className="border-b-[8px] border-black text-[34px] font-black leading-none tracking-[-0.5px]">Nutrition Facts</h2>
            <div className="border-b border-black py-1 text-[12px] leading-tight">
                <div className="font-bold">{table.servingsPerPackage || "-"} servings per container</div>
                <div className="flex justify-between gap-3">
                    <span className="font-bold">Serving size</span>
                    <span className="text-right font-bold">{formatServing(table)}</span>
                </div>
            </div>
            <div className="border-b-[4px] border-black py-1">
                <div className="text-[10px] font-bold">Amount per serving</div>
                <div className="flex items-end justify-between gap-3">
                    <span className="text-[28px] font-black leading-none">Calories</span>
                    <span className="text-[34px] font-black leading-none">{Math.round(calories?.perPortion || 0)}</span>
                </div>
            </div>
            <div className="border-b border-black py-1 text-right text-[11px] font-bold">% Daily Value*</div>
            <div className="divide-y divide-black text-[12px] leading-tight">
                {detailLines.map((line) => (
                    <div key={line.key} className={cn("flex justify-between gap-3 py-[3px]", isIndentedUs(line.label) && "pl-4")}>
                        <span>
                            <strong>{getBoldPart(line.label)}</strong>{getPlainPart(line.label)} {formatValue(line.perPortion, line.unit)}
                        </span>
                        <strong>{line.dailyValueLabel || ""}</strong>
                    </div>
                ))}
            </div>
            <p className="mt-1 border-t-[5px] border-black pt-1 text-[8px] leading-[1.1]">
                *The % Daily Value tells you how much a nutrient in a serving of food contributes to a daily diet.
                2,000 calories a day is used for general nutrition advice.
            </p>
        </LabelShell>
    );
}

function CanadaNutritionFacts({ table, market, id }: InternationalNutritionLabelProps) {
    const lines = getNutritionLines(table, market);
    const calories = lines.find((line) => line.key === "energy");
    const detailLines = lines.filter((line) => line.key !== "energy");

    return (
        <LabelShell id={id} className="w-[310px] border-[2.5px] border-black p-[6px] font-[Arial] text-black">
            <div className="border-b-[7px] border-black pb-1">
                <h2 className="text-[26px] font-black leading-none">Nutrition Facts</h2>
                <h3 className="text-[22px] font-black leading-none">Valeur nutritive</h3>
                <div className="mt-1 text-[12px] font-bold leading-tight">Per {formatServing(table)} / par {formatServing(table)}</div>
            </div>
            <div className="border-b-[4px] border-black py-1">
                <div className="flex justify-between text-[20px] font-black leading-tight">
                    <span>Calories</span>
                    <span>{Math.round(calories?.perPortion || 0)}</span>
                </div>
            </div>
            <div className="border-b border-black py-1 text-right text-[11px] font-bold">% Daily Value* / % valeur quotidienne*</div>
            <div className="divide-y divide-black text-[12px] leading-tight">
                {detailLines.map((line) => (
                    <div key={line.key} className="flex justify-between gap-3 py-[3px]">
                        <span>
                            <strong>{line.label}</strong> {formatValue(line.perPortion, line.unit)}
                        </span>
                        <strong>{line.dailyValueLabel || ""}</strong>
                    </div>
                ))}
            </div>
            <p className="mt-1 border-t-[5px] border-black pt-1 text-[8px] leading-[1.1]">
                *5% ou moins, c&apos;est peu; 15% ou plus, c&apos;est beaucoup / *5% or less is a little, 15% or more is a lot.
            </p>
        </LabelShell>
    );
}

function EuropeanNutritionDeclaration({ table, market, id }: InternationalNutritionLabelProps) {
    const lines = getNutritionLines(table, market);

    return (
        <LabelShell id={id} className="w-[360px] border border-black bg-white font-[Arial] text-black">
            <div className="border-b border-black bg-black px-3 py-2 text-white">
                <h2 className="text-[18px] font-bold leading-tight">Nutrition declaration</h2>
                <p className="text-[10px]">Typical values · {getMarketRules(market).legalBase.join(" · ")}</p>
            </div>
            <table className="w-full border-collapse text-[12px]">
                <thead>
                    <tr className="border-b border-black bg-neutral-100">
                        <th className="px-3 py-2 text-left font-bold">Nutrient</th>
                        <th className="px-2 py-2 text-right font-bold">per 100 g/ml</th>
                        <th className="px-2 py-2 text-right font-bold">per serving</th>
                    </tr>
                </thead>
                <tbody>
                    {lines.map((line) => (
                        <tr key={line.key} className="border-b border-black/60">
                            <td className="px-3 py-1.5 font-medium">{line.label}</td>
                            <td className="px-2 py-1.5 text-right">{formatValue(line.per100, line.unit)}</td>
                            <td className="px-2 py-1.5 text-right">{formatValue(line.perPortion, line.unit)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="px-3 py-2 text-[10px] leading-tight">Salt is calculated as sodium equivalent x 2.5.</div>
        </LabelShell>
    );
}

function MexicoNutritionLabel({ table, market, foodState, id }: InternationalNutritionLabelProps) {
    const lines = getNutritionLines(table, market);
    const warnings = getFrontWarnings(table, market, foodState);

    return (
        <LabelShell id={id} className="w-[390px] font-[Arial] text-black">
            <FrontOctagons warnings={warnings} />
            <div className="mt-3 border-2 border-black bg-white">
                <div className="border-b-2 border-black px-3 py-2">
                    <h2 className="text-[18px] font-black leading-tight">Declaración nutrimental</h2>
                    <p className="text-[11px]">Por 100 g o 100 ml y por porción</p>
                </div>
                <table className="w-full border-collapse text-[12px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="px-3 py-2 text-left">Nutrimento</th>
                            <th className="px-2 py-2 text-right">100 g/ml</th>
                            <th className="px-2 py-2 text-right">Porción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => (
                            <tr key={line.key} className="border-b border-black/60">
                                <td className="px-3 py-1.5 font-medium">{line.label}</td>
                                <td className="px-2 py-1.5 text-right">{formatValue(line.per100, line.unit)}</td>
                                <td className="px-2 py-1.5 text-right">{formatValue(line.perPortion, line.unit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </LabelShell>
    );
}

function ChileNutritionLabel({ table, market, foodState, id }: InternationalNutritionLabelProps) {
    const lines = getNutritionLines(table, market);
    const warnings = getFrontWarnings(table, market, foodState);

    return (
        <LabelShell id={id} className="w-[390px] font-[Arial] text-black">
            <FrontOctagons warnings={warnings} />
            <div className="mt-3 border-2 border-black bg-white">
                <div className="border-b-2 border-black px-3 py-2">
                    <h2 className="text-[18px] font-black leading-tight">Información nutricional</h2>
                    <p className="text-[11px]">Por 100 g/ml y por porción: {formatServing(table)}</p>
                </div>
                <table className="w-full border-collapse text-[12px]">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="px-3 py-2 text-left">Nutriente</th>
                            <th className="px-2 py-2 text-right">100 g/ml</th>
                            <th className="px-2 py-2 text-right">Porción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => (
                            <tr key={line.key} className="border-b border-black/60">
                                <td className="px-3 py-1.5 font-medium">{line.label}</td>
                                <td className="px-2 py-1.5 text-right">{formatValue(line.per100, line.unit)}</td>
                                <td className="px-2 py-1.5 text-right">{formatValue(line.perPortion, line.unit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </LabelShell>
    );
}

function BrazilNutritionLabel({ table, market, foodState, id }: InternationalNutritionLabelProps) {
    const lines = getNutritionLines(table, market);
    const warnings = getFrontWarnings(table, market, foodState);

    return (
        <LabelShell id={id} className="w-[360px] font-[Arial] text-black">
            <div className="flex justify-center">
                <BrazilLupa warnings={warnings} />
            </div>
            <div className="mt-3 border-2 border-black bg-white p-3">
                <h2 className="border-b border-black pb-1 text-center text-[14px] font-black">INFORMAÇÃO NUTRICIONAL</h2>
                <div className="py-2 text-[11px] leading-tight">
                    <p>Porções por embalagem: {table.servingsPerPackage || "-"}</p>
                    <p>Porção: {formatServing(table)} ({table.householdMeasure})</p>
                </div>
                <table className="w-full border-collapse text-[11px]">
                    <thead>
                        <tr className="border-y-4 border-black">
                            <th className="py-1 text-left"></th>
                            <th className="px-2 py-1 text-right">100 g/ml</th>
                            <th className="px-2 py-1 text-right">Porção</th>
                            <th className="px-2 py-1 text-right">%VD*</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => (
                            <tr key={line.key} className="border-b border-black">
                                <td className="py-1 font-medium">{line.label}</td>
                                <td className="px-2 py-1 text-right">{formatValue(line.per100, line.unit)}</td>
                                <td className="px-2 py-1 text-right">{formatValue(line.perPortion, line.unit)}</td>
                                <td className="px-2 py-1 text-right">{line.dailyValueLabel || ""}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-2 text-[8px]">*Percentual de valores diários fornecidos pela porção.</p>
            </div>
        </LabelShell>
    );
}

function FrontOctagons({ warnings }: { warnings: ReturnType<typeof getFrontWarnings> }) {
    const active = warnings.filter((warning) => warning.triggered);
    if (active.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {active.map((warning) => (
                <div
                    key={warning.code}
                    className="flex h-[78px] w-[78px] items-center justify-center bg-black px-2 text-center text-[9px] font-black uppercase leading-[1.05] text-white"
                    style={{ clipPath: "polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)" }}
                >
                    {warning.label}
                </div>
            ))}
        </div>
    );
}

function BrazilLupa({ warnings }: { warnings: ReturnType<typeof getFrontWarnings> }) {
    const active = warnings.filter((warning) => warning.triggered);
    if (active.length === 0) return null;

    return (
        <div className="inline-flex rounded-[10px] border-[4px] border-black bg-white p-1">
            <div className="border-r-[3px] border-black px-2 text-[10px] font-black uppercase leading-tight">
                Alto<br />em
            </div>
            <div className="space-y-0.5 px-2 text-[9px] font-black uppercase leading-tight">
                {active.map((warning) => (
                    <div key={warning.code}>{warning.label.replace("ALTO EM ", "")}</div>
                ))}
            </div>
        </div>
    );
}

function LabelShell({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
    return (
        <div id={id} className={cn("bg-white", className)} style={{ letterSpacing: "normal" }}>
            {children}
        </div>
    );
}

function formatServing(table: EnterpriseTable) {
    return `${formatPlainNumber(table.portion)} ${table.uom || "g"}`;
}

function formatValue(value: number, unit: string) {
    const number = unit === "mg" || unit === "kcal" || unit === "kJ"
        ? Math.round(value).toString()
        : formatPlainNumber(value);
    return `${number} ${unit}`;
}

function formatPlainNumber(value: number) {
    if (!Number.isFinite(value)) return "0";
    if (Math.abs(value) >= 100) return Math.round(value).toString();
    if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, "");
    return value.toFixed(1).replace(/\.0$/, "");
}

function isIndentedUs(label: string) {
    return label.includes("Saturated") || label.includes("Trans") || label.includes("Sugars") || label.includes("Added");
}

function getBoldPart(label: string) {
    if (label.includes(" / ")) return label.split(" / ")[0];
    return label;
}

function getPlainPart(label: string) {
    if (!label.includes(" / ")) return "";
    return ` / ${label.split(" / ").slice(1).join(" / ")}`;
}
