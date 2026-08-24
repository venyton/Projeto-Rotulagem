export type InternationalMarket = "br" | "us" | "eu" | "ca" | "mx" | "cl";
export type ApprovalStatus = "draft" | "quality" | "regulatory" | "marketing" | "approved";
export type FoodPhysicalState = "solid" | "liquid";

export function canSetEnterpriseApprovalStatus(status: ApprovalStatus, hasApprovalAuthority: boolean) {
    return status !== "approved" || hasApprovalAuthority;
}

export type EnterpriseTableItem = {
    name: string;
    quantity: number;
    isAddedSugar?: boolean;
    sugarAdded?: number | null;
    energy: number;
    carbs: number;
    protein: number;
    fatTotal: number;
    fatSat: number;
    fatTrans: number;
    fiber: number;
    sodium: number;
    sugarTotal?: number | null;
};

export type EnterpriseTable = {
    id: string;
    title: string;
    portion: number;
    uom: string;
    householdMeasure: string;
    popGroup: string;
    packageContent?: number | null;
    servingsPerPackage?: string | null;
    updatedAt?: Date | string;
    items: EnterpriseTableItem[];
};

/**
 * Mantém os campos de localização editáveis, mas sempre recompõe a fórmula e
 * os nutrientes a partir da tabela persistida pelo tenant.
 */
export function buildAuthoritativeEnterpriseTable(
    trustedBase: EnterpriseTable,
    localizedDraft: Partial<EnterpriseTable> | null | undefined,
): EnterpriseTable {
    const localizedTitle = typeof localizedDraft?.title === "string" ? localizedDraft.title.trim().slice(0, 160) : "";
    const localizedPortion = typeof localizedDraft?.portion === "number" && Number.isFinite(localizedDraft.portion) && localizedDraft.portion > 0 && localizedDraft.portion <= 10_000_000
        ? localizedDraft.portion
        : trustedBase.portion;
    const localizedUom = typeof localizedDraft?.uom === "string" ? localizedDraft.uom.trim().slice(0, 20) : "";
    const localizedMeasure = typeof localizedDraft?.householdMeasure === "string"
        ? localizedDraft.householdMeasure.trim().slice(0, 160)
        : "";
    const localizedPackageContent = typeof localizedDraft?.packageContent === "number" && Number.isFinite(localizedDraft.packageContent) && localizedDraft.packageContent > 0 && localizedDraft.packageContent <= 10_000_000
        ? localizedDraft.packageContent
        : trustedBase.packageContent ?? null;
    const localizedServings = typeof localizedDraft?.servingsPerPackage === "string"
        ? localizedDraft.servingsPerPackage.trim().slice(0, 100)
        : "";

    return {
        id: trustedBase.id,
        title: localizedTitle || trustedBase.title,
        portion: localizedPortion,
        uom: localizedUom || trustedBase.uom,
        householdMeasure: localizedMeasure || trustedBase.householdMeasure,
        popGroup: trustedBase.popGroup,
        packageContent: localizedPackageContent,
        servingsPerPackage: localizedServings || trustedBase.servingsPerPackage || null,
        updatedAt: trustedBase.updatedAt,
        items: trustedBase.items.map((item) => ({ ...item })),
    };
}

export type EnterpriseLabelVersionSnapshot = {
    id: string;
    version: number;
    title: string;
    market: InternationalMarket;
    foodState: FoodPhysicalState;
    approvalStatus: ApprovalStatus;
    tableSnapshot: EnterpriseTable;
    legalData: LegalLabelData;
    notes: string | null;
    updatedAt: string;
};

export type EnterpriseLabelProjectSummary = {
    id: string;
    baseTableId: string | null;
    title: string;
    market: InternationalMarket;
    status: ApprovalStatus;
    currentVersionId: string | null;
    updatedAt: string;
    currentVersion: EnterpriseLabelVersionSnapshot | null;
};

export type EnterpriseNutrients = {
    energy: number;
    carbs: number;
    sugarTotal: number;
    sugarAdded: number;
    protein: number;
    fatTotal: number;
    fatSat: number;
    fatTrans: number;
    fiber: number;
    sodium: number;
};

export type ValidationItem = {
    level: "ok" | "warning" | "blocker";
    title: string;
    detail: string;
};

export type ClaimCheck = {
    label: string;
    status: "eligible" | "attention" | "not-eligible";
    detail: string;
};

export type FrontWarning = {
    code: string;
    label: string;
    triggered: boolean;
    value: string;
    limit: string;
};

export type NutritionLine = {
    key: keyof EnterpriseNutrients | "energyKj" | "salt";
    label: string;
    unit: string;
    per100: number;
    perPortion: number;
    dailyValue?: number;
    dailyValueLabel?: string;
    required: boolean;
};

export type MarketRules = {
    value: InternationalMarket;
    label: string;
    locale: string;
    authority: string;
    legalBase: string[];
    tableName: string;
    servingBasis: string;
    languageRequirement: string;
    frontSystem: string;
    mandatory: string[];
    notes: string[];
};

