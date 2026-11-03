import { sections, sectionKeys, type ProductSheet, type SectionKey } from "@/features/product-technical-sheets/domain/product-sheet";
import {
    CALCULATION_VERSION,
    MEMORIAL_CORE_NUTRIENTS,
} from "@/features/tables/domain/memorial";

export type MemorialValue = {
    label: string;
    unit: string;
    totalRecipe: number;
    per100: number;
    perPortion: number;
    dailyValuePercent?: string;
    display100?: string;
    displayPortion?: string;
};

type ComponentNutrient = {
    label: string;
    unit: string;
    value: number;
};

export type MemorialComponent = {
    name: string;
    quantity: number;
    quantityExact?: string;
    percentage: number;
    function: string;
    source: string;
    composition: ComponentNutrient[];
    contributionPer100: ComponentNutrient[];
    contributionPerPortion: ComponentNutrient[];
};

export type MemorialPreparation = {
    instructions: string;
    powderBatchWeight: number;
    addedIngredientsWeight: number;
    totalBeforePreparation: number;
    finalYield: number;
    preparationLoss: number;
    preparationLossPercent: number;
    readyPortionSize: number;
    powderPortionSize: number;
    addedIngredients: Array<{ name: string; quantity: number; quantityExact?: string }>;
};

export type MemorialAdditionalConstituent = {
    name: string;
    amount: string;
    unit: string;
    source: string;
};

export type MemorialManualMicronutrient = {
    label: string;
    unit: string;
};

export type MemorialSpecificationRow = {
    parameter: string;
    specification: string;
    method: string;
};

export type MemorialRevisionRow = {
    revision: string;
    date: string;
    description: string;
    responsible: string;
};

export type MemorialApprovalData = {
    name: string;
    role: string;
    date: string;
    signature: string;
};

export type MemorialTechnicalData = {
    documentId: string;
    code: string;
    revision: string;
    issueDate: string;
    brand: string;
    eanGtin: string;
    category: string;
    designation: string;
    description: string;
    ingredients: string;
    recommendedUse: string;
    physicochemical: {
        rows: MemorialSpecificationRow[];
    };
    microbiological: {
        legislation: string;
        rows: MemorialSpecificationRow[];
    };
    contaminants: {
        legislation: string;
        rows: MemorialSpecificationRow[];
    };
    foreignMatter: {
        legislation: string;
        rows: MemorialSpecificationRow[];
    };
    presentation: string;
    validity: string;
    storage: string;
    packaging: string;
    palletization: string;
    revisions: MemorialRevisionRow[];
    preparedBy: MemorialApprovalData;
    approvedBy: MemorialApprovalData;
};

export type MemorialVerificationData = {
    formulationPercent: number;
    formulationStatus: string;
    energySummedPer100: number;
    energyEstimatedPer100: number;
    energyDifferencePercent: number;
    energyStatus: string;
};

export type MemorialDocumentData = {
    title: string;
    description: string;
    regulatoryCategory: string;
    foodGroup: string;
    productSuggestion: string;
    physicalState: string;
    populationGroup: string;
    portionSize: number;
    portionUnit: string;
    householdMeasure: string;
    netContent: string;
    servingsPerPackage: string;
    totalWeight: number;
    generatedAt: Date;
    calculationVersion?: string;
    preparedBy?: string;
    values: MemorialValue[];
    components: MemorialComponent[];
    technical: MemorialTechnicalData;
    showDailyValue?: boolean;
    productSheet?: ProductSheet;
    productLaws?: Array<{ id: string; number: string; title: string }>;
    verification: MemorialVerificationData;
    additionalConstituents?: MemorialAdditionalConstituent[];
    manualMicronutrients?: MemorialManualMicronutrient[];
    preparation?: MemorialPreparation;
};

type PdfColor = readonly [number, number, number];
type PdfAlign = "left" | "center" | "right";

type PdfCommand =
    | { kind: "image"; x: number; y: number; width: number; height: number }
    | { kind: "text"; x: number; y: number; text: string; size: number; bold: boolean; color: PdfColor }
    | { kind: "rect"; x: number; y: number; width: number; height: number; fill?: PdfColor; stroke?: PdfColor; lineWidth?: number }
    | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: PdfColor; lineWidth: number };

type PdfPage = {
    commands: PdfCommand[];
    cursorY: number;
};

