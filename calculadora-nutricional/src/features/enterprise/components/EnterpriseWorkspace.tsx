'use client'

import * as React from "react";
import {
    APPROVAL_FLOW,
    INTERNATIONAL_MARKETS,
    buildGs1DigitalLink,
    buildProductPassport,
    calculateEnterpriseNutrients,
    formatNumber,
    getClaimChecks,
    getFrontWarnings,
    getNutritionLines,
    getReformulationSuggestions,
    inferFoodState,
    validateEnterpriseTable,
    type ApprovalStatus,
    type EnterpriseLabelProjectSummary,
    type EnterpriseTable,
    type FoodPhysicalState,
    type InternationalMarket,
    type LegalLabelData,
} from "@/features/enterprise/domain/enterprise";
import {
    recordEnterpriseLabelExport,
    saveEnterpriseLabelProject,
} from "@/features/enterprise/actions/enterprise-label-actions";
import { InternationalNutritionLabel } from "@/features/enterprise/components/InternationalNutritionLabel";
import { Button } from "@/components/ui/button";
import { HelpTip } from "@/components/ui/help-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowUpRight,
    CheckCircle2,
    Copy,
    Download,
    FileJson,
    Link2,
    RotateCcw,
    Save,
    ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useSiteLanguage } from "@/features/i18n/components/LanguageSwitcher";
import type { SiteLanguage } from "@/features/i18n/domain/site-i18n";

interface EnterpriseWorkspaceProps {
    tables: EnterpriseTable[];
    projects: EnterpriseLabelProjectSummary[];
}

const STATUS_STYLES = {
    ok: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-950 dark:border-emerald-900/60 dark:from-emerald-950/35 dark:to-background dark:text-emerald-100",
    warning: "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-950 dark:border-amber-900/60 dark:from-amber-950/35 dark:to-background dark:text-amber-100",
    blocker: "border-red-200 bg-gradient-to-br from-red-50 to-white text-red-950 dark:border-red-900/60 dark:from-red-950/35 dark:to-background dark:text-red-100",
};

const CLAIM_STYLES = {
    eligible: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-950 dark:border-emerald-900/60 dark:from-emerald-950/35 dark:to-background dark:text-emerald-100",
    attention: "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-950 dark:border-amber-900/60 dark:from-amber-950/35 dark:to-background dark:text-amber-100",
    "not-eligible": "border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-700 dark:border-slate-800 dark:from-slate-900/70 dark:to-background dark:text-slate-300",
};

type LocalizedMetadata = LegalLabelData;
type LegalFieldDefinition = {
    field: keyof LegalLabelData;
    label: string;
    help: string;
    span?: string;
};

const ENTERPRISE_COPY = {
    "pt-BR": {
        firstTableTitle: "Enterprise",
        heading: "Adaptar rótulo por país",
        subheading: "Trabalhe em uma cópia local, confira o formato oficial e exporte sem tocar no rótulo brasileiro.",
        newProduct: "Novo produto",
        productBase: "Produto base",
        market: "País / região",
        foodBase: "Base do alimento",
        status: "Status",
        solid: "Sólido ou semissólido",
        liquid: "Líquido",
        countryLabel: "Rótulo do país",
        approval: "Aprovação",
        approvalDetail: "Etapa interna do rótulo local.",
        localCopy: "Cópia local",
        localCopyDraft: "Editando a versão do país. O original está preservado.",
        localCopyLocked: "Crie uma cópia para liberar ajustes locais.",
        createCopy: "Criar cópia",
        copyCreated: "Cópia criada",
        original: "Original",
        localName: "Nome local",
        legalName: "Nome legal no rótulo",
        portion: "Porção",
        unit: "Unidade",
        content: "Conteúdo",
        localMeasure: "Medida local",
        servings: "Porções por embalagem",
        category: "Categoria local",
        labelLanguage: "Idioma do rótulo",
        intendedClaims: "Claims pretendidos",
        adjustmentNotes: "Notas de ajuste",
        pending: "Pendências",
        blockers: "bloqueio(s)",
        alerts: "alerta(s)",
        front: "Frontal",
        activeSymbols: "símbolo(s) ativo(s).",
        noSymbol: "Sem símbolo ativo.",
        noFrontSymbol: "Sem símbolo frontal obrigatório geral neste mercado.",
        current: "Atual",
        limit: "Limite",
        howToAdjust: "Como ajustar",
        howToAdjustDetail: "Ações práticas para resolver o que o país está pedindo.",
        technicalTable: "Tabela técnica",
        nutrient: "Nutriente",
        perServing: "Porção",
        claims: "Claims",
        claimsDetail: "Oportunidades comerciais possíveis.",
        reformulation: "Reformulação",
        reformulationDetail: "Ajustes que mais mexem no rótulo.",
        gs1Detail: "Link técnico para passaporte do produto.",
        lot: "Lote",
        copy: "Copiar",
        saveVersion: "Salvar versão",
        saving: "Salvando...",
        versionSaved: "Versão salva",
        savedVersion: "Versão persistida no banco.",
    },
    "en-US": {
        firstTableTitle: "Enterprise",
        heading: "Adapt label by country",
        subheading: "Work on a local copy, check the official format, and export without changing the Brazilian label.",
        newProduct: "New product",
        productBase: "Base product",
        market: "Country / region",
        foodBase: "Food basis",
        status: "Status",
        solid: "Solid or semi-solid",
        liquid: "Liquid",
        countryLabel: "Country label",
        approval: "Approval",
        approvalDetail: "Internal step for the local label.",
        localCopy: "Local copy",
        localCopyDraft: "Editing this country version. The original is preserved.",
        localCopyLocked: "Create a copy to unlock local adjustments.",
        createCopy: "Create copy",
        copyCreated: "Copy created",
        original: "Original",
        localName: "Local name",
        legalName: "Legal label name",
        portion: "Serving",
        unit: "Unit",
        content: "Net content",
        localMeasure: "Local household measure",
        servings: "Servings per container",
        category: "Local category",
        labelLanguage: "Label language",
        intendedClaims: "Intended claims",
        adjustmentNotes: "Adjustment notes",
        pending: "Issues",
        blockers: "blocker(s)",
        alerts: "alert(s)",
        front: "Front-of-pack",
        activeSymbols: "active symbol(s).",
        noSymbol: "No active symbol.",
        noFrontSymbol: "No general mandatory front-of-pack symbol in this market.",
        current: "Current",
        limit: "Limit",
        howToAdjust: "How to adjust",
        howToAdjustDetail: "Practical actions to solve what the country requires.",
        technicalTable: "Technical table",
        nutrient: "Nutrient",
        perServing: "Serving",
        claims: "Claims",
        claimsDetail: "Possible commercial opportunities.",
        reformulation: "Reformulation",
        reformulationDetail: "Changes with the greatest label impact.",
        gs1Detail: "Technical link for the product passport.",
        lot: "Lot",
        copy: "Copy",
        saveVersion: "Save version",
        saving: "Saving...",
        versionSaved: "Version saved",
        savedVersion: "Version persisted in the database.",
    },
    "es-MX": {
        firstTableTitle: "Empresarial",
        heading: "Adaptar etiqueta por país",
        subheading: "Trabaje en una copia local, revise el formato oficial y exporte sin alterar la etiqueta brasileña.",
        newProduct: "Nuevo producto",
        productBase: "Producto base",
        market: "País / región",
        foodBase: "Base del alimento",
        status: "Estado",
        solid: "Sólido o semisólido",
        liquid: "Líquido",
        countryLabel: "Etiqueta del país",
        approval: "Aprobación",
        approvalDetail: "Etapa interna de la etiqueta local.",
        localCopy: "Copia local",
        localCopyDraft: "Editando la versión del país. El original está preservado.",
        localCopyLocked: "Cree una copia para liberar ajustes locales.",
        createCopy: "Crear copia",
        copyCreated: "Copia creada",
        original: "Original",
        localName: "Nombre local",
        legalName: "Nombre legal en etiqueta",
        portion: "Porción",
        unit: "Unidad",
        content: "Contenido neto",
        localMeasure: "Medida local",
        servings: "Porciones por envase",
        category: "Categoría local",
        labelLanguage: "Idioma de la etiqueta",
        intendedClaims: "Claims previstos",
        adjustmentNotes: "Notas de ajuste",
        pending: "Pendientes",
        blockers: "bloqueo(s)",
        alerts: "alerta(s)",
        front: "Frontal",
        activeSymbols: "símbolo(s) activo(s).",
        noSymbol: "Sin símbolo activo.",
        noFrontSymbol: "Sin símbolo frontal obligatorio general en este mercado.",
        current: "Actual",
        limit: "Límite",
        howToAdjust: "Cómo ajustar",
        howToAdjustDetail: "Acciones prácticas para resolver lo que pide el país.",
        technicalTable: "Tabla técnica",
        nutrient: "Nutrimento",
        perServing: "Porción",
        claims: "Claims",
        claimsDetail: "Posibles oportunidades comerciales.",
        reformulation: "Reformulación",
        reformulationDetail: "Ajustes con mayor impacto en la etiqueta.",
        gs1Detail: "Enlace técnico para el pasaporte del producto.",
        lot: "Lote",
        copy: "Copiar",
        saveVersion: "Guardar versión",
        saving: "Guardando...",
        versionSaved: "Versión guardada",
        savedVersion: "Versión persistida en la base de datos.",
    },
    "es-CL": {
        firstTableTitle: "Empresarial",
        heading: "Adaptar etiqueta por país",
        subheading: "Trabaje en una copia local, revise el formato oficial y exporte sin alterar la etiqueta brasileña.",
        newProduct: "Nuevo producto",
        productBase: "Producto base",
        market: "País / región",
        foodBase: "Base del alimento",
        status: "Estado",
        solid: "Sólido o semisólido",
        liquid: "Líquido",
        countryLabel: "Etiqueta del país",
        approval: "Aprobación",
        approvalDetail: "Etapa interna de la etiqueta local.",
        localCopy: "Copia local",
        localCopyDraft: "Editando la versión del país. El original está preservado.",
        localCopyLocked: "Cree una copia para liberar ajustes locales.",
        createCopy: "Crear copia",
        copyCreated: "Copia creada",
        original: "Original",
        localName: "Nombre local",
        legalName: "Nombre legal en etiqueta",
        portion: "Porción",
        unit: "Unidad",
        content: "Contenido neto",
        localMeasure: "Medida local",
        servings: "Porciones por envase",
        category: "Categoría local",
        labelLanguage: "Idioma de la etiqueta",
        intendedClaims: "Declaraciones previstas",
        adjustmentNotes: "Notas de ajuste",
        pending: "Pendientes",
        blockers: "bloqueo(s)",
        alerts: "alerta(s)",
        front: "Frontal",
        activeSymbols: "símbolo(s) activo(s).",
        noSymbol: "Sin símbolo activo.",
        noFrontSymbol: "Sin símbolo frontal obligatorio general en este mercado.",
        current: "Actual",
        limit: "Límite",
        howToAdjust: "Cómo ajustar",
        howToAdjustDetail: "Acciones prácticas para resolver lo que pide el país.",
        technicalTable: "Tabla técnica",
        nutrient: "Nutriente",
        perServing: "Porción",
        claims: "Declaraciones",
        claimsDetail: "Posibles oportunidades comerciales.",
        reformulation: "Reformulación",
        reformulationDetail: "Ajustes con mayor impacto en la etiqueta.",
        gs1Detail: "Enlace técnico para el pasaporte del producto.",
        lot: "Lote",
        copy: "Copiar",
        saveVersion: "Guardar versión",
        saving: "Guardando...",
        versionSaved: "Versión guardada",
        savedVersion: "Versión persistida en la base de datos.",
    },
    "fr-CA": {
        firstTableTitle: "Entreprise",
        heading: "Adapter l’étiquette par pays",
        subheading: "Travaillez sur une copie locale, vérifiez le format officiel et exportez sans modifier l’étiquette brésilienne.",
        newProduct: "Nouveau produit",
        productBase: "Produit de base",
        market: "Pays / région",
        foodBase: "Base de l’aliment",
        status: "Statut",
        solid: "Solide ou semi-solide",
        liquid: "Liquide",
        countryLabel: "Étiquette du pays",
        approval: "Approbation",
        approvalDetail: "Étape interne pour l’étiquette locale.",
        localCopy: "Copie locale",
        localCopyDraft: "Modification de la version du pays. L’original est conservé.",
        localCopyLocked: "Créez une copie pour activer les ajustements locaux.",
        createCopy: "Créer une copie",
        copyCreated: "Copie créée",
        original: "Original",
        localName: "Nom local",
        legalName: "Nom légal sur l’étiquette",
        portion: "Portion",
        unit: "Unité",
        content: "Contenu net",
        localMeasure: "Mesure locale",
        servings: "Portions par contenant",
        category: "Catégorie locale",
        labelLanguage: "Langue de l’étiquette",
        intendedClaims: "Allégations prévues",
        adjustmentNotes: "Notes d’ajustement",
        pending: "Points à régler",
        blockers: "blocage(s)",
        alerts: "alerte(s)",
        front: "Symbole frontal",
        activeSymbols: "symbole(s) actif(s).",
        noSymbol: "Aucun symbole actif.",
        noFrontSymbol: "Aucun symbole frontal obligatoire général dans ce marché.",
        current: "Actuel",
        limit: "Limite",
        howToAdjust: "Comment ajuster",
        howToAdjustDetail: "Actions pratiques pour répondre aux exigences du pays.",
        technicalTable: "Tableau technique",
        nutrient: "Nutriment",
        perServing: "Portion",
        claims: "Allégations",
        claimsDetail: "Possibilités commerciales.",
        reformulation: "Reformulation",
        reformulationDetail: "Ajustements ayant le plus d’effet sur l’étiquette.",
        gs1Detail: "Lien technique pour le passeport du produit.",
        lot: "Lot",
        copy: "Copier",
        saveVersion: "Enregistrer la version",
        saving: "Enregistrement...",
        versionSaved: "Version enregistrée",
        savedVersion: "Version persistée en base de données.",
    },
} satisfies Record<SiteLanguage, Record<string, string>>;