export type LegalLabelData = {
    legalName?: string;
    category?: string;
    language?: string;
    intendedClaims?: string;
    adjustmentNotes?: string;
    ingredientsStatement?: string;
    allergenStatement?: string;
    netQuantity?: string;
    drainedWeight?: string;
    lotCode?: string;
    dateMarking?: string;
    responsibleName?: string;
    responsibleAddress?: string;
    importerName?: string;
    importerAddress?: string;
    countryOfOrigin?: string;
    storageInstructions?: string;
    preparationInstructions?: string;
    packageDisplayArea?: string;
    referenceAmount?: string;
    mandatoryMicronutrients?: string;
    claimsEvidence?: string;
    childMarketingElements?: string;
    caffeineAdded?: string;
    sweetenersAdded?: string;
    addedCriticalNutrients?: string;
    memberState?: string;
    quidStatement?: string;
    alcoholVolume?: string;
    organicOrSpecialSeals?: string;
    frontSymbolSize?: string;
};

export const INTERNATIONAL_MARKETS: MarketRules[] = [
    {
        value: "us",
        label: "Estados Unidos",
        locale: "en-US",
        authority: "FDA",
        legalBase: ["21 CFR 101.9", "21 CFR 101.12"],
        tableName: "Nutrition Facts",
        servingBasis: "Serving size conforme RACC da categoria e % Daily Value por serving.",
        languageRequirement: "Inglês; espanhol pode complementar quando aplicável.",
        frontSystem: "Não há selo frontal federal obrigatório geral equivalente à lupa brasileira.",
        mandatory: ["Calories", "Total Fat", "Saturated Fat", "Trans Fat", "Cholesterol", "Sodium", "Total Carbohydrate", "Dietary Fiber", "Total Sugars", "Added Sugars", "Protein", "Vitamin D", "Calcium", "Iron", "Potassium"],
        notes: ["Serving size precisa ser conferido pela categoria oficial.", "Vitamin D, cálcio, ferro e potássio exigem dados que hoje não entram no resumo enterprise."],
    },
    {
        value: "eu",
        label: "União Europeia",
        locale: "en-GB",
        authority: "European Commission",
        legalBase: ["Regulation (EU) No 1169/2011", "Regulation (EC) No 1924/2006"],
        tableName: "Nutrition declaration",
        servingBasis: "Declaração obrigatória por 100 g/ml; por porção pode complementar.",
        languageRequirement: "Idioma facilmente compreendido no Estado-Membro de venda.",
        frontSystem: "Sem FOP harmonizado obrigatório da UE para todos os alimentos.",
        mandatory: ["Energy", "Fat", "Saturates", "Carbohydrate", "Sugars", "Protein", "Salt"],
        notes: ["Energia deve aparecer em kJ e kcal.", "Sal é calculado pelo sódio equivalente multiplicado por 2,5."],
    },
    {
        value: "ca",
        label: "Canadá",
        locale: "en-CA",
        authority: "Health Canada / CFIA",
        legalBase: ["Food and Drug Regulations B.01.401", "Table of Daily Values 2022", "Table of Reference Amounts 2024"],
        tableName: "Nutrition Facts / Valeur nutritive",
        servingBasis: "Serving of stated size baseado na referência da categoria.",
        languageRequirement: "Bilingue inglês/francês.",
        frontSystem: "Símbolo frontal canadense para altos teores quando aplicável.",
        mandatory: ["Calories", "Fat", "Saturated + Trans Fat", "Carbohydrate", "Fibre", "Sugars", "Protein", "Cholesterol", "Sodium", "Potassium", "Calcium", "Iron"],
        notes: ["% DV usa tabela canadense atual.", "Referências de quantidade têm transições até 2027 em alguns casos."],
    },
    {
        value: "mx",
        label: "México",
        locale: "es-MX",
        authority: "Secretaría de Economía / COFEPRIS",
        legalBase: ["NOM-051-SCFI/SSA1-2010", "Modificación DOF 27/03/2020", "Ajustes DOF 2025"],
        tableName: "Declaración nutrimental",
        servingBasis: "Por 100 g/ml e por envase quando aplicável.",
        languageRequirement: "Espanhol do México.",
        frontSystem: "Octógonos de excesso: calorías, azúcares, grasas saturadas, grasas trans e sodio.",
        mandatory: ["Contenido energético", "Proteínas", "Grasas totales", "Grasas saturadas", "Grasas trans", "Hidratos de carbono", "Azúcares", "Fibra dietética", "Sodio"],
        notes: ["Fase e prazos da NOM-051 precisam acompanhar alterações do DOF.", "Advertências de cafeína/edulcorantes dependem de dados de formulação não existentes no cálculo atual."],
    },
    {
        value: "cl",
        label: "Chile",
        locale: "es-CL",
        authority: "Ministerio de Salud de Chile",
        legalBase: ["Ley 20.606", "Reglamento Sanitario de los Alimentos DTO 977/96, art. 120 bis"],
        tableName: "Información nutricional",
        servingBasis: "Por 100 g/ml e por porción.",
        languageRequirement: "Espanhol do Chile.",
        frontSystem: "Octógonos ALTO EN calorías, azúcares, grasas saturadas e sodio.",
        mandatory: ["Energía", "Proteínas", "Grasa total", "Hidratos de carbono disponibles", "Azúcares totales", "Sodio"],
        notes: ["O selo depende de nutriente adicionado e limites por sólido/líquido.", "Produtos com selo têm restrições de publicidade e claims relacionados."],
    },
];