type PdfTableColumn = {
    title: string;
    width: number;
    align?: PdfAlign;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const FOOTER_TOP = PAGE_HEIGHT - 42;
const CONTENT_BOTTOM = PAGE_HEIGHT - 56;
const DEFAULT_SIZE = 8;
const DEFAULT_LEADING = 11;

const COLORS = {
    navy: [1 / 255, 54 / 255, 167 / 255] as const,
    darkNavy: [8 / 255, 47 / 255, 91 / 255] as const,
    cyan: [4 / 255, 178 / 255, 245 / 255] as const,
    lime: [120 / 255, 209 / 255, 28 / 255] as const,
    amber: [244 / 255, 185 / 255, 0] as const,
    ink: [23 / 255, 50 / 255, 77 / 255] as const,
    muted: [95 / 255, 113 / 255, 132 / 255] as const,
    border: [217 / 255, 228 / 255, 236 / 255] as const,
    paleBlue: [238 / 255, 248 / 255, 253 / 255] as const,
    paleNavy: [241 / 255, 245 / 255, 251 / 255] as const,
    rowAlt: [248 / 255, 250 / 255, 252 / 255] as const,
    white: [1, 1, 1] as const,
};

function formatNumber(value: number, maximumFractionDigits = 3) {
    if (!Number.isFinite(value) || Math.abs(value) < 0.0000005) return "0";

    return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits,
        minimumFractionDigits: 0,
    }).format(value);
}

function formatValue(value: number, unit: string) {
    return `${formatNumber(value)} ${unit}`.trim();
}

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
    }).format(value);
}

function rgb(color: PdfColor) {
    return color.map((channel) => channel.toFixed(3)).join(" ");
}

function escapePdfText(value: string) {
    const special: Record<string, number> = {
        "€": 128,
        "‚": 130,
        "ƒ": 131,
        "„": 132,
        "…": 133,
        "†": 134,
        "‡": 135,
        "ˆ": 136,
        "‰": 137,
        "Š": 138,
        "‹": 139,
        "Œ": 140,
        "Ž": 142,
        "‘": 145,
        "’": 146,
        "“": 147,
        "”": 148,
        "•": 149,
        "–": 150,
        "—": 151,
        "˜": 152,
        "™": 153,
        "š": 154,
        "›": 155,
        "œ": 156,
        "ž": 158,
        "Ÿ": 159,
    };

    return Array.from(value)
        .map((character) => {
            const code = character.charCodeAt(0);
            const byte = code >= 32 && code <= 126
                ? code
                : code >= 160 && code <= 255
                    ? code
                    : special[character] ?? 63;
            if (byte >= 32 && byte <= 126 && byte !== 40 && byte !== 41 && byte !== 92) {
                return String.fromCharCode(byte);
            }
            return `\\${byte.toString(8).padStart(3, "0")}`;
        })
        .join("");
}

function wrapText(text: string, size: number, maxWidth = CONTENT_WIDTH) {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return [""];

    const maxCharacters = Math.max(4, Math.floor(maxWidth / (size * 0.5)));
    const lines: string[] = [];
    let current = "";

    for (const word of normalized.split(" ")) {
        if (word.length > maxCharacters) {
            if (current) lines.push(current);
            for (let index = 0; index < word.length; index += maxCharacters) {
                lines.push(word.slice(index, index + maxCharacters));
            }
            current = "";
            continue;
        }

        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxCharacters && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }

    if (current) lines.push(current);
    return lines;
}

function textWidth(text: string, size: number) {
    return text.length * size * 0.5;
}

class PdfDocument {
    private pages: PdfPage[] = [];
    private readonly headerTitle: string;
    private readonly headerSubtitle: string;
    private readonly logo?: string;

    constructor(
        headerTitle = "MEMÓRIA DE CÁLCULO NUTRICIONAL",
        headerSubtitle = "Documento de suporte técnico • valores calculados",
        logo?: string,
    ) {
        this.logo = logo;
        this.headerTitle = headerTitle;
        this.headerSubtitle = headerSubtitle;
        this.startPage();
    }

    private get page() {
        return this.pages[this.pages.length - 1];
    }

    private startPage() {
        const page: PdfPage = { commands: [], cursorY: 86 };
        this.pages.push(page);

        page.commands.push(
            { kind: "rect", x: 0, y: 0, width: 374, height: 5, fill: COLORS.navy },
            { kind: "rect", x: 374, y: 0, width: 106, height: 5, fill: COLORS.cyan },
            { kind: "rect", x: 480, y: 0, width: 70, height: 5, fill: COLORS.lime },
            { kind: "rect", x: 550, y: 0, width: 45, height: 5, fill: COLORS.amber },
            ...(this.logo ? [{ kind: "image" as const, x: PAGE_MARGIN, y: 12, width: 120, height: 36 }] : [{ kind: "text" as const, x: PAGE_MARGIN, y: 30, text: "SoIZI", size: 18, bold: true, color: COLORS.navy }]),
            { kind: "text", x: 338, y: 25, text: this.headerTitle, size: 8, bold: true, color: COLORS.navy },
            { kind: "text", x: 338, y: 37, text: this.headerSubtitle, size: 6.5, bold: false, color: COLORS.muted },
            { kind: "line", x1: PAGE_MARGIN, y1: 58, x2: PAGE_WIDTH - PAGE_MARGIN, y2: 58, color: COLORS.border, lineWidth: 0.7 },
        );
    }