export function EnterpriseWorkspace({ tables, projects }: EnterpriseWorkspaceProps) {
    const { language } = useSiteLanguage();
    const copy = ENTERPRISE_COPY[language];
    const [isSaving, startSaving] = React.useTransition();
    const [selectedTableId, setSelectedTableId] = React.useState(tables[0]?.id || "");
    const [market, setMarket] = React.useState<InternationalMarket>("us");
    const [foodState, setFoodState] = React.useState<FoodPhysicalState>("solid");
    const [approvalStatus, setApprovalStatus] = React.useState<ApprovalStatus>("draft");
    const [gtin, setGtin] = React.useState("");
    const [lot, setLot] = React.useState("");
    const [localizedDrafts, setLocalizedDrafts] = React.useState<Record<string, EnterpriseTable>>({});
    const [localizedMetadata, setLocalizedMetadata] = React.useState<Record<string, LocalizedMetadata>>({});
    const [savedProjects, setSavedProjects] = React.useState<EnterpriseLabelProjectSummary[]>(projects);

    const selectedTable = React.useMemo(
        () => tables.find((table) => table.id === selectedTableId) || tables[0],
        [selectedTableId, tables]
    );

    const marketConfig = INTERNATIONAL_MARKETS.find((item) => item.value === market) || INTERNATIONAL_MARKETS[0];
    const draftKey = selectedTable ? `${selectedTable.id}:${market}` : "";
    const localizedDraft = draftKey ? localizedDrafts[draftKey] : undefined;
    const metadata = draftKey ? localizedMetadata[draftKey] : undefined;
    const workingTable = localizedDraft || selectedTable;
    const isLocalizedDraft = !!localizedDraft;
    const savedProject = React.useMemo(
        () => savedProjects.find((project) => project.baseTableId === selectedTable?.id && project.market === market),
        [market, savedProjects, selectedTable?.id]
    );

    React.useEffect(() => {
        if (!selectedTable || !draftKey) return;

        const savedVersion = savedProject?.currentVersion;
        if (savedVersion) {
            setLocalizedDrafts((current) => ({
                ...current,
                [draftKey]: current[draftKey] || savedVersion.tableSnapshot,
            }));
            setLocalizedMetadata((current) => ({
                ...current,
                [draftKey]: current[draftKey] || savedVersion.legalData,
            }));
            setApprovalStatus(savedVersion.approvalStatus);
            setFoodState(savedVersion.foodState);
            return;
        }

        setFoodState(inferFoodState(selectedTable));
    }, [draftKey, savedProject, selectedTable]);

    const analysis = React.useMemo(() => {
        if (!workingTable) return null;
        return {
            nutrients: calculateEnterpriseNutrients(workingTable),
            validations: validateEnterpriseTable(workingTable, market, foodState, metadata || {}),
            claims: getClaimChecks(workingTable, market),
            suggestions: getReformulationSuggestions(workingTable, market, foodState),
            nutritionLines: getNutritionLines(workingTable, market),
            frontWarnings: getFrontWarnings(workingTable, market, foodState),
            gs1Link: buildGs1DigitalLink(workingTable, gtin, lot),
            passport: buildProductPassport(workingTable, market, gtin, lot, foodState, metadata || {}),
        };
    }, [foodState, gtin, lot, market, metadata, workingTable]);

    const totals = React.useMemo(() => {
        if (!analysis) return { ok: 0, warning: 0, blocker: 0 };
        return analysis.validations.reduce(
            (acc, item) => ({ ...acc, [item.level]: acc[item.level] + 1 }),
            { ok: 0, warning: 0, blocker: 0 }
        );
    }, [analysis]);

    const activeApprovalIndex = APPROVAL_FLOW.findIndex((item) => item.status === approvalStatus);

    const createLocalizedDraft = () => {
        if (!selectedTable || !draftKey) return;
        setLocalizedDrafts((current) => ({
            ...current,
            [draftKey]: {
                ...selectedTable,
                id: `${selectedTable.id}-${market}-draft`,
                title: `${selectedTable.title || "Product"} - ${getMarketLabel(market, language)}`,
                householdMeasure: getLocalizedMeasure(selectedTable.householdMeasure, market),
                servingsPerPackage: getLocalizedServings(selectedTable.servingsPerPackage, market),
            },
        }));
        setLocalizedMetadata((current) => ({
            ...current,
            [draftKey]: {
                legalName: `${selectedTable.title || "Product"} - ${getMarketLabel(market, language)}`,
                category: "",
                language: marketConfig.languageRequirement,
                intendedClaims: "",
                adjustmentNotes: "",
            },
        }));
        setFoodState(inferFoodState(selectedTable));
        toast.success(copy.localCopyDraft);
    };

    const resetLocalizedDraft = () => {
        if (!draftKey) return;
        setLocalizedDrafts((current) => {
            const next = { ...current };
            delete next[draftKey];
            return next;
        });
        setLocalizedMetadata((current) => {
            const next = { ...current };
            delete next[draftKey];
            return next;
        });
        toast.success(copy.original);
    };

    const updateLocalizedDraft = <K extends keyof EnterpriseTable>(field: K, value: EnterpriseTable[K]) => {
        if (!draftKey || !workingTable) return;
        setLocalizedDrafts((current) => ({
            ...current,
            [draftKey]: {
                ...workingTable,
                [field]: value,
            },
        }));
    };

    const updateMetadata = <K extends keyof LocalizedMetadata>(field: K, value: LocalizedMetadata[K]) => {
        if (!draftKey) return;
        setLocalizedMetadata((current) => ({
            ...current,
            [draftKey]: {
                legalName: metadata?.legalName || workingTable?.title || "",
                category: metadata?.category || "",
                language: metadata?.language || marketConfig.languageRequirement,
                intendedClaims: metadata?.intendedClaims || "",
                adjustmentNotes: metadata?.adjustmentNotes || "",
                ingredientsStatement: metadata?.ingredientsStatement || "",
                allergenStatement: metadata?.allergenStatement || "",
                netQuantity: metadata?.netQuantity || "",
                drainedWeight: metadata?.drainedWeight || "",
                lotCode: metadata?.lotCode || "",
                dateMarking: metadata?.dateMarking || "",
                responsibleName: metadata?.responsibleName || "",
                responsibleAddress: metadata?.responsibleAddress || "",
                importerName: metadata?.importerName || "",
                importerAddress: metadata?.importerAddress || "",
                countryOfOrigin: metadata?.countryOfOrigin || "",
                storageInstructions: metadata?.storageInstructions || "",
                preparationInstructions: metadata?.preparationInstructions || "",
                packageDisplayArea: metadata?.packageDisplayArea || "",
                referenceAmount: metadata?.referenceAmount || "",
                mandatoryMicronutrients: metadata?.mandatoryMicronutrients || "",
                claimsEvidence: metadata?.claimsEvidence || "",
                childMarketingElements: metadata?.childMarketingElements || "",
                caffeineAdded: metadata?.caffeineAdded || "",
                sweetenersAdded: metadata?.sweetenersAdded || "",
                addedCriticalNutrients: metadata?.addedCriticalNutrients || "",
                memberState: metadata?.memberState || "",
                quidStatement: metadata?.quidStatement || "",
                alcoholVolume: metadata?.alcoholVolume || "",
                organicOrSpecialSeals: metadata?.organicOrSpecialSeals || "",
                frontSymbolSize: metadata?.frontSymbolSize || "",
                [field]: value,
            },
        }));
    };

    const saveCurrentVersion = () => {
        if (!selectedTable || !workingTable) return;

        startSaving(async () => {
            const result = await saveEnterpriseLabelProject({
                baseTableId: selectedTable.id,
                market,
                foodState,
                approvalStatus,
                table: workingTable,
                legalData: metadata || {},
                gtin,
                lot,
                notes: metadata?.adjustmentNotes,
            });

            if (result.error || !result.project) {
                toast.error(result.error || "Não foi possível salvar a versão Enterprise.");
                return;
            }

            const savedProjectResult = result.project;
            setSavedProjects((current) => upsertProject(current, savedProjectResult));
            setLocalizedDrafts((current) => ({
                ...current,
                [draftKey]: savedProjectResult.currentVersion?.tableSnapshot || workingTable,
            }));
            setLocalizedMetadata((current) => ({
                ...current,
                [draftKey]: savedProjectResult.currentVersion?.legalData || metadata || {},
            }));
            toast.success(copy.versionSaved);
        });
    };

    const recordExport = (exportType: "PNG" | "JSON" | "GS1_DIGITAL_LINK", fileName?: string, payload?: unknown) => {
        if (!savedProject) return;
        void recordEnterpriseLabelExport({
            projectId: savedProject.id,
            versionId: savedProject.currentVersionId,
            exportType,
            fileName,
            payload,
        });
    };

    const downloadPassport = () => {
        if (!analysis || !workingTable) return;
        const fileName = `passaporte-digital-${workingTable.title || workingTable.id}.json`;
        const blob = new Blob([JSON.stringify(analysis.passport, null, 2)], {
            type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        recordExport("JSON", fileName, analysis.passport);
    };

    const downloadLabelImage = async () => {
        const element = document.getElementById("international-label-preview");
        if (!element || !workingTable) return;

        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(element, {
            pixelRatio: 3,
            cacheBust: true,
            backgroundColor: "#ffffff",
        });
        const fileName = `rotulo-${market}-${workingTable.title || workingTable.id}.png`;
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        recordExport("PNG", fileName, { market, title: workingTable.title });
    };

    const copyGs1Link = async () => {
        if (!analysis) return;
        await navigator.clipboard.writeText(analysis.gs1Link);
        recordExport("GS1_DIGITAL_LINK", undefined, { url: analysis.gs1Link });
        toast.success(copy.copy);
    };

    if (!workingTable || !selectedTable || !analysis) {
        return (
            <div className="container mx-auto max-w-5xl px-4 py-10">
                <section className="rounded-lg border border-dashed border-border bg-background p-10 text-center">
                    <h1 className="text-2xl font-semibold">{copy.firstTableTitle}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {copy.subheading}
                    </p>
                    <Button className="mt-5" asChild>
                        <a href="/dashboard/new">{copy.newProduct}</a>
                    </Button>
                </section>
            </div>
        );
    }

    const activeFrontWarnings = analysis.frontWarnings.filter((item) => item.triggered);
    const legalFields = getLegalFieldsForMarket(market, language);

    return (
        <div className="mx-auto max-w-[88rem] px-4 py-6 md:px-6">
            <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ShieldCheck className="h-4 w-4" />
                        {copy.firstTableTitle}
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{copy.heading}</h1>
                        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {copy.subheading}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="gap-2">
                        <a href="/dashboard/new">
                            {copy.newProduct}
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                    </Button>
                    <Button onClick={saveCurrentVersion} variant="outline" className="gap-2" disabled={isSaving}>
                        <Save className="h-4 w-4" />
                        {isSaving ? copy.saving : copy.saveVersion}
                    </Button>
                    <Button onClick={downloadLabelImage} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        PNG
                    </Button>
                    <Button onClick={downloadPassport} className="gap-2">
                        <FileJson className="h-4 w-4" />
                        JSON
                    </Button>
                </div>
            </header>

            <section className="mb-6 rounded-lg border border-border bg-background">
                <div className="grid gap-4 p-4 md:grid-cols-4">
                    <ControlSelect label={copy.productBase} help="Escolha a tabela brasileira salva que servirá como origem. Ela não será alterada por este módulo.">
                        <Select value={selectedTable.id} onValueChange={setSelectedTableId}>
                            <SelectTrigger className="min-h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {tables.map((table) => (
                                    <SelectItem key={table.id} value={table.id}>
                                        {table.title || "Sem título"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ControlSelect>

                    <ControlSelect label={copy.market} help="Define o formato visual, idioma obrigatório do rótulo, ordem dos nutrientes, símbolos frontais e alertas regulatórios.">
                        <Select value={market} onValueChange={(value) => setMarket(value as InternationalMarket)}>
                            <SelectTrigger className="min-h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {INTERNATIONAL_MARKETS.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {getMarketLabel(item.value, language)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ControlSelect>

                    <ControlSelect label={copy.foodBase} help="Alguns países usam limites diferentes para alimentos sólidos e líquidos.">
                        <Select value={foodState} onValueChange={(value) => setFoodState(value as FoodPhysicalState)}>
                            <SelectTrigger className="min-h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="solid">{copy.solid}</SelectItem>
                                <SelectItem value="liquid">{copy.liquid}</SelectItem>
                            </SelectContent>
                        </Select>
                    </ControlSelect>

                    <ControlSelect label={copy.status} help="Marque em que ponto o rótulo está no fluxo interno de aprovação.">
                        <Select value={approvalStatus} onValueChange={(value) => setApprovalStatus(value as ApprovalStatus)}>
                            <SelectTrigger className="min-h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {APPROVAL_FLOW.map((item) => (
                                    <SelectItem key={item.status} value={item.status}>
                                        {getApprovalLabel(item.status, language)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </ControlSelect>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(28rem,0.95fr)_minmax(28rem,1.05fr)]">
                <section className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                    <Panel>
                        <PanelHeader title={copy.countryLabel} detail={`${marketConfig.authority} · ${marketConfig.tableName}`} />
                        <div className="overflow-x-auto bg-neutral-100 p-5 dark:bg-neutral-950/40">
                            <div className="flex min-w-max justify-center">
                                <InternationalNutritionLabel
                                    id="international-label-preview"
                                    table={workingTable}
                                    market={market}
                                    foodState={foodState}
                                />
                            </div>
                        </div>
                    </Panel>

                    <Panel>
                        <PanelHeader title={copy.approval} detail={copy.approvalDetail} />
                        <div className="grid gap-2 p-4 sm:grid-cols-5">
                            {APPROVAL_FLOW.map((step, index) => {
                                const active = index === activeApprovalIndex;
                                const done = index < activeApprovalIndex;
                                return (
                                    <button
                                        key={step.status}
                                        type="button"
                                        onClick={() => setApprovalStatus(step.status)}
                                        className={`rounded-md border px-3 py-2 text-left text-xs transition ${
                                            active ? "border-primary bg-muted/30" : done ? "border-border bg-muted/20" : "border-border hover:bg-muted/30"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold">{getApprovalLabel(step.status, language)}</span>
                                            {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                                        </div>
                                        <div className="mt-1 text-muted-foreground">{getApprovalOwner(step.status, language)}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </Panel>
                </section>

                <section className="space-y-4">
                    <Panel>
                        <div className="flex flex-col gap-4 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
                            <PanelTitle
                                title={copy.localCopy}
                                detail={
                                    savedProject?.currentVersion
                                        ? `${copy.savedVersion} v${savedProject.currentVersion.version}`
                                        : isLocalizedDraft
                                            ? copy.localCopyDraft
                                            : copy.localCopyLocked
                                }
                            />
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={isLocalizedDraft ? "secondary" : "default"}
                                    onClick={createLocalizedDraft}
                                    disabled={isLocalizedDraft}
                                    className="gap-2"
                                >
                                    <Copy className="h-4 w-4" />
                                    {isLocalizedDraft ? copy.copyCreated : copy.createCopy}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetLocalizedDraft}
                                    disabled={!isLocalizedDraft}
                                    className="gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    {copy.original}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={saveCurrentVersion}
                                    disabled={isSaving}
                                    className="gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    {isSaving ? copy.saving : copy.saveVersion}
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 p-4 md:grid-cols-6">
                            <Field className="md:col-span-3" label={copy.localName} help="Nome comercial usado na prévia local. Edite na cópia se o país exigir adaptação de idioma ou descrição.">
                                <Input
                                    value={workingTable.title}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateLocalizedDraft("title", event.target.value)}
                                />
                            </Field>
                            <Field label={copy.portion} help="Quantidade de alimento usada como serving/porção local. Confira a regra de referência do país.">
                                <Input
                                    type="number"
                                    value={workingTable.portion || ""}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateLocalizedDraft("portion", parseFloat(event.target.value) || 0)}
                                />
                            </Field>
                            <Field label={copy.unit} help="Unidade exibida no rótulo local. EUA e Canadá podem pedir medidas em formatos próprios.">
                                <Select
                                    value={workingTable.uom || "g"}
                                    onValueChange={(value) => updateLocalizedDraft("uom", value)}
                                    disabled={!isLocalizedDraft}
                                >
                                    <SelectTrigger className="min-h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="g">g</SelectItem>
                                        <SelectItem value="ml">ml</SelectItem>
                                        <SelectItem value="oz">oz</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label={copy.content} help="Conteúdo líquido da embalagem. Necessário para porções por embalagem e auditoria.">
                                <Input
                                    type="number"
                                    value={workingTable.packageContent || ""}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateLocalizedDraft("packageContent", parseFloat(event.target.value) || null)}
                                />
                            </Field>
                            <Field className="md:col-span-3" label={copy.localMeasure} help="Texto de medida compreensível no país, como serving, porción, portion ou medida local.">
                                <Input
                                    value={workingTable.householdMeasure}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateLocalizedDraft("householdMeasure", event.target.value)}
                                />
                            </Field>
                            <Field className="md:col-span-3" label={copy.servings} help="Declaração local de quantidade de porções por embalagem/contêiner/envase.">
                                <Input
                                    value={workingTable.servingsPerPackage || ""}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateLocalizedDraft("servingsPerPackage", event.target.value)}
                                />
                            </Field>
                            <Field className="md:col-span-3" label={copy.legalName} help="Nome legal revisado para o país. Use quando o nome comercial não for suficiente para a legislação local.">
                                <Input
                                    value={metadata?.legalName || ""}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateMetadata("legalName", event.target.value)}
                                />
                            </Field>
                            <Field className="md:col-span-3" label={copy.category} help="Categoria regulatória local usada para confirmar porção de referência, idioma, claims e exceções.">
                                <Input
                                    value={metadata?.category || ""}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateMetadata("category", event.target.value)}
                                />
                            </Field>
                            <Field className="md:col-span-3" label={copy.labelLanguage} help="Idioma que deverá aparecer no rótulo final deste mercado.">
                                <Input
                                    value={metadata?.language || marketConfig.languageRequirement}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateMetadata("language", event.target.value)}
                                />
                            </Field>
                            <Field className="md:col-span-3" label={copy.intendedClaims} help="Alegações comerciais pretendidas. O painel de claims ajuda a decidir o que pode seguir para revisão.">
                                <Input
                                    value={metadata?.intendedClaims || ""}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateMetadata("intendedClaims", event.target.value)}
                                />
                            </Field>
                            <Field className="md:col-span-6" label={copy.adjustmentNotes} help="Espaço para registrar a decisão regulatória, troca de ingrediente, alteração de porção ou justificativa de aprovação.">
                                <Input
                                    value={metadata?.adjustmentNotes || ""}
                                    disabled={!isLocalizedDraft}
                                    onChange={(event) => updateMetadata("adjustmentNotes", event.target.value)}
                                />
                            </Field>
                            {legalFields.map((item) => (
                                <Field
                                    key={item.field}
                                    className={item.span || "md:col-span-3"}
                                    label={item.label}
                                    help={item.help}
                                >
                                    <Input
                                        value={(metadata?.[item.field] as string | undefined) || ""}
                                        disabled={!isLocalizedDraft}
                                        onChange={(event) => updateMetadata(item.field, event.target.value)}
                                    />
                                </Field>
                            ))}
                        </div>
                    </Panel>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel>
                            <PanelHeader
                                title={copy.pending}
                                detail={`${totals.blocker} ${copy.blockers}, ${totals.warning} ${copy.alerts}.`}
                            />
                            <StackList>
                                {analysis.validations.map((item) => (
                                    <StatusRow
                                        key={`${item.title}-${item.level}`}
                                        tone={STATUS_STYLES[item.level]}
                                        title={getIssueTitle(item.title, language)}
                                        detail={getIssueDetail(item.detail, language)}
                                    />
                                ))}
                            </StackList>
                        </Panel>

                        <Panel>
                            <PanelHeader
                                title={copy.front}
                                detail={activeFrontWarnings.length > 0 ? `${activeFrontWarnings.length} ${copy.activeSymbols}` : copy.noSymbol}
                            />
                            <StackList>
                                {analysis.frontWarnings.length === 0 ? (
                                    <EmptyRow text={copy.noFrontSymbol} />
                                ) : (
                                    analysis.frontWarnings.map((item) => (
                                        <StatusRow
                                            key={item.code}
                                            tone={item.triggered ? STATUS_STYLES.blocker : STATUS_STYLES.ok}
                                            title={item.label}
                                            detail={`${copy.current}: ${item.value}. ${copy.limit}: ${item.limit}.`}
                                            muted={!item.triggered}
                                        />
                                    ))
                                )}
                            </StackList>
                        </Panel>
                    </div>

                    <Panel>
                        <PanelHeader title={copy.howToAdjust} detail={copy.howToAdjustDetail} />
                        <StackList>
                            {analysis.validations
                                .filter((item) => item.level !== "ok")
                                .map((item) => (
                                    <StatusRow
                                        key={`guide-${item.title}`}
                                        tone={STATUS_STYLES[item.level]}
                                        title={getIssueTitle(item.title, language)}
                                        detail={buildAdjustmentInstruction(item.detail, market, language)}
                                    />
                                ))}
                            {analysis.validations.every((item) => item.level === "ok") && (
                                <EmptyRow text={copy.noSymbol} />
                            )}
                        </StackList>
                    </Panel>

                    <Panel>
                        <PanelHeader title={copy.technicalTable} detail={marketConfig.servingBasis} />
                        <div className="overflow-x-auto p-4">
                            <table className="w-full min-w-[34rem] border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                        <th className="py-2 pr-3 font-semibold">{copy.nutrient}</th>
                                        <th className="px-3 py-2 font-semibold">100 g/ml</th>
                                        <th className="px-3 py-2 font-semibold">{copy.perServing}</th>
                                        <th className="px-3 py-2 font-semibold">%DV</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/70">
                                    {analysis.nutritionLines.map((line) => (
                                        <tr key={`${line.key}-${line.label}`}>
                                            <td className="py-2 pr-3 font-medium">{line.label}</td>
                                            <td className="px-3 py-2">{formatNutrientValue(line.per100, line.unit)}</td>
                                            <td className="px-3 py-2">{formatNutrientValue(line.perPortion, line.unit)}</td>
                                            <td className="px-3 py-2">{line.dailyValueLabel || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel>
                            <PanelHeader title={copy.claims} detail={copy.claimsDetail} />
                            <StackList>
                                {analysis.claims.map((claim) => (
                                    <StatusRow key={claim.label} tone={CLAIM_STYLES[claim.status]} title={claim.label} detail={claim.detail} />
                                ))}
                            </StackList>
                        </Panel>

                        <Panel>
                            <PanelHeader title={copy.reformulation} detail={copy.reformulationDetail} />
                            <StackList>
                                {analysis.suggestions.map((item) => (
                                    <StatusRow key={item.title} tone="border-l-slate-400" title={item.title} detail={`${item.detail} ${item.impact}`} />
                                ))}
                            </StackList>
                        </Panel>
                    </div>

                    <Panel>
                        <PanelHeader title="GS1 Digital Link" detail={copy.gs1Detail} />
                        <div className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                            <Field label="GTIN">
                                <Input value={gtin} onChange={(event) => setGtin(event.target.value)} placeholder="7890000000000" />
                            </Field>
                            <Field label={copy.lot}>
                                <Input value={lot} onChange={(event) => setLot(event.target.value)} placeholder="L2401" />
                            </Field>
                            <Button variant="outline" className="gap-2" onClick={copyGs1Link}>
                                <Link2 className="h-4 w-4" />
                                {copy.copy}
                            </Button>
                            <div className="break-all rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground md:col-span-3">
                                {analysis.gs1Link}
                            </div>
                        </div>
                    </Panel>
                </section>
            </div>
        </div>
    );
}

function Panel({ children }: { children: React.ReactNode }) {
    return <section className="rounded-lg border border-border bg-background">{children}</section>;
}

function PanelHeader({ title, detail }: { title: string; detail?: string }) {
    return (
        <div className="border-b border-border p-4">
            <PanelTitle title={title} detail={detail} />
        </div>
    );
}

function PanelTitle({ title, detail }: { title: string; detail?: string }) {
    return (
        <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
        </div>
    );
}

function ControlSelect({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                {label}
                {help && <HelpTip>{help}</HelpTip>}
            </Label>
            {children}
        </div>
    );
}

function Field({ label, help, className, children }: { label: string; help?: string; className?: string; children: React.ReactNode }) {
    return (
        <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
            <Label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                {label}
                {help && <HelpTip>{help}</HelpTip>}
            </Label>
            {children}
        </div>
    );
}

function StackList({ children }: { children: React.ReactNode }) {
    return <div className="space-y-2 p-4">{children}</div>;
}

function StatusRow({
    tone,
    title,
    detail,
    muted,
}: {
    tone: string;
    title: string;
    detail: string;
    muted?: boolean;
}) {
    return (
        <div className={`rounded-md border px-3 py-2 text-sm shadow-sm ${tone} ${muted ? "opacity-75" : ""}`}>
            <div className="font-semibold">{title}</div>
            <div className="mt-1 text-xs leading-relaxed opacity-80">{detail}</div>
        </div>
    );
}

function EmptyRow({ text }: { text: string }) {
    return (
        <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            {text}
        </div>
    );
}

function upsertProject(
    projects: EnterpriseLabelProjectSummary[],
    nextProject: EnterpriseLabelProjectSummary
) {
    const exists = projects.some((project) => project.id === nextProject.id);
    if (!exists) return [nextProject, ...projects];

    return projects.map((project) => (project.id === nextProject.id ? nextProject : project));
}

function formatNutrientValue(value: number, unit: string) {
    const rounded = unit === "mg" || unit === "kcal" || unit === "kJ"
        ? Math.round(value).toString()
        : formatNumber(value);
    return `${rounded} ${unit}`;
}

function getLocalizedMeasure(measure: string, market: InternationalMarket) {
    const fallback = measure || "1 porção";
    if (market === "us") return fallback === "1 porção" ? "1 serving" : fallback;
    if (market === "ca") return fallback === "1 porção" ? "1 serving / 1 portion" : fallback;
    if (market === "mx" || market === "cl") return fallback === "1 porção" ? "1 porción" : fallback;
    if (market === "eu") return fallback === "1 porção" ? "1 serving" : fallback;
    return fallback;
}

function getLocalizedServings(servings: string | null | undefined, market: InternationalMarket) {
    const fallback = servings || "-";
    if (fallback === "-") return fallback;
    if (market === "us") return fallback.replace("Cerca de", "About");
    if (market === "ca") return fallback.replace("Cerca de", "About / Environ");
    if (market === "mx" || market === "cl") return fallback.replace("Cerca de", "Aprox.");
    if (market === "eu") return fallback.replace("Cerca de", "About");
    return fallback;
}

function getLegalFieldsForMarket(market: InternationalMarket, language: SiteLanguage): LegalFieldDefinition[] {
    const common: LegalFieldDefinition[] = [
        legalField("ingredientsStatement", language, "Ingredients list", "Full ingredient list in descending order by weight.", "md:col-span-6"),
        legalField("allergenStatement", language, "Allergen declaration", "Required allergen/contains statement for the target market.", "md:col-span-6"),
        legalField("netQuantity", language, "Net quantity", "Net quantity as it will appear on pack."),
        legalField("lotCode", language, "Lot code", "Lot/batch identification."),
        legalField("dateMarking", language, "Date marking", "Best before, expiration date, or use by date."),
        legalField("responsibleName", language, "Responsible operator", "Manufacturer, distributor, importer, or food business operator."),
        legalField("responsibleAddress", language, "Responsible address", "Full business address required by the market.", "md:col-span-6"),
        legalField("countryOfOrigin", language, "Country of origin", "Origin/provenance when required or when omission may mislead."),
        legalField("storageInstructions", language, "Storage conditions", "Special storage conditions when needed."),
        legalField("preparationInstructions", language, "Preparation/use", "Preparation or use instructions when needed."),
        legalField("packageDisplayArea", language, "Display area", "Principal display surface/package area used to size symbols and tables."),
        legalField("claimsEvidence", language, "Claims evidence", "Evidence and calculation supporting every claim.", "md:col-span-6"),
    ];

    const byMarket: Partial<Record<InternationalMarket, LegalFieldDefinition[]>> = {
        us: [
            legalField("referenceAmount", language, "RACC/reference amount", "Reference Amount Customarily Consumed for the food category."),
            legalField("mandatoryMicronutrients", language, "Mandatory micronutrients", "Vitamin D, calcium, iron, and potassium values."),
            legalField("drainedWeight", language, "Drained weight", "Required when applicable."),
        ],
        eu: [
            legalField("memberState", language, "Member State", "EU country of sale for language and national rules."),
            legalField("quidStatement", language, "QUID", "Percentage declaration for emphasized/characterizing ingredients."),
            legalField("alcoholVolume", language, "Alcohol volume", "Required for alcoholic beverages above applicable thresholds."),
            legalField("organicOrSpecialSeals", language, "Special seals", "Organic, PDO/PGI or other regulated marks when used."),
        ],
        ca: [
            legalField("referenceAmount", language, "Reference amount", "Canadian reference amount for serving of stated size."),
            legalField("mandatoryMicronutrients", language, "Mandatory minerals", "Potassium, calcium, and iron values."),
            legalField("importerName", language, "Importer", "Canadian importer when applicable."),
            legalField("importerAddress", language, "Importer address", "Canadian importer address when applicable.", "md:col-span-6"),
            legalField("frontSymbolSize", language, "FOP symbol size", "Size and placement according to available display surface."),
        ],
        mx: [
            legalField("caffeineAdded", language, "Caffeine", "Declare added caffeine and warning when applicable."),
            legalField("sweetenersAdded", language, "Sweeteners", "Declare sweeteners and precautionary legend when applicable."),
            legalField("childMarketingElements", language, "Child-directed elements", "Confirm absence/restriction of characters, games, animations or child-directed elements."),
            legalField("frontSymbolSize", language, "Octagon size", "Size and placement of NOM-051 warning seals."),
            legalField("drainedWeight", language, "Drained mass", "Required when applicable."),
        ],
        cl: [
            legalField("addedCriticalNutrients", language, "Added critical nutrients", "Confirm added sugars, sodium or saturated fats for ALTO EN evaluation."),
            legalField("childMarketingElements", language, "Child advertising", "Restrictions for products with ALTO EN warnings."),
            legalField("frontSymbolSize", language, "Warning seal size", "Size and placement of ALTO EN stop-sign symbols."),
            legalField("importerName", language, "Importer", "Importer when applicable."),
            legalField("importerAddress", language, "Importer address", "Importer address when applicable.", "md:col-span-6"),
        ],
    };

    return [...common, ...(byMarket[market] || [])];
}

function legalField(
    field: keyof LegalLabelData,
    language: SiteLanguage,
    labelEn: string,
    helpEn: string,
    span?: string
): LegalFieldDefinition {
    return {
        field,
        label: translateLegalLabel(labelEn, language),
        help: translateLegalHelp(helpEn, language),
        span,
    };
}

function buildAdjustmentInstruction(detail: string, market: InternationalMarket, language: SiteLanguage) {
    if (detail.includes("conteúdo") || detail.includes("conteudo")) {
        return translateSentence("Fill package content and servings in the local copy.", language);
    }
    if (detail.includes("RACC") || detail.includes("serving size")) {
        return translateSentence("Choose the food category, check the reference amount, and adjust serving size in the local copy.", language);
    }
    if (detail.includes("Vitamina") || detail.includes("Potássio") || detail.includes("cálcio") || detail.includes("ferro")) {
        return translateSentence("Complete mandatory micronutrients or record the pending decision before artwork approval.", language);
    }
    if (detail.includes("idioma") || detail.includes("Bilingue") || detail.includes("bilíngue")) {
        return translateSentence("Adjust legal name, label language, and mandatory text fields in the local copy.", language);
    }
    if (market === "mx" || market === "cl") {
        return translateSentence("Review front symbols, reduce the triggered nutrient, or record the regulatory decision in notes.", language);
    }
    return translateSentence("Review the issue, adjust the local copy fields, and record the justification.", language);
}

function getIssueTitle(title: string, language: SiteLanguage) {
    const map: Record<string, Record<SiteLanguage, string>> = {
        "Nome do produto": { "pt-BR": "Nome do produto", "en-US": "Product name", "es-MX": "Nombre del producto", "es-CL": "Nombre del producto", "fr-CA": "Nom du produit" },
        "Porção": { "pt-BR": "Porção", "en-US": "Serving", "es-MX": "Porción", "es-CL": "Porción", "fr-CA": "Portion" },
        "Medida caseira": { "pt-BR": "Medida caseira", "en-US": "Household measure", "es-MX": "Medida casera", "es-CL": "Medida casera", "fr-CA": "Mesure domestique" },
        "Fórmula": { "pt-BR": "Fórmula", "en-US": "Formula", "es-MX": "Fórmula", "es-CL": "Fórmula", "fr-CA": "Formule" },
        "Conteúdo da embalagem": { "pt-BR": "Conteúdo da embalagem", "en-US": "Package content", "es-MX": "Contenido del envase", "es-CL": "Contenido del envase", "fr-CA": "Contenu de l’emballage" },
        "Base legal selecionada": { "pt-BR": "Base legal selecionada", "en-US": "Selected legal basis", "es-MX": "Base legal seleccionada", "es-CL": "Base legal seleccionada", "fr-CA": "Base légale sélectionnée" },
        "RACC/serving size": { "pt-BR": "RACC/serving size", "en-US": "RACC/serving size", "es-MX": "RACC/tamaño de porción", "es-CL": "RACC/tamaño de porción", "fr-CA": "RACC/portion" },
        "Micronutrientes obrigatórios FDA": { "pt-BR": "Micronutrientes obrigatórios FDA", "en-US": "Mandatory FDA micronutrients", "es-MX": "Micronutrientes obligatorios FDA", "es-CL": "Micronutrientes obligatorios FDA", "fr-CA": "Micronutriments FDA obligatoires" },
        "Bilingue Canadá": { "pt-BR": "Bilíngue Canadá", "en-US": "Canada bilingual label", "es-MX": "Etiqueta bilingüe de Canadá", "es-CL": "Etiqueta bilingüe de Canadá", "fr-CA": "Étiquette bilingue canadienne" },
        "Minerais obrigatórios Canadá": { "pt-BR": "Minerais obrigatórios Canadá", "en-US": "Mandatory Canada minerals", "es-MX": "Minerales obligatorios Canadá", "es-CL": "Minerales obligatorios Canadá", "fr-CA": "Minéraux canadiens obligatoires" },
        "Estado-Membro": { "pt-BR": "Estado-Membro", "en-US": "Member State", "es-MX": "Estado miembro", "es-CL": "Estado miembro", "fr-CA": "État membre" },
        "Rotulagem frontal": { "pt-BR": "Rotulagem frontal", "en-US": "Front-of-pack labeling", "es-MX": "Etiquetado frontal", "es-CL": "Etiquetado frontal", "fr-CA": "Étiquetage frontal" },
        "Denominação legal": { "pt-BR": "Denominação legal", "en-US": "Legal name", "es-MX": "Denominación legal", "es-CL": "Denominación legal", "fr-CA": "Dénomination légale" },
        "Lista de ingredientes": { "pt-BR": "Lista de ingredientes", "en-US": "Ingredients list", "es-MX": "Lista de ingredientes", "es-CL": "Lista de ingredientes", "fr-CA": "Liste des ingrédients" },
        "Alérgenos": { "pt-BR": "Alérgenos", "en-US": "Allergens", "es-MX": "Alérgenos", "es-CL": "Alérgenos", "fr-CA": "Allergènes" },
        "Conteúdo líquido": { "pt-BR": "Conteúdo líquido", "en-US": "Net quantity", "es-MX": "Contenido neto", "es-CL": "Contenido neto", "fr-CA": "Quantité nette" },
        "Lote": { "pt-BR": "Lote", "en-US": "Lot", "es-MX": "Lote", "es-CL": "Lote", "fr-CA": "Lot" },
        "Validade": { "pt-BR": "Validade", "en-US": "Date marking", "es-MX": "Caducidad", "es-CL": "Vencimiento", "fr-CA": "Date de conservation" },
        "Responsável": { "pt-BR": "Responsável", "en-US": "Responsible operator", "es-MX": "Responsable", "es-CL": "Responsable", "fr-CA": "Responsable" },
        "Endereço do responsável": { "pt-BR": "Endereço do responsável", "en-US": "Responsible address", "es-MX": "Domicilio del responsable", "es-CL": "Dirección del responsable", "fr-CA": "Adresse du responsable" },
        "Idioma obrigatório": { "pt-BR": "Idioma obrigatório", "en-US": "Mandatory language", "es-MX": "Idioma obligatorio", "es-CL": "Idioma obligatorio", "fr-CA": "Langue obligatoire" },
        "Categoria regulatória": { "pt-BR": "Categoria regulatória", "en-US": "Regulatory category", "es-MX": "Categoría regulatoria", "es-CL": "Categoría regulatoria", "fr-CA": "Catégorie réglementaire" },
        "RACC": { "pt-BR": "RACC", "en-US": "RACC", "es-MX": "RACC", "es-CL": "RACC", "fr-CA": "RACC" },
        "Vitaminas/minerais FDA": { "pt-BR": "Vitaminas/minerais FDA", "en-US": "FDA vitamins/minerals", "es-MX": "Vitaminas/minerales FDA", "es-CL": "Vitaminas/minerales FDA", "fr-CA": "Vitamines/minéraux FDA" },
        "Evidência de claims": { "pt-BR": "Evidência de claims", "en-US": "Claims evidence", "es-MX": "Evidencia de claims", "es-CL": "Evidencia de declaraciones", "fr-CA": "Preuve des allégations" },
        "País de origem": { "pt-BR": "País de origem", "en-US": "Country of origin", "es-MX": "País de origen", "es-CL": "País de origen", "fr-CA": "Pays d’origine" },
        "Cafeína": { "pt-BR": "Cafeína", "en-US": "Caffeine", "es-MX": "Cafeína", "es-CL": "Cafeína", "fr-CA": "Caféine" },
        "Edulcorantes": { "pt-BR": "Edulcorantes", "en-US": "Sweeteners", "es-MX": "Edulcorantes", "es-CL": "Edulcorantes", "fr-CA": "Édulcorants" },
        "Nutriente adicionado": { "pt-BR": "Nutriente adicionado", "en-US": "Added critical nutrient", "es-MX": "Nutriente añadido", "es-CL": "Nutriente añadido", "fr-CA": "Nutriment ajouté" },
    };
    return map[title]?.[language] || title;
}

function getIssueDetail(detail: string, language: SiteLanguage) {
    if (detail === "OK") return language === "pt-BR" ? "OK" : "OK";
    if (detail.includes("FDA exige serving size")) {
        return translateSentence("FDA requires serving size based on the official food category.", language);
    }
    if (detail.includes("Vitamina D")) {
        return translateSentence("Vitamin D, calcium, iron, and potassium must be completed before final US artwork.", language);
    }
    if (detail.includes("Potássio, cálcio")) {
        return translateSentence("Potassium, calcium, and iron must be completed before final Canadian artwork.", language);
    }
    if (detail.includes("Rótulo deve sair em inglês")) {
        return translateSentence("The Canadian label must be bilingual and follow the reference amount.", language);
    }
    if (detail.includes("conteúdo líquido")) {
        return translateSentence("Enter package content to calculate servings and audit the label.", language);
    }
    return detail;
}

function translateSentence(sentence: string, language: SiteLanguage) {
    const translations: Record<string, Partial<Record<SiteLanguage, string>>> = {
        "Fill package content and servings in the local copy.": {
            "pt-BR": "Preencha conteúdo da embalagem e porções na cópia local.",
            "es-MX": "Complete contenido del envase y porciones en la copia local.",
            "es-CL": "Complete contenido del envase y porciones en la copia local.",
            "fr-CA": "Remplissez le contenu et les portions dans la copie locale.",
        },
        "Choose the food category, check the reference amount, and adjust serving size in the local copy.": {
            "pt-BR": "Escolha a categoria do alimento, confira a referência e ajuste a porção na cópia local.",
            "es-MX": "Elija la categoría, revise la cantidad de referencia y ajuste la porción en la copia local.",
            "es-CL": "Elija la categoría, revise la cantidad de referencia y ajuste la porción en la copia local.",
            "fr-CA": "Choisissez la catégorie, vérifiez la quantité de référence et ajustez la portion.",
        },
        "Complete mandatory micronutrients or record the pending decision before artwork approval.": {
            "pt-BR": "Complete os micronutrientes obrigatórios ou registre a pendência antes da arte final.",
            "es-MX": "Complete los micronutrientes obligatorios o registre la decisión antes del arte final.",
            "es-CL": "Complete los micronutrientes obligatorios o registre la decisión antes del arte final.",
            "fr-CA": "Complétez les micronutriments obligatoires ou consignez la décision avant l’approbation.",
        },
        "Adjust legal name, label language, and mandatory text fields in the local copy.": {
            "pt-BR": "Ajuste nome legal, idioma e textos obrigatórios na cópia local.",
            "es-MX": "Ajuste el nombre legal, idioma y textos obligatorios en la copia local.",
            "es-CL": "Ajuste el nombre legal, idioma y textos obligatorios en la copia local.",
            "fr-CA": "Ajustez le nom légal, la langue et les textes obligatoires dans la copie locale.",
        },
        "Review front symbols, reduce the triggered nutrient, or record the regulatory decision in notes.": {
            "pt-BR": "Revise os símbolos frontais, reduza o nutriente acionado ou registre a decisão.",
            "es-MX": "Revise los símbolos frontales, reduzca el nutrimento activado o registre la decisión.",
            "es-CL": "Revise los símbolos frontales, reduzca el nutriente activado o registre la decisión.",
            "fr-CA": "Vérifiez les symboles frontaux, réduisez le nutriment déclencheur ou consignez la décision.",
        },
        "Review the issue, adjust the local copy fields, and record the justification.": {
            "pt-BR": "Revise a pendência, ajuste a cópia local e registre a justificativa.",
            "es-MX": "Revise el pendiente, ajuste la copia local y registre la justificación.",
            "es-CL": "Revise el pendiente, ajuste la copia local y registre la justificación.",
            "fr-CA": "Vérifiez le point, ajustez la copie locale et consignez la justification.",
        },
        "FDA requires serving size based on the official food category.": {
            "pt-BR": "A FDA exige serving size baseado na categoria oficial do alimento.",
            "es-MX": "La FDA exige serving size según la categoría oficial del alimento.",
            "es-CL": "La FDA exige serving size según la categoría oficial del alimento.",
            "fr-CA": "La FDA exige une portion selon la catégorie officielle de l’aliment.",
        },
        "Vitamin D, calcium, iron, and potassium must be completed before final US artwork.": {
            "pt-BR": "Vitamina D, cálcio, ferro e potássio devem estar completos antes da arte final dos EUA.",
            "es-MX": "Vitamina D, calcio, hierro y potasio deben completarse antes del arte final de EE. UU.",
            "es-CL": "Vitamina D, calcio, hierro y potasio deben completarse antes del arte final de EE. UU.",
            "fr-CA": "Vitamine D, calcium, fer et potassium doivent être complets avant l’art final américain.",
        },
        "Potassium, calcium, and iron must be completed before final Canadian artwork.": {
            "pt-BR": "Potássio, cálcio e ferro devem estar completos antes da arte final canadense.",
            "es-MX": "Potasio, calcio y hierro deben completarse antes del arte final canadiense.",
            "es-CL": "Potasio, calcio y hierro deben completarse antes del arte final canadiense.",
            "fr-CA": "Potassium, calcium et fer doivent être complets avant l’art final canadien.",
        },
        "The Canadian label must be bilingual and follow the reference amount.": {
            "pt-BR": "O rótulo canadense deve ser bilíngue e seguir a quantidade de referência.",
            "es-MX": "La etiqueta canadiense debe ser bilingüe y seguir la cantidad de referencia.",
            "es-CL": "La etiqueta canadiense debe ser bilingüe y seguir la cantidad de referencia.",
            "fr-CA": "L’étiquette canadienne doit être bilingue et suivre la quantité de référence.",
        },
        "Enter package content to calculate servings and audit the label.": {
            "pt-BR": "Informe o conteúdo da embalagem para calcular porções e auditar o rótulo.",
            "es-MX": "Ingrese el contenido del envase para calcular porciones y auditar la etiqueta.",
            "es-CL": "Ingrese el contenido del envase para calcular porciones y auditar la etiqueta.",
            "fr-CA": "Entrez le contenu de l’emballage pour calculer les portions et vérifier l’étiquette.",
        },
    };
    return translations[sentence]?.[language] || sentence;
}

function translateLegalLabel(label: string, language: SiteLanguage) {
    const labels: Record<string, Partial<Record<SiteLanguage, string>>> = {
        "Ingredients list": { "pt-BR": "Lista de ingredientes", "es-MX": "Lista de ingredientes", "es-CL": "Lista de ingredientes", "fr-CA": "Liste des ingrédients" },
        "Allergen declaration": { "pt-BR": "Declaração de alérgenos", "es-MX": "Declaración de alérgenos", "es-CL": "Declaración de alérgenos", "fr-CA": "Déclaration des allergènes" },
        "Net quantity": { "pt-BR": "Conteúdo líquido", "es-MX": "Contenido neto", "es-CL": "Contenido neto", "fr-CA": "Quantité nette" },
        "Lot code": { "pt-BR": "Código de lote", "es-MX": "Número de lote", "es-CL": "Número de lote", "fr-CA": "Code de lot" },
        "Date marking": { "pt-BR": "Validade/data", "es-MX": "Caducidad/consumo preferente", "es-CL": "Vencimiento/duración", "fr-CA": "Date de conservation" },
        "Responsible operator": { "pt-BR": "Responsável legal", "es-MX": "Responsable del producto", "es-CL": "Responsable del producto", "fr-CA": "Responsable légal" },
        "Responsible address": { "pt-BR": "Endereço do responsável", "es-MX": "Domicilio del responsable", "es-CL": "Dirección del responsable", "fr-CA": "Adresse du responsable" },
        "Country of origin": { "pt-BR": "País de origem", "es-MX": "País de origen", "es-CL": "País de origen", "fr-CA": "Pays d’origine" },
        "Storage conditions": { "pt-BR": "Conservação", "es-MX": "Condiciones de conservación", "es-CL": "Condiciones de conservación", "fr-CA": "Conditions de conservation" },
        "Preparation/use": { "pt-BR": "Preparo/uso", "es-MX": "Preparación/uso", "es-CL": "Preparación/uso", "fr-CA": "Préparation/utilisation" },
        "Display area": { "pt-BR": "Área da embalagem", "es-MX": "Superficie de exhibición", "es-CL": "Superficie de la etiqueta", "fr-CA": "Surface d’affichage" },
        "Claims evidence": { "pt-BR": "Evidência de claims", "es-MX": "Evidencia de claims", "es-CL": "Evidencia de declaraciones", "fr-CA": "Preuve des allégations" },
        "RACC/reference amount": { "pt-BR": "RACC/referência", "es-MX": "RACC/cantidad de referencia", "es-CL": "RACC/cantidad de referencia", "fr-CA": "RACC/quantité de référence" },
        "Mandatory micronutrients": { "pt-BR": "Micronutrientes obrigatórios", "es-MX": "Micronutrientes obligatorios", "es-CL": "Micronutrientes obligatorios", "fr-CA": "Micronutriments obligatoires" },
        "Drained weight": { "pt-BR": "Peso drenado", "es-MX": "Masa drenada", "es-CL": "Peso drenado", "fr-CA": "Poids égoutté" },
        "Member State": { "pt-BR": "Estado-Membro", "es-MX": "Estado miembro", "es-CL": "Estado miembro", "fr-CA": "État membre" },
        "QUID": { "pt-BR": "QUID", "es-MX": "QUID", "es-CL": "QUID", "fr-CA": "QUID" },
        "Alcohol volume": { "pt-BR": "Teor alcoólico", "es-MX": "Grado alcohólico", "es-CL": "Grado alcohólico", "fr-CA": "Titre alcoométrique" },
        "Special seals": { "pt-BR": "Selos especiais", "es-MX": "Sellos especiales", "es-CL": "Sellos especiales", "fr-CA": "Mentions/sceaux spéciaux" },
        "Reference amount": { "pt-BR": "Quantidade de referência", "es-MX": "Cantidad de referencia", "es-CL": "Cantidad de referencia", "fr-CA": "Quantité de référence" },
        "Mandatory minerals": { "pt-BR": "Minerais obrigatórios", "es-MX": "Minerales obligatorios", "es-CL": "Minerales obligatorios", "fr-CA": "Minéraux obligatoires" },
        "Importer": { "pt-BR": "Importador", "es-MX": "Importador", "es-CL": "Importador", "fr-CA": "Importateur" },
        "Importer address": { "pt-BR": "Endereço do importador", "es-MX": "Domicilio del importador", "es-CL": "Dirección del importador", "fr-CA": "Adresse de l’importateur" },
        "FOP symbol size": { "pt-BR": "Tamanho do símbolo frontal", "es-MX": "Tamaño del símbolo frontal", "es-CL": "Tamaño del símbolo frontal", "fr-CA": "Taille du symbole frontal" },
        "Caffeine": { "pt-BR": "Cafeína", "es-MX": "Cafeína", "es-CL": "Cafeína", "fr-CA": "Caféine" },
        "Sweeteners": { "pt-BR": "Edulcorantes", "es-MX": "Edulcorantes", "es-CL": "Edulcorantes", "fr-CA": "Édulcorants" },
        "Child-directed elements": { "pt-BR": "Elementos infantis", "es-MX": "Elementos dirigidos a niños", "es-CL": "Elementos dirigidos a niños", "fr-CA": "Éléments destinés aux enfants" },
        "Octagon size": { "pt-BR": "Tamanho dos octógonos", "es-MX": "Tamaño de octágonos", "es-CL": "Tamaño de octágonos", "fr-CA": "Taille des octogones" },
        "Drained mass": { "pt-BR": "Massa drenada", "es-MX": "Masa drenada", "es-CL": "Masa drenada", "fr-CA": "Masse égouttée" },
        "Added critical nutrients": { "pt-BR": "Nutrientes críticos adicionados", "es-MX": "Nutrientes críticos añadidos", "es-CL": "Nutrientes críticos añadidos", "fr-CA": "Nutriments critiques ajoutés" },
        "Child advertising": { "pt-BR": "Publicidade infantil", "es-MX": "Publicidad infantil", "es-CL": "Publicidad infantil", "fr-CA": "Publicité destinée aux enfants" },
        "Warning seal size": { "pt-BR": "Tamanho dos selos", "es-MX": "Tamaño de sellos", "es-CL": "Tamaño de sellos", "fr-CA": "Taille des symboles d’avertissement" },
    };
    return labels[label]?.[language] || label;
}

function translateLegalHelp(help: string, language: SiteLanguage) {
    if (language === "en-US") return help;
    const pt: Record<string, string> = {
        "Full ingredient list in descending order by weight.": "Lista completa em ordem decrescente de peso.",
        "Required allergen/contains statement for the target market.": "Declaração de alérgenos/contém exigida pelo mercado.",
        "Net quantity as it will appear on pack.": "Conteúdo líquido exatamente como aparecerá na embalagem.",
        "Lot/batch identification.": "Identificação de lote/batch.",
        "Best before, expiration date, or use by date.": "Validade, consumo preferente ou data limite de uso.",
        "Manufacturer, distributor, importer, or food business operator.": "Fabricante, distribuidor, importador ou operador responsável.",
        "Full business address required by the market.": "Endereço completo exigido pelo mercado.",
        "Origin/provenance when required or when omission may mislead.": "Origem/proveniência quando exigida ou quando a omissão puder induzir erro.",
        "Special storage conditions when needed.": "Condições especiais de conservação quando necessárias.",
        "Preparation or use instructions when needed.": "Modo de preparo ou uso quando necessário.",
        "Principal display surface/package area used to size symbols and tables.": "Área principal da embalagem usada para dimensionar símbolos e tabelas.",
        "Evidence and calculation supporting every claim.": "Evidência e cálculo que sustentam cada claim.",
    };
    if (language === "pt-BR") return pt[help] || help;
    if (language === "fr-CA") return pt[help] || help;
    return pt[help] || help;
}

function getMarketLabel(market: InternationalMarket, language: SiteLanguage) {
    const labels: Record<InternationalMarket, Record<SiteLanguage, string>> = {
        br: { "pt-BR": "Brasil", "en-US": "Brazil", "es-MX": "Brasil", "es-CL": "Brasil", "fr-CA": "Brésil" },
        us: { "pt-BR": "Estados Unidos", "en-US": "United States", "es-MX": "Estados Unidos", "es-CL": "Estados Unidos", "fr-CA": "États-Unis" },
        eu: { "pt-BR": "União Europeia", "en-US": "European Union", "es-MX": "Unión Europea", "es-CL": "Unión Europea", "fr-CA": "Union européenne" },
        ca: { "pt-BR": "Canadá", "en-US": "Canada", "es-MX": "Canadá", "es-CL": "Canadá", "fr-CA": "Canada" },
        mx: { "pt-BR": "México", "en-US": "Mexico", "es-MX": "México", "es-CL": "México", "fr-CA": "Mexique" },
        cl: { "pt-BR": "Chile", "en-US": "Chile", "es-MX": "Chile", "es-CL": "Chile", "fr-CA": "Chili" },
    };
    return labels[market][language];
}

function getApprovalLabel(status: ApprovalStatus, language: SiteLanguage) {
    const labels: Record<ApprovalStatus, Record<SiteLanguage, string>> = {
        draft: { "pt-BR": "Rascunho técnico", "en-US": "Technical draft", "es-MX": "Borrador técnico", "es-CL": "Borrador técnico", "fr-CA": "Brouillon technique" },
        quality: { "pt-BR": "Qualidade", "en-US": "Quality", "es-MX": "Calidad", "es-CL": "Calidad", "fr-CA": "Qualité" },
        regulatory: { "pt-BR": "Regulatório", "en-US": "Regulatory", "es-MX": "Regulatorio", "es-CL": "Regulatorio", "fr-CA": "Réglementaire" },
        marketing: { "pt-BR": "Marketing", "en-US": "Marketing", "es-MX": "Marketing", "es-CL": "Marketing", "fr-CA": "Marketing" },
        approved: { "pt-BR": "Aprovado", "en-US": "Approved", "es-MX": "Aprobado", "es-CL": "Aprobado", "fr-CA": "Approuvé" },
    };
    return labels[status][language];
}

function getApprovalOwner(status: ApprovalStatus, language: SiteLanguage) {
    const owners: Record<ApprovalStatus, Record<SiteLanguage, string>> = {
        draft: { "pt-BR": "P&D", "en-US": "R&D", "es-MX": "I+D", "es-CL": "I+D", "fr-CA": "R-D" },
        quality: { "pt-BR": "Qualidade", "en-US": "Quality", "es-MX": "Calidad", "es-CL": "Calidad", "fr-CA": "Qualité" },
        regulatory: { "pt-BR": "Assuntos regulatórios", "en-US": "Regulatory affairs", "es-MX": "Asuntos regulatorios", "es-CL": "Asuntos regulatorios", "fr-CA": "Affaires réglementaires" },
        marketing: { "pt-BR": "Marca", "en-US": "Brand", "es-MX": "Marca", "es-CL": "Marca", "fr-CA": "Marque" },
        approved: { "pt-BR": "Gestor", "en-US": "Manager", "es-MX": "Responsable", "es-CL": "Responsable", "fr-CA": "Gestionnaire" },
    };
    return owners[status][language];
}