export const APPROVAL_FLOW: Array<{ status: ApprovalStatus; label: string; owner: string; gate: string }> = [
    { status: "draft", label: "Rascunho técnico", owner: "P&D", gate: "Receita, porção, conteúdo líquido e ingredientes preenchidos." },
    { status: "quality", label: "Qualidade", owner: "Qualidade", gate: "Base de dados, arredondamentos, lote e pesos conferidos." },
    { status: "regulatory", label: "Regulatório", owner: "Assuntos regulatórios", gate: "País, idioma, claims, alergênicos, símbolos frontais e campos obrigatórios aprovados." },
    { status: "marketing", label: "Marketing", owner: "Marca", gate: "Texto comercial e embalagem compatíveis com as alegações permitidas." },
    { status: "approved", label: "Aprovado para arte final", owner: "Gestor", gate: "Versão travada para exportação, impressão e auditoria." },
];

const DAILY_VALUES: Record<InternationalMarket, Partial<Record<NutritionLine["key"], number>>> = {
    br: { energy: 2000, carbs: 300, sugarAdded: 50, protein: 50, fatTotal: 65, fatSat: 20, fiber: 25, sodium: 2000 },
    us: { energy: 2000, carbs: 275, sugarAdded: 50, protein: 50, fatTotal: 78, fatSat: 20, fiber: 28, sodium: 2300 },
    eu: { energy: 2000, carbs: 260, sugarTotal: 90, protein: 50, fatTotal: 70, fatSat: 20, salt: 6 },
    ca: { carbs: 275, sugarTotal: 100, protein: 50, fatTotal: 75, fatSat: 20, fatTrans: 20, fiber: 28, sodium: 2300 },
    mx: { energy: 2000, carbs: 275, sugarTotal: 90, protein: 50, fatTotal: 78, fatSat: 20, sodium: 2000 },
    cl: { energy: 2000, carbs: 300, sugarTotal: 90, protein: 50, fatTotal: 70, fatSat: 20, sodium: 2000 },
};

const NUTRIENT_ORDER: Record<InternationalMarket, Array<NutritionLine["key"]>> = {
    br: ["energy", "carbs", "sugarTotal", "sugarAdded", "protein", "fatTotal", "fatSat", "fatTrans", "fiber", "sodium"],
    us: ["energy", "fatTotal", "fatSat", "fatTrans", "sodium", "carbs", "fiber", "sugarTotal", "sugarAdded", "protein"],
    eu: ["energyKj", "energy", "fatTotal", "fatSat", "carbs", "sugarTotal", "protein", "salt"],
    ca: ["energy", "fatTotal", "fatSat", "fatTrans", "carbs", "fiber", "sugarTotal", "protein", "sodium"],
    mx: ["energy", "protein", "fatTotal", "fatSat", "fatTrans", "carbs", "sugarTotal", "fiber", "sodium"],
    cl: ["energy", "protein", "fatTotal", "fatSat", "carbs", "sugarTotal", "sodium"],
};

const NUTRIENT_LABELS: Record<InternationalMarket, Partial<Record<NutritionLine["key"], string>>> = {
    br: { energy: "Valor energético", carbs: "Carboidratos", sugarTotal: "Açúcares totais", sugarAdded: "Açúcares adicionados", protein: "Proteínas", fatTotal: "Gorduras totais", fatSat: "Gorduras saturadas", fatTrans: "Gorduras trans", fiber: "Fibra alimentar", sodium: "Sódio" },
    us: { energy: "Calories", carbs: "Total Carbohydrate", sugarTotal: "Total Sugars", sugarAdded: "Added Sugars", protein: "Protein", fatTotal: "Total Fat", fatSat: "Saturated Fat", fatTrans: "Trans Fat", fiber: "Dietary Fiber", sodium: "Sodium" },
    eu: { energyKj: "Energy", energy: "Energy", carbs: "Carbohydrate", sugarTotal: "Sugars", protein: "Protein", fatTotal: "Fat", fatSat: "Saturates", salt: "Salt" },
    ca: { energy: "Calories / Calories", carbs: "Carbohydrate / Glucides", sugarTotal: "Sugars / Sucres", protein: "Protein / Protéines", fatTotal: "Fat / Lipides", fatSat: "Saturated / saturés", fatTrans: "Trans / trans", fiber: "Fibre / Fibres", sodium: "Sodium" },
    mx: { energy: "Contenido energético", carbs: "Hidratos de carbono", sugarTotal: "Azúcares", protein: "Proteínas", fatTotal: "Grasas totales", fatSat: "Grasas saturadas", fatTrans: "Grasas trans", fiber: "Fibra dietética", sodium: "Sodio" },
    cl: { energy: "Energía", carbs: "Hidratos de carbono disponibles", sugarTotal: "Azúcares totales", protein: "Proteínas", fatTotal: "Grasa total", fatSat: "Grasas saturadas", sodium: "Sodio" },
};