    private ensureSpace(height: number) {
        if (this.page.cursorY + height <= CONTENT_BOTTOM) return;
        this.startPage();
    }

    private addCommand(command: PdfCommand) {
        this.page.commands.push(command);
    }

    private addTextAt(text: string, x: number, y: number, size: number, bold = false, color: PdfColor = COLORS.ink, align: PdfAlign = "left", maxWidth = CONTENT_WIDTH) {
        const lines = wrapText(text, size, maxWidth);
        lines.forEach((line, index) => {
            const lineWidth = textWidth(line, size);
            const lineX = align === "right" ? x + maxWidth - lineWidth : align === "center" ? x + (maxWidth - lineWidth) / 2 : x;
            this.addCommand({ kind: "text", x: lineX, y: y + index * (size + 2) + size, text: line, size, bold, color });
        });
        return lines.length * (size + 2);
    }

    addText(text: string, options: { size?: number; leading?: number; bold?: boolean; color?: PdfColor; maxWidth?: number } = {}) {
        const size = options.size ?? DEFAULT_SIZE;
        const leading = options.leading ?? Math.max(DEFAULT_LEADING, size + 3);
        const lines = wrapText(text, size, options.maxWidth ?? CONTENT_WIDTH);

        for (const line of lines) {
            this.ensureSpace(leading);
            this.addCommand({ kind: "text", x: PAGE_MARGIN, y: this.page.cursorY + size, text: line, size, bold: options.bold ?? false, color: options.color ?? COLORS.ink });
            this.page.cursorY += leading;
        }
    }

    addSection(title: string) {
        this.ensureSpace(36);
        this.addCommand({ kind: "text", x: PAGE_MARGIN, y: this.page.cursorY + 10, text: title.toUpperCase(), size: 10.5, bold: true, color: COLORS.navy });
        this.addCommand({ kind: "line", x1: PAGE_MARGIN, y1: this.page.cursorY + 25, x2: PAGE_WIDTH - PAGE_MARGIN, y2: this.page.cursorY + 25, color: COLORS.border, lineWidth: 0.9 });
        this.page.cursorY += 34;
    }

    addCallout(text: string) {
        const size = 7.2;
        const lines = wrapText(text, size, CONTENT_WIDTH - 24);
        const height = lines.length * 10 + 14;
        this.ensureSpace(height + 4);
        this.addCommand({ kind: "rect", x: PAGE_MARGIN, y: this.page.cursorY, width: CONTENT_WIDTH, height, fill: COLORS.paleBlue, stroke: COLORS.cyan, lineWidth: 0.7 });
        lines.forEach((line, index) => {
            this.addCommand({ kind: "text", x: PAGE_MARGIN + 12, y: this.page.cursorY + 8 + index * 10 + size, text: line, size, bold: false, color: COLORS.ink });
        });
        this.page.cursorY += height + 8;
    }

    addTable(columns: PdfTableColumn[], rows: string[][], options: { headerFill?: PdfColor } = {}) {
        const headerFill = options.headerFill ?? COLORS.navy;
        const headerHeight = this.rowHeight(columns, columns.map((column) => column.title), true);
        let headerPage = -1;

        for (const [rowIndex, row] of rows.entries()) {
            const rowHeight = this.rowHeight(columns, row, false);
            const requiredHeight = rowHeight + (headerPage === this.pages.length - 1 ? 0 : headerHeight);
            if (this.page.cursorY + requiredHeight > CONTENT_BOTTOM) {
                this.startPage();
                headerPage = -1;
            }

            if (headerPage !== this.pages.length - 1) {
                this.drawRow(columns, columns.map((column) => column.title), headerHeight, true, headerFill, false);
                headerPage = this.pages.length - 1;
            }

            this.drawRow(columns, row, rowHeight, false, rowIndex % 2 === 1 ? COLORS.rowAlt : COLORS.white, rowIndex === rows.length - 1);
        }

        if (rows.length === 0) {
            this.ensureSpace(headerHeight);
            this.drawRow(columns, columns.map((column) => column.title), headerHeight, true, headerFill, true);
        }
        this.page.cursorY += 8;
    }

    private rowHeight(columns: PdfTableColumn[], cells: string[], header: boolean) {
        const size = header ? 6.5 : 7.1;
        const leading = header ? 8 : 9;
        const maxLines = columns.reduce((largest, column, index) => {
            const lines = wrapText(cells[index] || "", size, Math.max(column.width - 10, 10)).length;
            return Math.max(largest, lines);
        }, 1);
        return Math.max(header ? 21 : 20, maxLines * leading + 8);
    }

