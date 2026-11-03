import { z } from "zod";

export const sections = {
  identification: { label: "Identificação do produto", fields: { company: "Razão social ou empresa", units: "Unidades por embalagem", brand: "Marca", manufacturer: "Fabricante", address: "Endereço do fabricante", cnpj: "CNPJ", registration: "Regularização", category: "Categoria", ncm: "NCM" } },
  labeling: { label: "Informações de rotulagem", fields: { ingredients: "Lista de ingredientes", allergens: "Declaração de alergênicos", lactose: "Declaração de lactose", gluten: "Declaração de glúten", warnings: "Advertências", frontal: "Rotulagem nutricional frontal", otherStatements: "Outras frases" } },
  nutrition: { label: "Informação nutricional", fields: {} },
  microbiological: { label: "Características microbiológicas", fields: { microbiological: "Especificações microbiológicas" } },
  foreignMatter: { label: "Características microscópicas e macroscópicas", fields: { foreignMatter: "Especificações microscópicas e macroscópicas" } },
  contaminants: { label: "Contaminantes", fields: { contaminants: "Micotoxinas, metais e outros contaminantes" } },
  physicochemical: { label: "Características físico-químicas e sensoriais", fields: { physicochemical: "Características físico-químicas", sensory: "Características sensoriais", otherTechnical: "Outras especificações" } },
  packaging: { label: "Embalagem", fields: { primaryPackaging: "Embalagem primária", secondaryPackaging: "Embalagem secundária", tertiaryPackaging: "Embalagem terciária", packagingMaterial: "Material", packageQuantity: "Peso ou quantidade por embalagem", unitsPerBox: "Unidades por caixa", dimensions: "Dimensões" } },
  storage: { label: "Armazenamento e conservação", fields: { storage: "Condições de armazenamento", storageTemperature: "Temperatura de conservação", afterOpening: "Orientação após abertura", storageProtection: "Cuidados com umidade, calor, luz e odores", preservation: "Instruções de preservação" } },
  transport: { label: "Transporte", fields: { transport: "Condições de transporte", vehicle: "Condições do veículo", transportMoisture: "Proteção contra umidade", transportRestrictions: "Restrições de transporte conjunto", transportTemperature: "Temperatura de transporte" } },
  stacking: { label: "Empilhamento", fields: { stacking: "Empilhamento máximo", boxes: "Quantidade máxima de caixas", handling: "Orientações de movimentação" } },
  validity: { label: "Prazo de validade", fields: { validity: "Prazo total e unidade", validityAfterOpening: "Prazo após abertura e unidade", validityConditions: "Condições vinculadas à validade" } },
  codes: { label: "Códigos", fields: { productCode: "Código interno do produto", packagingCode: "Código da embalagem", barcode: "Código de barras", eanGtin: "GTIN/EAN", boxCode: "Código da caixa", otherCodes: "Outros códigos" } },
  document: { label: "Controle do documento", fields: { documentCode: "Código do documento", revision: "Revisão", issueDate: "Data de emissão", revisionDate: "Data da última revisão", preparedBy: "Responsável pela elaboração", approvedBy: "Responsável pela aprovação", signature: "Assinatura" } },
} as const;
export type SectionKey = keyof typeof sections;
export const sectionKeys = Object.keys(sections) as SectionKey[];
export const fieldKeys = Object.values(sections).flatMap(section => Object.keys(section.fields));
const fieldValues = z.record(z.string(), z.string().max(4000)).refine(v => Object.keys(v).every(k => fieldKeys.includes(k)) && Object.keys(v).length <= fieldKeys.length);
export const productSheetSchema = z.object({
  template: z.enum(["complete", "summary"]),
  logo: z.string().max(160_000).regex(/^(?:[A-Za-z0-9+/]*={0,2})?$/).optional(),
  hidden: z.array(z.enum(sectionKeys as [SectionKey, ...SectionKey[]])).max(sectionKeys.length),
  fields: fieldValues,
  laws: z.array(z.object({ id: z.string().max(100), section: z.enum(sectionKeys as [SectionKey, ...SectionKey[]]), note: z.string().max(1000) }).strict()).max(100),
}).strict();
export type ProductSheet = z.infer<typeof productSheetSchema>;
export const emptySheet: ProductSheet = { template: "complete", hidden: [], fields: {}, laws: [] };
export function readProductSheet(value: unknown): ProductSheet {
  const parsed = productSheetSchema.safeParse(value);
  return parsed.success ? parsed.data : emptySheet;
}