export function calculateEnterpriseNutrients(table: EnterpriseTable) {
    const totals: EnterpriseNutrients = {
        energy: 0,
        carbs: 0,
        sugarTotal: 0,
        sugarAdded: 0,
        protein: 0,
        fatTotal: 0,
        fatSat: 0,
        fatTrans: 0,
        fiber: 0,
        sodium: 0,
    };

    let totalWeight = 0;

    for (const item of table.items) {
        const quantity = Number(item.quantity) || 0;
        if (quantity <= 0) continue;
        const scale = quantity / 100;
        totalWeight += quantity;
        totals.energy += (item.energy || 0) * scale;
        totals.carbs += (item.carbs || 0) * scale;
        totals.protein += (item.protein || 0) * scale;
        totals.fatTotal += (item.fatTotal || 0) * scale;
        totals.fatSat += (item.fatSat || 0) * scale;
        totals.fatTrans += (item.fatTrans || 0) * scale;
        totals.fiber += (item.fiber || 0) * scale;
        totals.sodium += (item.sodium || 0) * scale;
        totals.sugarTotal += (item.sugarTotal || 0) * scale;
        totals.sugarAdded += getAddedSugarValue(item) * scale;
    }

    return {
        totalWeight,
        per100g: scaleNutrients(totals, totalWeight > 0 ? 100 / totalWeight : 0),
        perPortion: scaleNutrients(totals, totalWeight > 0 ? table.portion / totalWeight : 0),
    };
}

function getAddedSugarValue(item: EnterpriseTableItem) {
    if (typeof item.sugarAdded === "number" && Number.isFinite(item.sugarAdded)) {
        return item.sugarAdded;
    }

    return item.isAddedSugar ? Math.max(item.sugarTotal || 0, item.carbs || 0) : 0;
}

export function inferFoodState(table: EnterpriseTable): FoodPhysicalState {
    const value = `${table.uom} ${table.householdMeasure}`.toLowerCase();
    return value.includes("ml") || value.includes("líquido") || value.includes("liquido") || value.includes("copo") ? "liquid" : "solid";
}

export function getNutritionLines(table: EnterpriseTable, market: InternationalMarket): NutritionLine[] {
    const nutrients = calculateEnterpriseNutrients(table);
    const order = NUTRIENT_ORDER[market];
    const labels = NUTRIENT_LABELS[market];
    const dvs = DAILY_VALUES[market];

    return order.map((key) => {
        const per100 = key === "energyKj"
            ? nutrients.per100g.energy * 4.184
            : key === "salt"
                ? nutrients.per100g.sodium * 2.5 / 1000
                : nutrients.per100g[key];
        const perPortion = key === "energyKj"
            ? nutrients.perPortion.energy * 4.184
            : key === "salt"
                ? nutrients.perPortion.sodium * 2.5 / 1000
                : nutrients.perPortion[key];
        const dailyValue = dvs[key];

        return {
            key,
            label: labels[key] || key,
            unit: getUnit(key),
            per100,
            perPortion,
            dailyValue,
            dailyValueLabel: dailyValue ? `${Math.round((perPortion / dailyValue) * 100)}%` : undefined,
            required: true,
        };
    });
}

