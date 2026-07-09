export const MICRONUTRIENTS = [
    { name: "fatMono", label: "Gorduras monoinsaturadas", unit: "g" },
    { name: "fatPoly", label: "Gorduras poli-insaturadas", unit: "g" },
    { name: "omega6", label: "Ômega 6", unit: "g" },
    { name: "omega3", label: "Ômega 3", unit: "mg" },
    { name: "cholesterol", label: "Colesterol", unit: "mg" },

    { name: "calcium", label: "Cálcio", unit: "mg" },
    { name: "chloride", label: "Cloreto", unit: "mg" },
    { name: "magnesium", label: "Magnésio", unit: "mg" },
    { name: "manganese", label: "Manganês", unit: "mg" },
    { name: "phosphorus", label: "Fósforo", unit: "mg" },
    { name: "iron", label: "Ferro", unit: "mg" },
    { name: "potassium", label: "Potássio", unit: "mg" },
    { name: "copper", label: "Cobre", unit: "µg" },
    { name: "zinc", label: "Zinco", unit: "mg" },
    { name: "selenium", label: "Selênio", unit: "µg" },
    { name: "chromium", label: "Cromo", unit: "µg" },
    { name: "molybdenum", label: "Molibdênio", unit: "µg" },
    { name: "iodine", label: "Iodo", unit: "µg" },
    { name: "fluoride", label: "Flúor", unit: "mg" },

    { name: "vitaminA", label: "Vitamina A", unit: "µg" },
    { name: "vitaminD", label: "Vitamina D", unit: "µg" },
    { name: "vitaminE", label: "Vitamina E", unit: "mg" },
    { name: "vitaminK", label: "Vitamina K", unit: "µg" },
    { name: "vitaminC", label: "Vitamina C", unit: "mg" },
    { name: "thiamin", label: "Tiamina (Vit. B1)", unit: "mg" },
    { name: "riboflavin", label: "Riboflavina (Vit. B2)", unit: "mg" },
    { name: "niacin", label: "Niacina (Vit. B3)", unit: "mg" },
    { name: "vitaminB6", label: "Vitamina B6", unit: "mg" },
    { name: "biotin", label: "Biotina", unit: "µg" },
    { name: "folicAcid", label: "Ácido Fólico", unit: "µg" },
    { name: "pantothenicAcid", label: "Ácido Pantotênico", unit: "mg" },
    { name: "vitaminB12", label: "Vitamina B12", unit: "µg" },
    { name: "choline", label: "Colina", unit: "mg" },
] as const;

export const MICRONUTRIENTS_A_TO_Z = [...MICRONUTRIENTS].sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" })
);

export const MICRO_KEYS = MICRONUTRIENTS.map(m => m.name);