    private drawRow(columns: PdfTableColumn[], cells: string[], height: number, header: boolean, fill: PdfColor, lastRow: boolean) {
        const size = header ? 6.5 : 7.1;
        const leading = header ? 8 : 9;
        let x = PAGE_MARGIN;

        columns.forEach((column, index) => {
            const cellText = cells[index] || "";
            this.addCommand({ kind: "rect", x, y: this.page.cursorY, width: column.width, height, fill, stroke: COLORS.border, lineWidth: 0.6 });
            const lines = wrapText(cellText, size, Math.max(column.width - 10, 10));
            lines.forEach((line, lineIndex) => {
                const lineWidth = textWidth(line, size);
                const lineX = column.align === "right"
                    ? x + column.width - 5 - lineWidth
                    : column.align === "center"
                        ? x + (column.width - lineWidth) / 2
                        : x + 5;
                this.addCommand({
                    kind: "text",
                    x: lineX,
                    y: this.page.cursorY + 5 + lineIndex * leading + size,
                    text: line,
                    size,
                    bold: header,
                    color: header ? COLORS.white : COLORS.ink,
                });
            });
            x += column.width;
        });

        this.page.cursorY += height;
        if (lastRow) this.page.cursorY += 1;
    }

    addKeyValueRows(rows: Array<[string, string]>) {
        const chunks = rows.flatMap(([label, value]) => {
            const lines = wrapText(String(value), 7.1, CONTENT_WIDTH - 160);
            const result: string[][] = [];
            for (let index = 0; index < lines.length; index += 45) {
                result.push([index ? `${label} (continuação)` : String(label), lines.slice(index, index + 45).join(" ")]);
            }
            return result;
        });
        this.addTable([
            { title: "Campo", width: 150 },
            { title: "Valor", width: CONTENT_WIDTH - 150 },
        ], chunks);
    }

    addNutrientValueTable(title: string, values: ComponentNutrient[]) {
        this.addText(title, { bold: true, size: 7.8, color: COLORS.darkNavy });
        this.addTable([
            { title: "Nutriente", width: 270 },
            { title: "Un.", width: 48, align: "center" },
            { title: "Valor", width: CONTENT_WIDTH - 318, align: "right" },
        ], values.map((value) => [value.label, value.unit, formatNumber(value.value)]));
    }

    addComponentDetails(component: MemorialComponent) {
        this.ensureSpace(48);
        this.addText(component.name, { bold: true, size: 8.5, color: COLORS.darkNavy });
        this.addKeyValueRows([
            ["Função", requiredText(component.function)],
            ["Fonte nutricional", component.source],
            ["Quantidade utilizada", component.quantityExact ? `${component.quantityExact.replace(".", ",")} g` : formatValue(component.quantity, "g")],
            ["Percentual no produto", `${formatNumber(component.percentage, 2)}%`],
        ]);

        this.addTable([
            { title: "Nutriente", width: 176 },
            { title: "Un.", width: 40, align: "center" },
            { title: "Composição / 100 g", width: 98, align: "right" },
            { title: "Contribuição / 100 g", width: 98, align: "right" },
            { title: "Contribuição / porção", width: CONTENT_WIDTH - 412, align: "right" },
        ], component.composition.map((item, index) => {
            const contributionPer100 = component.contributionPer100[index];
            const contributionPerPortion = component.contributionPerPortion[index];
            return [
                item.label,
                item.unit,
                formatNumber(item.value),
                formatNumber(contributionPer100?.value ?? 0),
                formatNumber(contributionPerPortion?.value ?? 0),
            ];
        }));
    }

    addMicronutrientContributionTable(components: MemorialComponent[]) {
        const coreLabels = new Set(MEMORIAL_CORE_NUTRIENTS.map((item) => item.label));
        const rows = components.flatMap((component) => component.composition.flatMap((item, index) => {
            if (coreLabels.has(item.label)) return [];

            const contributionPer100 = component.contributionPer100[index];
            const contributionPerPortion = component.contributionPerPortion[index];
            return [[
                item.label,
                item.unit,
                component.name,
                formatNumber(item.value),
                `${formatNumber(component.percentage, 2)}%`,
                formatNumber(contributionPer100?.value ?? 0),
                formatNumber(contributionPerPortion?.value ?? 0),
            ]];
        }));

        this.addTable([
            { title: "Nutriente", width: 78 },
            { title: "Un.", width: 30, align: "center" },
            { title: "Fonte na formulação", width: 104 },
            { title: "Teor da fonte / 100 g", width: 70, align: "right" },
            { title: "Qtd. da fonte / formulação", width: 60, align: "right" },
            { title: "Contribuição / 100 g", width: 82, align: "right" },
            { title: "Contribuição / porção", width: CONTENT_WIDTH - 424, align: "right" },
        ], rows.length > 0 ? rows : [[
            "Não informado",
            "-",
            "Não informado",
            "0",
            "0%",
            "0",
            "0",
        ]]);
    }