export function getFrontWarnings(table: EnterpriseTable, market: InternationalMarket, state: FoodPhysicalState = inferFoodState(table)): FrontWarning[] {
    const { per100g } = calculateEnterpriseNutrients(table);
    const isLiquid = state === "liquid";
    const energyFromSugar = per100g.sugarTotal * 4;
    const energyFromSat = per100g.fatSat * 9;
    const energyFromTrans = per100g.fatTrans * 9;

    if (market === "br") {
        const limits = isLiquid
            ? { sugarAdded: 7.5, fatSat: 3, sodium: 300 }
            : { sugarAdded: 15, fatSat: 6, sodium: 600 };
        return [
            warning("HIGH_ADDED_SUGAR", "ALTO EM AÇÚCAR ADICIONADO", per100g.sugarAdded >= limits.sugarAdded, `${formatNumber(per100g.sugarAdded)} g`, `>= ${formatNumber(limits.sugarAdded)} g/100 ${isLiquid ? "ml" : "g"}`),
            warning("HIGH_SAT_FAT", "ALTO EM GORDURA SATURADA", per100g.fatSat >= limits.fatSat, `${formatNumber(per100g.fatSat)} g`, `>= ${formatNumber(limits.fatSat)} g/100 ${isLiquid ? "ml" : "g"}`),
            warning("HIGH_SODIUM", "ALTO EM SÓDIO", per100g.sodium >= limits.sodium, `${Math.round(per100g.sodium)} mg`, `>= ${limits.sodium} mg/100 ${isLiquid ? "ml" : "g"}`),
        ];
    }

    if (market === "cl") {
        const limits = isLiquid
            ? { energy: 70, sodium: 100, sugarTotal: 5, fatSat: 3 }
            : { energy: 275, sodium: 400, sugarTotal: 10, fatSat: 4 };
        return [
            warning("HIGH_CALORIES", "ALTO EN CALORÍAS", per100g.energy > limits.energy, `${Math.round(per100g.energy)} kcal`, `> ${limits.energy} kcal/100 ${isLiquid ? "ml" : "g"}`),
            warning("HIGH_SUGAR", "ALTO EN AZÚCARES", per100g.sugarTotal > limits.sugarTotal, `${formatNumber(per100g.sugarTotal)} g`, `> ${formatNumber(limits.sugarTotal)} g/100 ${isLiquid ? "ml" : "g"}`),
            warning("HIGH_SAT_FAT", "ALTO EN GRASAS SATURADAS", per100g.fatSat > limits.fatSat, `${formatNumber(per100g.fatSat)} g`, `> ${formatNumber(limits.fatSat)} g/100 ${isLiquid ? "ml" : "g"}`),
            warning("HIGH_SODIUM", "ALTO EN SODIO", per100g.sodium > limits.sodium, `${Math.round(per100g.sodium)} mg`, `> ${limits.sodium} mg/100 ${isLiquid ? "ml" : "g"}`),
        ];
    }

    if (market === "mx") {
        return [
            warning("EXCESS_CALORIES", "EXCESO CALORÍAS", isLiquid ? per100g.energy >= 70 : per100g.energy >= 275, `${Math.round(per100g.energy)} kcal`, isLiquid ? ">= 70 kcal/100 ml" : ">= 275 kcal/100 g"),
            warning("EXCESS_SUGAR", "EXCESO AZÚCARES", per100g.energy > 0 && energyFromSugar / per100g.energy >= 0.1, `${Math.round((energyFromSugar / Math.max(per100g.energy, 1)) * 100)}% kcal`, ">= 10% da energia"),
            warning("EXCESS_SAT_FAT", "EXCESO GRASAS SATURADAS", per100g.energy > 0 && energyFromSat / per100g.energy >= 0.1, `${Math.round((energyFromSat / Math.max(per100g.energy, 1)) * 100)}% kcal`, ">= 10% da energia"),
            warning("EXCESS_TRANS_FAT", "EXCESO GRASAS TRANS", per100g.energy > 0 && energyFromTrans / per100g.energy >= 0.01, `${Math.round((energyFromTrans / Math.max(per100g.energy, 1)) * 100)}% kcal`, ">= 1% da energia"),
            warning("EXCESS_SODIUM", "EXCESO SODIO", per100g.sodium >= 300 || per100g.sodium / Math.max(per100g.energy, 1) >= 1, `${Math.round(per100g.sodium)} mg`, ">= 300 mg/100 g/ml ou >= 1 mg/kcal"),
        ];
    }

    if (market === "ca") {
        const satTrans = per100g.fatSat + per100g.fatTrans;
        return [
            warning("HIGH_SAT_FAT_CA", "HIGH IN SATURATED FAT / ÉLEVÉ EN GRAS SATURÉS", satTrans >= 3, `${formatNumber(satTrans)} g`, ">= 15% DV por porção de referência"),
            warning("HIGH_SUGARS_CA", "HIGH IN SUGARS / ÉLEVÉ EN SUCRES", per100g.sugarTotal >= 15, `${formatNumber(per100g.sugarTotal)} g`, ">= 15% DV por porção de referência"),
            warning("HIGH_SODIUM_CA", "HIGH IN SODIUM / ÉLEVÉ EN SODIUM", per100g.sodium >= 345, `${Math.round(per100g.sodium)} mg`, ">= 15% DV por porção de referência"),
        ];
    }

    return [];
}

