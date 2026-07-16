import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { translate as translateWithBing } from "bing-translate-api";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "src/features/i18n/domain/generated-ui-translations.ts");
const TARGETS = ["pt", "en", "es", "fr"];
const SPLIT = "<<<SOIZI_I18N_SPLIT>>>";
const TRANSLATABLE_ATTRIBUTES = new Set(["alt", "aria-label", "placeholder", "title"]);
const TRANSLATABLE_COMPONENT_PROPS = new Set([
  "action", "answer", "description", "detail", "emptyLabel", "error", "eyebrow", "help",
  "label", "message", "placeholder", "question", "subtitle", "success", "summary", "title",
]);
const TRANSLATABLE_PROPERTIES = new Set([
  "action", "answer", "description", "detail", "error", "eyebrow", "help", "label",
  "message", "name", "placeholder", "question", "subtitle", "success", "summary", "title",
]);
const EXCLUDED_FILES = [
  "/components/ui/",
  "/features/i18n/",
  "/features/enterprise/components/EnterpriseWorkspace.tsx",
  "/features/enterprise/components/InternationalNutritionLabel.tsx",
  "/features/tables/components/NutritionalLabel.tsx",
  "/features/tables/components/MagnifyingGlassLabel.tsx",
];
const PRESERVE = new Set([
  "SoIZI", "ANVISA", "Open Food Facts", "Enterprise", "LinkedIn",
  "PNG", "JPEG", "WEBP", "SVG", "JSON", "Excel", "PDF", "CPF/CNPJ", "2FA",
  "QR Code", "GS1 Digital Link", "FDA", "RACC", "QUID", "%VD", "%DV", "OK",
  "kcal", "mg", "g", "ml", "oz", "UFC", "ERP", "API", "GET /api/v1/tables",
  "100 g", "100 g/ml", "g/100 g", "mg/100 g", "g/100 g pronto", "mg/100 g pronto",
]);
const OVERRIDES = {
  "Tabelas": ["Tabelas nutricionais", "Nutrition labels", "Etiquetas nutricionales"],
  "Minhas tabelas": ["Minhas tabelas", "My nutrition labels", "Mis etiquetas nutricionales"],
  "Nova tabela": ["Nova tabela", "New nutrition label", "Nueva etiqueta nutricional"],
  "Nova tabela nutricional": ["Nova tabela nutricional", "New nutrition label", "Nueva etiqueta nutricional"],
  "Editor de tabela nutricional": ["Editor de tabela nutricional", "Nutrition label editor", "Editor de etiquetas nutricionales"],
  "Tabela salva com sucesso!": ["Tabela salva com sucesso!", "Nutrition label saved successfully!", "¡Etiqueta nutricional guardada correctamente!"],
  "Tabela excluída.": ["Tabela excluída.", "Nutrition label deleted.", "Etiqueta nutricional eliminada."],
  "Rotulagem nutricional": ["Rotulagem nutricional", "Nutrition labeling", "Etiquetado nutricional"],
  "Ingrediente": ["Ingrediente", "Ingredient", "Ingrediente"],
  "Ingredientes": ["Ingredientes", "Ingredients", "Ingredientes"],
  "Idioma": ["Idioma", "Language", "Idioma"],
  "Início": ["Início", "Home", "Inicio"],
  "Sair": ["Sair", "Sign out", "Cerrar sesión"],
  "Workspace": ["Área de trabalho", "Workspace", "Área de trabajo"],
  "Abrir Enterprise": ["Abrir Enterprise", "Open Enterprise", "Abrir Enterprise"],
  "Abrir fichas": ["Abrir fichas", "Open technical sheets", "Abrir fichas técnicas"],
  "Abrir tabelas": ["Abrir tabelas", "Open nutrition labels", "Abrir etiquetas nutricionales"],
  "30 dias": ["30 dias", "30 days", "30 días"],
  "90 dias": ["90 dias", "90 days", "90 días"],
  "Ác. Fólico": ["Ác. Fólico", "Folic acid", "Ác. fólico"],
  "Ác. Pantot. B5": ["Ác. Pantot. B5", "Pantothenic acid B5", "Ác. pantoténico B5"],
  "A plataforma permite gerar imagens, planilha Excel e um pacote organizado com os materiais da tabela.": ["A plataforma permite gerar imagens, planilha Excel e um pacote organizado com os materiais da tabela.", "The platform can generate images, an Excel spreadsheet, and an organized package containing the nutrition label files.", "La plataforma permite generar imágenes, una hoja de cálculo de Excel y un paquete organizado con los archivos de la etiqueta nutricional."],
  "Aplicação na tabela": ["Aplicação na tabela", "Application in the nutrition facts table", "Aplicación en la tabla nutricional"],
  "Atenção: As alterações afetam todas as tabelas associadas.": ["Atenção: As alterações afetam todas as tabelas associadas.", "Warning: Changes affect all associated nutrition labels.", "Atención: Los cambios afectan a todas las etiquetas nutricionales asociadas."],
  "Buscar tabela...": ["Buscar tabela...", "Search nutrition labels...", "Buscar etiquetas nutricionales..."],
  "Compare modelos e confira a tabela antes de gerar os arquivos finais.": ["Compare modelos e confira a tabela antes de gerar os arquivos finais.", "Compare formats and review the nutrition label before generating the final files.", "Compare los formatos y revise la etiqueta nutricional antes de generar los archivos finales."],
  "Consigo revisar a tabela antes de exportar?": ["Consigo revisar a tabela antes de exportar?", "Can I review the nutrition label before exporting it?", "¿Puedo revisar la etiqueta nutricional antes de exportarla?"],
  "Continuar uma tabela": ["Continuar uma tabela", "Continue a nutrition label", "Continuar una etiqueta nutricional"],
  "Criar tabela": ["Criar tabela", "Create nutrition label", "Crear etiqueta nutricional"],
  "Crie sua primeira tabela nutricional para começar.": ["Crie sua primeira tabela nutricional para começar.", "Create your first nutrition label to get started.", "Cree su primera etiqueta nutricional para comenzar."],
  "Crie tabelas nutricionais padrão ANVISA": ["Crie tabelas nutricionais padrão ANVISA", "Create ANVISA-compliant nutrition labels", "Cree etiquetas nutricionales que cumplan con ANVISA"],
  "Editar tabela": ["Editar tabela", "Edit nutrition label", "Editar etiqueta nutricional"],
  "Entre no painel para continuar seu trabalho ou crie uma conta para montar sua primeira tabela.": ["Entre no painel para continuar seu trabalho ou crie uma conta para montar sua primeira tabela.", "Open the dashboard to continue your work, or create an account to build your first nutrition label.", "Ingrese al panel para continuar su trabajo o cree una cuenta para preparar su primera etiqueta nutricional."],
  "Erro ao excluir tabela.": ["Erro ao excluir tabela.", "Could not delete the nutrition label.", "No se pudo eliminar la etiqueta nutricional."],
  "Erro ao salvar tabela.": ["Erro ao salvar tabela.", "Could not save the nutrition label.", "No se pudo guardar la etiqueta nutricional."],
  "Gere a tabela antes de exportar.": ["Gere a tabela antes de exportar.", "Generate the nutrition label before exporting it.", "Genere la etiqueta nutricional antes de exportarla."],
  "Importar ficha técnica com IA": ["Importar ficha técnica com IA", "Import technical sheet with AI", "Importar ficha técnica con IA"],
  "Nenhuma tabela encontrada": ["Nenhuma tabela encontrada", "No nutrition labels found", "No se encontraron etiquetas nutricionales"],
  "Nenhuma tabela salva": ["Nenhuma tabela salva", "No saved nutrition labels", "No hay etiquetas nutricionales guardadas"],
  "Selecionar todas as tabelas": ["Selecionar todas as tabelas", "Select all nutrition labels", "Seleccionar todas las etiquetas nutricionales"],
  "Tabelas nutricionais": ["Tabelas nutricionais", "Nutrition facts tables", "Tablas nutricionales"],
  "Da ficha ao rótulo": ["Da ficha ao rótulo", "From technical sheet to label", "De la ficha técnica a la etiqueta"],
  "Engenheira de Alimentos e especialista em rotulagem.": ["Engenheira de Alimentos e especialista em rotulagem.", "Food engineer and labeling specialist.", "Ingeniera de alimentos y especialista en etiquetado."],
  "O que fazemos": ["O que fazemos", "What we do", "Qué hacemos"],
  "Medida Caseira": ["Medida Caseira", "Household measure", "Medida casera"],
  "Porção": ["Porção", "Serving", "Porción"],
  "Porção (g)": ["Porção (g)", "Serving (g)", "Porción (g)"],
  "Porção e medida caseira": ["Porção e medida caseira", "Serving and household measure", "Porción y medida casera"],
  "Selecione a medida caseira": ["Selecione a medida caseira", "Select a household measure", "Seleccione una medida casera"],
  "Digite a medida caseira (ex: 2 colheres rasas)": ["Digite a medida caseira (ex: 2 colheres rasas)", "Enter the household measure (e.g., 2 level tablespoons)", "Ingrese la medida casera (p. ej., 2 cucharadas rasas)"],
  "Lupa": ["Lupa", "Front-of-pack warning", "Advertencia frontal"],
  "Base de cálculo da lupa": ["Base de cálculo da lupa", "Front-of-pack threshold basis", "Base de evaluación de la advertencia frontal"],
  "Classificação da base da lupa": ["Classificação da base da lupa", "Front-of-pack basis classification", "Clasificación de la base de la advertencia frontal"],
  "Lupa ativa para este produto.": ["Lupa ativa para este produto.", "Front-of-pack warning active for this product.", "Advertencia frontal activa para este producto."],
  "Lupa inativa para este produto.": ["Lupa inativa para este produto.", "Front-of-pack warning inactive for this product.", "Advertencia frontal inactiva para este producto."],
  "Modelos de lupa ANVISA no ZIP": ["Modelos de lupa ANVISA no ZIP", "ANVISA front-of-pack warning formats in the ZIP", "Formatos de advertencia frontal de ANVISA en el ZIP"],
  "Área para ajustar regras especiais do rótulo, como lupa frontal, suplementos e categorias com declarações obrigatórias.": ["Área para ajustar regras especiais do rótulo, como lupa frontal, suplementos e categorias com declarações obrigatórias.", "Area for adjusting special label rules, such as front-of-pack warnings, supplements, and categories with mandatory statements.", "Área para ajustar reglas especiales de la etiqueta, como advertencias frontales, suplementos y categorías con declaraciones obligatorias."],
};