    addSpecificationTable(title: string, rows: MemorialSpecificationRow[], legislation?: string) {
        this.addText(title, { bold: true, size: 8.5, color: COLORS.darkNavy });
        if (legislation) this.addText(legislation, { size: 7.1, leading: 9, color: COLORS.muted });
        const displayRows = rows.length > 0 ? rows : [{ parameter: "", specification: "", method: "" }];
        this.addTable([
            { title: "Parâmetro", width: 170 },
            { title: "Especificação / limite", width: 190 },
            { title: "Método", width: CONTENT_WIDTH - 360 },
        ], displayRows.map((row) => [
            requiredText(row.parameter),
            requiredText(row.specification),
            requiredText(row.method),
        ]));
    }

    toBytes() {
        const objects: string[] = [];
        const addObject = (value: string) => {
            objects.push(value);
            return objects.length;
        };

        const catalogId = addObject("");
        const pagesId = addObject("");
        const regularFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
        const pageIds: number[] = [];
        const logoHex = this.logo ? Buffer.from(this.logo, "base64").toString("hex") + ">" : "";
        const logoId = logoHex ? addObject(`<< /Type /XObject /Subtype /Image /Width 300 /Height 90 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logoHex.length} >>\nstream\n${logoHex}\nendstream`) : 0;

        this.pages.forEach((page, pageIndex) => {
            page.commands.push(
                { kind: "line", x1: PAGE_MARGIN, y1: FOOTER_TOP, x2: PAGE_WIDTH - PAGE_MARGIN, y2: FOOTER_TOP, color: COLORS.border, lineWidth: 0.7 },
                { kind: "text", x: PAGE_MARGIN, y: FOOTER_TOP + 15, text: "Soul Easy • documento de suporte técnico • revisão recomendada antes do uso", size: 6.2, bold: false, color: COLORS.muted },
                { kind: "text", x: PAGE_WIDTH - PAGE_MARGIN - 70, y: FOOTER_TOP + 15, text: `PÁGINA ${pageIndex + 1} DE ${this.pages.length}`, size: 6.2, bold: true, color: COLORS.muted },
            );

            const streamLines = page.commands.map((command) => {
                if (command.kind === "image") return `q ${command.width} 0 0 ${command.height} ${command.x} ${PAGE_HEIGHT - command.y - command.height} cm /Logo Do Q`;
                if (command.kind === "text") {
                    return `BT /${command.bold ? "F2" : "F1"} ${command.size} Tf ${rgb(command.color)} rg 1 0 0 1 ${command.x.toFixed(2)} ${(PAGE_HEIGHT - command.y).toFixed(2)} Tm (${escapePdfText(command.text)}) Tj ET`;
                }
                if (command.kind === "line") {
                    return `${command.lineWidth.toFixed(2)} w ${rgb(command.color)} RG ${command.x1.toFixed(2)} ${(PAGE_HEIGHT - command.y1).toFixed(2)} m ${command.x2.toFixed(2)} ${(PAGE_HEIGHT - command.y2).toFixed(2)} l S`;
                }

                const operations = [];
                if (command.fill) operations.push(`${rgb(command.fill)} rg`);
                if (command.stroke) operations.push(`${rgb(command.stroke)} RG`, `${(command.lineWidth ?? 0.6).toFixed(2)} w`);
                operations.push(`${command.x.toFixed(2)} ${(PAGE_HEIGHT - command.y - command.height).toFixed(2)} ${command.width.toFixed(2)} ${command.height.toFixed(2)} re`);
                operations.push(command.fill && command.stroke ? "B" : command.fill ? "f" : "S");
                return operations.join(" ");
            });
            const stream = ["q", ...streamLines, "Q"].join("\n");
            const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
            const pageId = addObject(
                `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> ${logoId ? `/XObject << /Logo ${logoId} 0 R >>` : ""} >> /Contents ${contentId} 0 R >>`
            );
            pageIds.push(pageId);
        });

        objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
        objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

        const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
        const chunks = [Buffer.from(header, "binary")];
        const offsets = [0];
        let offset = Buffer.byteLength(header, "binary");

        objects.forEach((object, index) => {
            const serialized = `${index + 1} 0 obj\n${object}\nendobj\n`;
            offsets.push(offset);
            chunks.push(Buffer.from(serialized, "ascii"));
            offset += Buffer.byteLength(serialized, "ascii");
        });

        const xrefOffset = offset;
        const xref = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
        for (let index = 1; index <= objects.length; index += 1) {
            xref.push(`${String(offsets[index]).padStart(10, "0")} 00000 n `);
        }
        const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
        chunks.push(Buffer.from(`${xref.join("\n")}\n${trailer}`, "ascii"));

        return new Uint8Array(Buffer.concat(chunks));
    }
}