export function validateEnterpriseTable(
    table: EnterpriseTable,
    market: InternationalMarket,
    state: FoodPhysicalState = inferFoodState(table),
    legalData: LegalLabelData = {}
): ValidationItem[] {
    const { totalWeight } = calculateEnterpriseNutrients(table);
    const items: ValidationItem[] = [];
    const marketConfig = getMarketRules(market);
    const frontWarnings = getFrontWarnings(table, market, state).filter((item) => item.triggered);

    addCheck(items, table.title.trim().length > 0, "Nome do produto", "Produto sem título não deve ir para aprovação.");
    addCheck(items, table.portion > 0, "Porção", "Informe porção válida antes de exportar ou aprovar.");
    addCheck(items, table.householdMeasure.trim().length > 0, "Medida caseira", "Medida caseira é obrigatória ou crítica para a declaração de porção.");
    addCheck(items, table.items.length > 0 && totalWeight > 0, "Fórmula", "Adicione ingredientes com quantidade para calcular a tabela.");
    addCheck(items, !!table.packageContent && table.packageContent > 0, "Conteúdo da embalagem", "Informe conteúdo líquido para calcular porções, rótulo e auditoria.");
    addLegalRequirementChecks(items, market, legalData);

    items.push({
        level: "ok",
        title: "Base legal selecionada",
        detail: `${marketConfig.authority}: ${marketConfig.legalBase.join(", ")}.`,
    });

    if (frontWarnings.length > 0) {
        items.push({
            level: "warning",
            title: "Rotulagem frontal",
            detail: `Símbolos exigem atenção: ${frontWarnings.map((item) => item.label).join(", ")}.`,
        });
    } else if (market === "br" || market === "mx" || market === "cl" || market === "ca") {
        items.push({
            level: "ok",
            title: "Rotulagem frontal",
            detail: "Nenhum gatilho frontal identificado pelos limites principais deste país.",
        });
    }

    if (market === "us") {
        items.push({
            level: "warning",
            title: "RACC/serving size",
            detail: "A FDA exige serving size baseado na categoria RACC. O sistema sinaliza, mas a categoria exata ainda deve ser escolhida pelo responsável regulatório.",
        });
        items.push({
            level: "blocker",
            title: "Micronutrientes obrigatórios FDA",
            detail: legalData.mandatoryMicronutrients?.trim()
                ? "Micronutrientes obrigatórios declarados para revisão."
                : "Vitamina D, cálcio, ferro e potássio não estão completos no resumo enterprise atual. Não liberar arte dos EUA sem esses dados.",
        });
    }

    if (market === "eu") {
        items.push({
            level: "ok",
            title: "Ordem UE",
            detail: "Tabela preparada na ordem: energia, gorduras, saturadas, carboidratos, açúcares, proteínas e sal.",
        });
        items.push({
            level: "warning",
            title: "Estado-Membro",
            detail: "Conferir idioma obrigatório do país de venda e regras nacionais adicionais.",
        });
    }

    if (market === "ca") {
        items.push({
            level: "warning",
            title: "Bilingue Canadá",
            detail: "Rótulo deve sair em inglês e francês; porção deve seguir a tabela canadense de quantidades de referência.",
        });
        items.push({
            level: "blocker",
            title: "Minerais obrigatórios Canadá",
            detail: legalData.mandatoryMicronutrients?.trim()
                ? "Minerais obrigatórios canadenses declarados para revisão."
                : "Potássio, cálcio e ferro precisam estar completos antes da arte final canadense.",
        });
    }

    if (market === "mx") {
        items.push({
            level: "warning",
            title: "Advertências adicionais NOM-051",
            detail: "Cafeína e edulcorantes exigem dados de formulação que não existem no cálculo nutricional atual.",
        });
    }

    if (market === "cl") {
        items.push({
            level: "warning",
            title: "Nutriente adicionado",
            detail: "No Chile, o octógono depende também de adição de açúcares, sódio ou gorduras saturadas. Conferir formulação declaratória.",
        });
    }

    return items;
}

export function getClaimChecks(table: EnterpriseTable, market: InternationalMarket): ClaimCheck[] {
    const { perPortion, per100g } = calculateEnterpriseNutrients(table);

    if (market === "eu") {
        return [
            claim("Fonte de fibra / Source of fibre", per100g.fiber >= 3, per100g.fiber >= 2.5, `${formatNumber(per100g.fiber)} g de fibra por 100 g. Regra UE: 3 g/100 g ou 1,5 g/100 kcal.`),
            claim("Alto teor de fibra / High fibre", per100g.fiber >= 6, per100g.fiber >= 5, `${formatNumber(per100g.fiber)} g de fibra por 100 g. Regra UE: 6 g/100 g ou 3 g/100 kcal.`),
            claim("Baixo teor de gordura / Low fat", per100g.fatTotal <= 3, per100g.fatTotal <= 4, `${formatNumber(per100g.fatTotal)} g de gordura por 100 g.`),
            claim("Baixo teor de açúcar / Low sugars", per100g.sugarTotal <= 5, per100g.sugarTotal <= 6, `${formatNumber(per100g.sugarTotal)} g de açúcares por 100 g.`),
        ];
    }

    return [
        claim("Fonte de fibras", perPortion.fiber >= 2.5, perPortion.fiber >= 2, `${formatNumber(perPortion.fiber)} g de fibras por porção.`),
        claim("Alto em proteínas", perPortion.protein >= 10, perPortion.protein >= 7, `${formatNumber(perPortion.protein)} g de proteínas por porção.`),
        claim("Baixo sódio", per100g.sodium <= 120, per100g.sodium <= 180, `${Math.round(per100g.sodium)} mg de sódio por 100 g.`),
        claim("Sem gordura trans", perPortion.fatTrans < 0.1, perPortion.fatTrans < 0.2, `${formatNumber(perPortion.fatTrans)} g de gorduras trans por porção.`),
    ];
}