const FRENCH_OVERRIDES = {
  "Tabelas": "Étiquettes nutritionnelles",
  "Minhas tabelas": "Mes étiquettes nutritionnelles",
  "Nova tabela": "Nouvelle étiquette nutritionnelle",
  "Nova tabela nutricional": "Nouvelle étiquette nutritionnelle",
  "Editor de tabela nutricional": "Éditeur d’étiquettes nutritionnelles",
  "Tabela salva com sucesso!": "Étiquette nutritionnelle enregistrée avec succès!",
  "Tabela excluída.": "Étiquette nutritionnelle supprimée.",
  "Rotulagem nutricional": "Étiquetage nutritionnel",
  "Abrir tabelas": "Ouvrir les étiquettes nutritionnelles",
  "Buscar tabela...": "Rechercher des étiquettes nutritionnelles...",
  "Compare modelos e confira a tabela antes de gerar os arquivos finais.": "Comparez les formats et vérifiez l’étiquette nutritionnelle avant de générer les fichiers finaux.",
  "Consigo revisar a tabela antes de exportar?": "Puis-je vérifier l’étiquette nutritionnelle avant de l’exporter?",
  "Continuar uma tabela": "Continuer une étiquette nutritionnelle",
  "Criar tabela": "Créer une étiquette nutritionnelle",
  "Crie sua primeira tabela nutricional para começar.": "Créez votre première étiquette nutritionnelle pour commencer.",
  "Crie tabelas nutricionais padrão ANVISA": "Créez des étiquettes nutritionnelles conformes aux normes de l’ANVISA",
  "Editar tabela": "Modifier l’étiquette nutritionnelle",
  "Erro ao excluir tabela.": "Impossible de supprimer l’étiquette nutritionnelle.",
  "Erro ao salvar tabela.": "Impossible d’enregistrer l’étiquette nutritionnelle.",
  "Gere a tabela antes de exportar.": "Générez l’étiquette nutritionnelle avant de l’exporter.",
  "Nenhuma tabela encontrada": "Aucune étiquette nutritionnelle trouvée",
  "Nenhuma tabela salva": "Aucune étiquette nutritionnelle enregistrée",
  "Selecionar todas as tabelas": "Sélectionner toutes les étiquettes nutritionnelles",
  "Tabelas nutricionais": "Étiquettes nutritionnelles",
  "Da ficha ao rótulo": "De la fiche technique à l’étiquette",
  "SoIZI - Tabela Nutricional": "SoIZI - Étiquetage nutritionnel",
};

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return /\.(tsx|ts)$/.test(entry.name) ? [fullPath] : [];
  });
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function shouldKeep(value) {
  if (!value || !/[A-Za-zÀ-ÿ]/.test(value) || value.length > 420) return false;
  if (PRESERVE.has(value)) return false;
  if (/^(true|false|null|undefined|default|secondary|destructive|success|warning|solid|system|general|specific)$/i.test(value)) return false;
  if (/^(\/|#|\.|--|&|\[|@|<|var\(|https?:|data:)/.test(value)) return false;
  if (/^(application|image)\//.test(value) || value.includes("-src 'self'") || value.includes("-ancestors 'none'")) return false;
  if (/\.(png|jpe?g|webp|svg|xlsx?|pdf|json)$/i.test(value)) return false;
  if (/^[a-z][a-zA-Z0-9_-]*$/.test(value) && !/[áàâãéêíóôõúç]/i.test(value)) return false;
  if (/^(flex|grid|border|text-|bg-|hover:|focus:|ring-|px-|py-|w-|h-|min-|max-|items-|justify-|gap-|space-|rounded|shadow|transition|duration|absolute|relative|sticky|fixed|overflow|truncate)/.test(value)) return false;
  if (/^-?[a-z]+-\d/i.test(value)) return false;
  return true;
}

function propertyName(node) {
  if (!ts.isPropertyAssignment(node)) return "";
  return ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : "";
}

function collectStrings() {
  const values = new Set();
  const add = (raw) => {
    const value = normalize(String(raw));
    if (shouldKeep(value)) values.add(value);
  };

  const files = walkFiles(path.join(ROOT, "src"))
    .filter((file) => !EXCLUDED_FILES.some((excluded) => file.includes(excluded)))
    .filter((file) => !file.endsWith(".test.ts"));

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

    function visit(node) {
      if (ts.isJsxText(node)) add(node.text);

      if (ts.isJsxAttribute(node) && TRANSLATABLE_ATTRIBUTES.has(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) {
        add(node.initializer.text);
      }

      if (ts.isJsxAttribute(node) && TRANSLATABLE_COMPONENT_PROPS.has(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) {
        add(node.initializer.text);
      }

      if (ts.isPropertyAssignment(node) && TRANSLATABLE_PROPERTIES.has(propertyName(node))) {
        if (ts.isStringLiteralLike(node.initializer)) add(node.initializer.text);
      }

      if (ts.isArrayLiteralExpression(node)) {
        for (const item of node.elements) {
          if (ts.isStringLiteralLike(item)) add(item.text);
        }
      }

      if (ts.isConditionalExpression(node)) {
        for (const branch of [node.whenTrue, node.whenFalse]) {
          if (ts.isStringLiteralLike(branch)) add(branch.text);
        }
      }

      if (ts.isCallExpression(node)) {
        const called = node.expression.getText(sourceFile);
        if (/toast|setError|setMessage|setStatus/i.test(called)) {
          for (const argument of node.arguments) {
            if (ts.isStringLiteralLike(argument)) add(argument.text);
          }
        }
      }

      if (ts.isNewExpression(node) && node.expression.getText(sourceFile) === "Error") {
        for (const argument of node.arguments ?? []) {
          if (ts.isStringLiteralLike(argument)) add(argument.text);
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  for (const value of [
    "Administração", "Abrir ou recolher navegação", "Conta", "Site institucional",
    "Informações básicas", "Dados legais e metadados", "Nenhuma pendência",
    "SoIZI · Rotulagem nutricional", "SoIZI · Sistema de rotulagem",
    "Revogado em", "Expira em", "Último uso", "sem data",
  ]) add(value);

  return [...values].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

async function translateBatch(values, target) {
  let result;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      result = await translateWithBing(values.join(`\n${SPLIT}\n`), "pt", target);
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  const translated = result.translation.split(SPLIT).map(normalize);
  if (translated.length !== values.length) {
    if (values.length === 1) throw new Error(`Unexpected translation batch size: ${translated.length}/${values.length}`);
    const individualTranslations = [];
    for (const value of values) individualTranslations.push(...await translateBatch([value], target));
    return individualTranslations;
  }
  return translated;
}

function loadExistingTranslations() {
  if (!fs.existsSync(OUTPUT)) return {};
  const existing = {};
  for (const line of fs.readFileSync(OUTPUT, "utf8").split("\n")) {
    const match = line.match(/^  (.+): (\[.*\]),$/);
    if (!match) continue;
    try {
      existing[JSON.parse(match[1])] = JSON.parse(match[2]);
    } catch {
      // Ignore a malformed generated line and translate it again.
    }
  }
  return existing;
}

function createBatches(values) {
  const batches = [];
  let current = [];
  let size = 0;
  for (const value of values) {
    if (size + value.length + SPLIT.length + 2 > 850) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(value);
    size += value.length + SPLIT.length + 2;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function main() {
  const existing = loadExistingTranslations();
  const offline = process.argv.includes("--offline");
  const collectedSources = collectStrings();
  if (process.argv.includes("--report-missing")) {
    console.log(JSON.stringify(collectedSources.filter((source) => !existing[source] && !OVERRIDES[source]), null, 2));
    return;
  }
  const sources = offline
    ? collectedSources.filter((source) => existing[source] || OVERRIDES[source])
    : collectedSources;
  const translations = Object.fromEntries(sources.map((source) => [source, existing[source]
    ? { en: existing[source][1], es: existing[source][2], fr: existing[source][3] }
    : {}]));
  const jobs = [];

  for (const target of TARGETS.filter((target) => target !== "pt")) {
    const missing = sources.filter((source) => !translations[source][target]);
    for (const batch of createBatches(missing)) jobs.push({ target, batch });
  }

  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const result = await translateBatch(job.batch, job.target);
      result.forEach((translated, index) => {
        translations[job.batch[index]][job.target] = translated;
      });
    }
  }
  await worker();

  const entries = sources.map((source) => {
    const override = OVERRIDES[source];
    const french = FRENCH_OVERRIDES[source] ?? translations[source].fr;
    const values = override
      ? [...override, french]
      : [source, translations[source].en, translations[source].es, french];
    return `  ${JSON.stringify(source)}: ${JSON.stringify(values)},`;
  });
  const output = `// Generated by scripts/generate-ui-translations.mjs.\n` +
    `// Keep domain-specific overrides in the generator so the catalog remains reproducible.\n` +
    `export const GENERATED_UI_TRANSLATIONS = {\n${entries.join("\n")}\n} as const;\n`;
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, output);
  console.log(`Generated ${sources.length} UI translations.`);
}

await main();