function addValueRows(document: PdfDocument, values: MemorialValue[]) {
    document.addTable([
        { title: "Nutriente", width: 145 },
        { title: "Un.", width: 35, align: "center" },
        { title: "Receita total", width: 75, align: "right" },
        { title: "Por 100 g/ml", width: 75, align: "right" },
        { title: "Porção", width: 80, align: "right" },
        { title: "%VD*", width: CONTENT_WIDTH - 410, align: "right" },
    ], values.map((value) => [
        value.label,
        value.unit,
        formatNumber(value.totalRecipe),
        formatNumber(value.per100),
        formatNumber(value.perPortion),
        value.dailyValuePercent || "-",
    ]));
}

function addTechnicalNutritionRows(document: PdfDocument, values: MemorialValue[], showDailyValue = true) {
    const columns: PdfTableColumn[] = [
        { title: "Nutriente", width: 190 },
        { title: "Un.", width: 42, align: "center" },
        { title: "100 g/ml", width: 90, align: "right" },
        { title: "Porção", width: showDailyValue ? 90 : CONTENT_WIDTH - 322, align: "right" },
        ...(showDailyValue ? [{ title: "%VD*", width: CONTENT_WIDTH - 412, align: "right" as const }] : []),
    ];
    document.addTable(columns, values.map(value => [value.label, value.unit, value.display100 ?? formatNumber(value.per100), value.displayPortion ?? formatNumber(value.perPortion), ...(showDailyValue ? [value.dailyValuePercent || "-"] : [])]));
}

function requiredText(value: string) {
    return value.trim() || "Não informado no cadastro";
}

export function createMemorialPdf(data: MemorialDocumentData) {
    const document = new PdfDocument();

    document.addText("MEMORIAL DE CÁLCULO NUTRICIONAL", { size: 17, leading: 22, bold: true, color: COLORS.darkNavy });
    document.addText(data.title || "Produto não informado", { size: 11, leading: 15, bold: true, color: COLORS.navy });
    if (data.description) document.addText(data.description, { size: 8, leading: 11, color: COLORS.muted });

    document.addSection("Identificação do produto");
    document.addKeyValueRows([
        ["Produto", data.title || "Não informado"],
        ["Versão do cálculo", data.calculationVersion || CALCULATION_VERSION],
        ["Categoria regulatória", data.regulatoryCategory || "Não informada"],
        ["Grupo de alimento", data.foodGroup || "Não informado"],
        ["Produto sugerido", data.productSuggestion || "Não informado"],
        ["Grupo populacional", data.populationGroup || "Não informado"],
        ["Base de cálculo", `100 ${data.portionUnit || "g"} e porção`],
    ]);

    document.addSection("Parâmetros utilizados");
    document.addKeyValueRows([
        ["Porção declarada", formatValue(data.portionSize, data.portionUnit || "g")],
        ["Medida caseira", data.householdMeasure || "Não informada"],
        ["Conteúdo líquido / peso", data.netContent || "Não informado"],
        ["Porções por embalagem", data.servingsPerPackage || "Não informado"],
        ["Massa total considerada", formatValue(data.totalWeight, data.portionUnit === "ml" ? "ml" : "g")],
        ["Data de geração", formatDate(data.generatedAt)],
        ["Responsável pela geração", data.preparedBy || "Usuário autorizado"],
    ]);

    document.addSection("Componentes considerados no cálculo");
    document.addTable([
        { title: "Item", width: 28, align: "center" },
        { title: "Componente", width: 130 },
        { title: "Quantidade", width: 65, align: "right" },
        { title: "Qtd. na formulação (%)", width: 85, align: "right" },
        { title: "Função", width: 90 },
        { title: "Fonte na formulação", width: CONTENT_WIDTH - 398 },
    ], data.components.map((component, index) => [
        String(index + 1).padStart(2, "0"),
        component.name,
        component.quantityExact ? `${component.quantityExact.replace(".", ",")} g` : formatValue(component.quantity, "g"),
        `${formatNumber(component.percentage, 2)}%`,
        requiredText(component.function),
        component.source,
    ]));

    document.addSection("Composição e contribuição nutricional");
    document.addText("Os valores abaixo apresentam a composição nutricional usada para cada componente e sua contribuição no produto final.", { size: 7.4, leading: 10, color: COLORS.muted });
    for (const component of data.components) document.addComponentDetails(component);

    if (data.preparation) document.addCallout("Os valores por 100 g referem-se ao produto preparado; os valores por porção referem-se ao pó declarado. Os ingredientes adicionados no preparo não compõem essa porção.");

    document.addSection("Informação nutricional consolidada");
    addValueRows(document, data.values);
    document.addText("* Percentual de valores diários fornecidos pela porção. Os valores brutos permanecem disponíveis para rastreabilidade; o arredondamento regulatório da tabela final ocorre em sua própria exportação.", { size: 7.1, leading: 9, color: COLORS.muted });

    if (data.manualMicronutrients && data.manualMicronutrients.length > 0) {
        const labels = data.manualMicronutrients
            .map((item) => `${item.label} (${item.unit})`)
            .join(", ");
        document.addCallout(`Valores declarados manualmente por 100 g/ml: ${labels}. Esses valores substituem o cálculo derivado dos componentes e a coluna por porção é proporcional.`);
    }

    if (data.preparation) {
        document.addSection("Informações de preparo e rendimento");
        document.addKeyValueRows([
            ["Instruções de preparo", data.preparation.instructions || "Não informadas"],
            ["Lote considerado", formatValue(data.preparation.powderBatchWeight, "g")],
            ["Massa antes do preparo", formatValue(data.preparation.totalBeforePreparation, "g")],
            ["Rendimento final", formatValue(data.preparation.finalYield, "g")],
            ["Perda no preparo", `${formatValue(data.preparation.preparationLoss, "g")} (${formatNumber(data.preparation.preparationLossPercent, 2)}%)`],
            ["Porção do produto pronto", formatValue(data.preparation.readyPortionSize, "g")],
            ["Pó equivalente na porção", formatValue(data.preparation.powderPortionSize, "g")],
        ]);
        if (data.preparation.addedIngredients.length > 0) {
            document.addTable([
                { title: "Ingrediente adicionado", width: CONTENT_WIDTH - 120 },
                { title: "Quantidade", width: 120, align: "right" },
            ], data.preparation.addedIngredients.map((item) => [item.name, item.quantityExact ? `${item.quantityExact.replace(".", ",")} g` : formatValue(item.quantity, "g")]));
        }
    }

    document.addSection("Observações");
    document.addCallout("Documento de apoio à revisão técnica. Confira as fontes, os dados e os resultados antes de usar o rótulo. A responsabilidade pela validação do produto e da rotulagem é do usuário ou da organização responsável.");

    return document.toBytes();
}