export function getReformulationSuggestions(
    table: EnterpriseTable,
    market: InternationalMarket,
    state: FoodPhysicalState = inferFoodState(table)
) {
    const { per100g, perPortion } = calculateEnterpriseNutrients(table);
    const frontWarnings = getFrontWarnings(table, market, state).filter((item) => item.triggered);
    const suggestions: Array<{ title: string; detail: string; impact: string }> = [];

    for (const item of frontWarnings) {
        suggestions.push({
            title: `Remover gatilho: ${item.label}`,
            detail: "Reformular ingrediente crítico, recalcular porção e conferir se o limite local deixou de ser acionado.",
            impact: `Atual: ${item.value}. Limite: ${item.limit}.`,
        });
    }

    if (perPortion.fiber < 2.5) {
        suggestions.push({
            title: "Aumentar fibras",
            detail: "Adicionar ingrediente fonte de fibra e recalcular textura, umidade e porção.",
            impact: `Atual: ${formatNumber(perPortion.fiber)} g/porção. Meta comercial comum: 2,5 g ou mais.`,
        });
    }

    if (per100g.fatTrans > 0.1) {
        suggestions.push({
            title: "Reduzir gordura trans",
            detail: "Revisar gordura vegetal, coberturas e bases industriais.",
            impact: `Atual: ${formatNumber(per100g.fatTrans)} g/100 g.`,
        });
    }

    if (suggestions.length === 0) {
        suggestions.push({
            title: "Produto bem posicionado",
            detail: "Usar fluxo de aprovação e passaporte digital para capturar valor com clientes enterprise.",
            impact: "Sem gatilho nutricional crítico nos limites principais.",
        });
    }

    return suggestions;
}

export function buildGs1DigitalLink(table: EnterpriseTable, gtin: string, lot?: string) {
    const cleanGtin = gtin.replace(/\D/g, "");
    const cleanLot = lot?.trim();
    const base = cleanGtin || "00000000000000";
    const url = new URL(`https://id.gs1.org/01/${base}`);
    if (cleanLot) {
        url.pathname += `/10/${encodeURIComponent(cleanLot)}`;
    }
    url.searchParams.set("produto", table.title || "produto");
    return url.toString();
}

export function buildProductPassport(
    table: EnterpriseTable,
    market: InternationalMarket,
    gtin: string,
    lot?: string,
    state: FoodPhysicalState = inferFoodState(table),
    legalData: LegalLabelData = {}
) {
    const marketConfig = getMarketRules(market);
    const nutrients = calculateEnterpriseNutrients(table);

    return {
        product: {
            id: table.id,
            title: table.title,
            gtin: gtin.replace(/\D/g, ""),
            lot: lot?.trim() || null,
            market: marketConfig.label,
            regulatoryAuthority: marketConfig.authority,
            legalBase: marketConfig.legalBase,
            foodPhysicalState: state,
            legal: legalData,
        },
        nutrition: {
            serving: {
                amount: table.portion,
                unit: table.uom || "g",
                householdMeasure: table.householdMeasure,
                servingsPerPackage: table.servingsPerPackage || null,
            },
            per100g: roundNutrients(nutrients.per100g),
            perPortion: roundNutrients(nutrients.perPortion),
            marketLines: getNutritionLines(table, market),
        },
        frontWarnings: getFrontWarnings(table, market, state),
        validations: validateEnterpriseTable(table, market, state, legalData),
        ingredients: table.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            addedSugarSource: !!item.isAddedSugar,
        })),
        approvalFlow: APPROVAL_FLOW,
        generatedAt: new Date().toISOString(),
    };
}

export function getMarketRules(market: InternationalMarket) {
    return INTERNATIONAL_MARKETS.find((item) => item.value === market) || INTERNATIONAL_MARKETS[0];
}

function warning(code: string, label: string, triggered: boolean, value: string, limit: string): FrontWarning {
    return { code, label, triggered, value, limit };
}

function claim(label: string, eligible: boolean, attention: boolean, detail: string): ClaimCheck {
    return {
        label,
        status: eligible ? "eligible" : attention ? "attention" : "not-eligible",
        detail,
    };
}

function addLegalRequirementChecks(items: ValidationItem[], market: InternationalMarket, data: LegalLabelData) {
    const generalRequired: Array<[keyof LegalLabelData, string, string]> = [
        ["legalName", "Denominação legal", "Informe a denominação legal/statement of identity do produto."],
        ["ingredientsStatement", "Lista de ingredientes", "Informe a lista de ingredientes na ordem exigida pelo mercado."],
        ["allergenStatement", "Alérgenos", "Declare alérgenos obrigatórios/priority allergens conforme o país."],
        ["netQuantity", "Conteúdo líquido", "Declare conteúdo líquido/net quantity no padrão local."],
        ["lotCode", "Lote", "Informe o número/código de lote."],
        ["dateMarking", "Validade", "Informe validade, best before, expiration date ou consumo preferente."],
        ["responsibleName", "Responsável", "Informe fabricante, distribuidor, importador ou operador responsável."],
        ["responsibleAddress", "Endereço do responsável", "Informe endereço completo do responsável no mercado."],
        ["language", "Idioma obrigatório", "Confirme o idioma obrigatório do mercado de venda."],
        ["category", "Categoria regulatória", "Informe a categoria para validar porção, exceções, claims e símbolos."],
    ];

    for (const [field, title, detail] of generalRequired) {
        addCheck(items, hasValue(data[field]), title, detail);
    }

    if (market === "us") {
        addMarketChecks(items, data, [
            ["referenceAmount", "RACC", "Informe a Reference Amount Customarily Consumed da categoria."],
            ["mandatoryMicronutrients", "Vitaminas/minerais FDA", "Declare Vitamin D, calcium, iron e potassium."],
            ["claimsEvidence", "Evidência de claims", "Guarde base de cálculo e suporte para qualquer claim comercial."],
        ]);
    }

    if (market === "eu") {
        addMarketChecks(items, data, [
            ["memberState", "Estado-Membro", "Informe o país de venda para idioma e regras nacionais."],
            ["countryOfOrigin", "Origem/proveniência", "Preencha origem quando a omissão puder induzir erro ou quando exigida."],
            ["storageInstructions", "Conservação", "Informe condições especiais de conservação/uso quando necessárias."],
            ["preparationInstructions", "Instruções de uso", "Informe modo de preparo quando a falta dificultar uso adequado."],
            ["quidStatement", "QUID", "Declare percentual de ingrediente destacado quando aplicável."],
            ["claimsEvidence", "Evidência de claims UE", "Valide claims contra o Regulamento (EC) 1924/2006."],
        ]);
    }

    if (market === "ca") {
        addMarketChecks(items, data, [
            ["referenceAmount", "Reference amount", "Informe quantidade de referência canadense para serving of stated size."],
            ["mandatoryMicronutrients", "Minerais Canadá", "Declare potassium, calcium e iron conforme a tabela canadense."],
            ["importerName", "Importador Canadá", "Informe importador quando o produto for importado."],
            ["importerAddress", "Endereço do importador", "Informe endereço canadense quando aplicável."],
            ["frontSymbolSize", "Símbolo frontal Canadá", "Confirme tamanho/posição do símbolo conforme superfície disponível."],
        ]);
    }

    if (market === "mx") {
        addMarketChecks(items, data, [
            ["countryOfOrigin", "País de origem", "Informe país de origem quando aplicável."],
            ["caffeineAdded", "Cafeína", "Informe se há cafeína adicionada e a advertência aplicável."],
            ["sweetenersAdded", "Edulcorantes", "Informe se há edulcorantes e a leyenda precautoria aplicável."],
            ["childMarketingElements", "Elementos infantis", "Confirme ausência de personagens/elementos infantis quando houver selos ou edulcorantes."],
            ["frontSymbolSize", "Tamanho dos octógonos", "Confirme área de exibição e tamanho dos selos NOM-051."],
        ]);
    }

    if (market === "cl") {
        addMarketChecks(items, data, [
            ["countryOfOrigin", "Origem", "Informe origem/importador quando aplicável."],
            ["storageInstructions", "Conservação", "Informe condições especiais de conservação."],
            ["addedCriticalNutrients", "Nutriente adicionado", "Confirme se houve adição de açúcar, sódio ou gordura saturada para aplicar selos."],
            ["childMarketingElements", "Publicidade infantil", "Confirme restrições de publicidade/elementos infantis para produtos ALTO EN."],
            ["frontSymbolSize", "Tamanho dos discos pare", "Confirme tamanho/posição dos selos ALTO EN na arte."],
        ]);
    }
}

function addMarketChecks(
    items: ValidationItem[],
    data: LegalLabelData,
    checks: Array<[keyof LegalLabelData, string, string]>
) {
    for (const [field, title, detail] of checks) {
        addCheck(items, hasValue(data[field]), title, detail);
    }
}

function hasValue(value: unknown) {
    return typeof value === "string" ? value.trim().length > 0 : !!value;
}

function addCheck(items: ValidationItem[], condition: boolean, title: string, detail: string) {
    items.push({
        level: condition ? "ok" : "blocker",
        title,
        detail: condition ? "OK" : detail,
    });
}

function getUnit(key: NutritionLine["key"]) {
    if (key === "energy") return "kcal";
    if (key === "energyKj") return "kJ";
    if (key === "sodium") return "mg";
    return "g";
}

function scaleNutrients(nutrients: EnterpriseNutrients, factor: number): EnterpriseNutrients {
    return {
        energy: nutrients.energy * factor,
        carbs: nutrients.carbs * factor,
        sugarTotal: nutrients.sugarTotal * factor,
        sugarAdded: nutrients.sugarAdded * factor,
        protein: nutrients.protein * factor,
        fatTotal: nutrients.fatTotal * factor,
        fatSat: nutrients.fatSat * factor,
        fatTrans: nutrients.fatTrans * factor,
        fiber: nutrients.fiber * factor,
        sodium: nutrients.sodium * factor,
    };
}

function roundNutrients(nutrients: EnterpriseNutrients) {
    return Object.fromEntries(
        Object.entries(nutrients).map(([key, value]) => [key, Number(value.toFixed(key === "sodium" || key === "energy" ? 0 : 2))])
    );
}

export function formatNumber(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: value > 0 && value < 1 ? 1 : 0,
    }).format(value || 0);
}