export function createTechnicalSheetPdf(data: MemorialDocumentData) {
    const document = new PdfDocument(
        "FICHA TÉCNICA",
        "SoIZI • documento técnico • dados consolidados",
        data.productSheet?.logo,
    );
    const technical = data.technical;
    if (data.productSheet) {
        const sheet = data.productSheet;
        const summarySections: SectionKey[] = ["identification", "labeling", "storage", "validity", "document"];
        const renderSection = (key: SectionKey) => {
            if (sheet.hidden.includes(key) || (sheet.template === "summary" && !summarySections.includes(key))) return;
            document.addSection(sections[key].label);
            const fields = Object.entries(sections[key].fields).map(([field, label]): [string, string] => [label, requiredText(sheet.fields[field] || "")]);
            if (key === "identification") fields.unshift(["Produto", requiredText(data.title)], ["Peso líquido / conteúdo", requiredText(data.netContent)]);
            document.addKeyValueRows(fields);
            for (const selection of sheet.laws.filter(law => law.section === key)) {
                const law = data.productLaws?.find(item => item.id === selection.id);
                if (law) document.addText(`${law.number} — ${law.title}${selection.note ? ` • ${selection.note}` : ""}`, { size: 8, leading: 11 });
            }
        };
        document.addText("FICHA TÉCNICA DE PRODUTO", { size: 17, leading: 22, bold: true, color: COLORS.darkNavy });
        renderSection("identification");
        renderSection("labeling");
        if (!sheet.hidden.includes("nutrition")) {
            document.addSection("Informação nutricional");
            document.addKeyValueRows([["Porções por embalagem", data.servingsPerPackage || "Não informado"], ["Porção", formatValue(data.portionSize, data.portionUnit || "g")], ["Medida caseira", data.householdMeasure || "Não informado"]]);
            addTechnicalNutritionRows(document, data.values, data.showDailyValue !== false);
            document.addText(data.showDailyValue === false ? "Valores calculados a partir da formulação salva." : "* Percentual de valores diários fornecidos pela porção. Valores calculados a partir da formulação salva.", { size: 7.1, leading: 9, color: COLORS.muted });
            for (const selection of sheet.laws.filter(law => law.section === "nutrition")) { const law = data.productLaws?.find(item => item.id === selection.id); if (law) document.addText(`${law.number} — ${law.title}${selection.note ? ` • ${selection.note}` : ""}`, { size: 8, leading: 11 }); }
        }
        for (const key of sectionKeys) if (key !== "identification" && key !== "labeling" && key !== "nutrition") renderSection(key);
        document.addText("Documento gerado automaticamente pelo sistema. Confira as informações antes do uso.", { size: 7.1, leading: 9, color: COLORS.muted });
        return document.toBytes();
    }

    document.addText("FICHA TÉCNICA DE PRODUTO ACABADO", { size: 17, leading: 22, bold: true, color: COLORS.darkNavy });
    document.addText(data.title || "Produto não informado", { size: 11, leading: 15, bold: true, color: COLORS.navy });

    document.addSection("01 • Identificação do produto");
    document.addKeyValueRows([
        ["Título do produto", requiredText(data.title)],
        ["Código", requiredText(technical.code)],
        ["Revisão", requiredText(technical.revision)],
        ["Data", requiredText(technical.issueDate)],
        ["Identificação do documento", requiredText(technical.documentId)],
        ["Marca", requiredText(technical.brand)],
        ["EAN / GTIN", requiredText(technical.eanGtin)],
        ["Categoria do produto", requiredText(technical.category)],
    ]);

    document.addSection("02 • Informações do produto");
    document.addKeyValueRows([
        ["Peso líquido / conteúdo", data.netContent || "Não informado"],
        ["Designação", requiredText(technical.designation)],
        ["Descrição", requiredText(technical.description)],
        ["Ingredientes", requiredText(technical.ingredients)],
        ["Uso recomendado", requiredText(technical.recommendedUse)],
    ]);

    document.addSection("03 • Características técnicas e qualidade");
    document.addSpecificationTable("Características físico-químicas", technical.physicochemical.rows);
    document.addSpecificationTable(
        "Características microbiológicas",
        technical.microbiological.rows,
        technical.microbiological.legislation,
    );
    document.addSpecificationTable(
        "Contaminantes",
        technical.contaminants.rows,
        technical.contaminants.legislation,
    );
    document.addSpecificationTable(
        "Matérias estranhas",
        technical.foreignMatter.rows,
        technical.foreignMatter.legislation,
    );

    document.addSection("04 • Informação nutricional");
    document.addKeyValueRows([
        ["Porções por embalagem", data.servingsPerPackage || "Não informado"],
        ["Porção", formatValue(data.portionSize, data.portionUnit || "g")],
        ["Medida caseira", data.householdMeasure || "Não informado"],
    ]);
    addTechnicalNutritionRows(document, data.values);
    document.addText("* Percentual de valores diários fornecidos pela porção. Os valores são consolidados a partir da formulação salva.", { size: 7.1, leading: 9, color: COLORS.muted });

    document.addSection("05 • Apresentação e logística");
    document.addKeyValueRows([
        ["Apresentação", requiredText(technical.presentation)],
        ["Validade", requiredText(technical.validity)],
        ["Armazenamento", requiredText(technical.storage)],
        ["Tipo de embalagem", requiredText(technical.packaging)],
        ["Características de paletização", requiredText(technical.palletization)],
    ]);

    document.addSection("06 • Histórico de revisões e aprovações");
    document.addText("Histórico de revisões", { bold: true, size: 8.5, color: COLORS.darkNavy });
    document.addTable([
        { title: "Revisão", width: 55 },
        { title: "Data", width: 80 },
        { title: "Descrição", width: 230 },
        { title: "Responsável", width: CONTENT_WIDTH - 365 },
    ], (technical.revisions.length > 0 ? technical.revisions : [{ revision: "", date: "", description: "", responsible: "" }]).map((row) => [
        requiredText(row.revision),
        requiredText(row.date),
        requiredText(row.description),
        requiredText(row.responsible),
    ]));
    document.addText("Elaborado por", { bold: true, size: 8.5, color: COLORS.darkNavy });
    document.addKeyValueRows([
        ["Nome", requiredText(technical.preparedBy.name)],
        ["Cargo", requiredText(technical.preparedBy.role)],
        ["Data", requiredText(technical.preparedBy.date)],
        ["Assinatura", requiredText(technical.preparedBy.signature)],
    ]);
    document.addText("Aprovado por", { bold: true, size: 8.5, color: COLORS.darkNavy });
    document.addKeyValueRows([
        ["Nome", requiredText(technical.approvedBy.name)],
        ["Cargo", requiredText(technical.approvedBy.role)],
        ["Data", requiredText(technical.approvedBy.date)],
        ["Assinatura", requiredText(technical.approvedBy.signature)],
    ]);

    document.addCallout("Este documento reserva as variáveis da Ficha Técnica de Produto Acabado. Quando um dado ainda não foi cadastrado, o campo aparece como não informado.");
    return document.toBytes();
}

export function formatMemorialNumber(value: number) {
    return formatNumber(value);
}
