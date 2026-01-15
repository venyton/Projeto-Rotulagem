const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../Dataset/Table examples/Grupos.xlsx');
console.log('Reading file from:', filePath);

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Use raw:true to avoid parsing issues, but we might need parsed numbers
    const data = xlsx.utils.sheet_to_json(sheet, { defval: "" }); // Use defval to get empty strings for empty cells

    const groups = [];
    let currentGroup = null;

    // Columns identified: 
    // "Grupo"
    // "Produtos"
    // "Tamanho das porções (g ou ml)"
    // "Medidas caseiras sugeridas"

    data.forEach(row => {
        // "Grupo" acts as a header or merged cell value. 
        // If row["Grupo"] is present, it might be a new group or continuation?
        // Actually usually merged cells in "sheet_to_json" might appear only on first row OR repeated if configured.
        // Let's assume standard behavior: first row has it, others might be empty if merged. 
        // BUT `sheet_to_json` doesn't handle merge filling automatically unless we process it?
        // Actually typical `sheet_to_json` leaves empty for merged cells below top-left.
        // So we track `lastGroup`.

        let groupName = row['Grupo'];
        if (groupName && groupName.trim() !== '') {
            // Clean up group name (remove numbers like "Grupo 1 - " if strictly needed, or keep as is)
            currentGroup = groupName.trim();
        }

        if (!currentGroup) return; // Skip if no group defined yet

        // Find or create group entry
        let groupEntry = groups.find(g => g.group === currentGroup);
        if (!groupEntry) {
            groupEntry = { group: currentGroup, products: [] };
            groups.push(groupEntry);
        }

        const name = row['Produtos'];
        const portionRaw = row['Tamanho das porções (g ou ml)'];
        const measure = row['Medidas caseiras sugeridas'];

        if (name && name.trim() !== '') {
            // Parse portion: might be "150" or "150 ml" or number. 
            // Ideally we want a number.
            let portion = 0;
            if (typeof portionRaw === 'number') {
                portion = portionRaw;
            } else if (typeof portionRaw === 'string') {
                const match = portionRaw.match(/(\d+([.,]\d+)?)/);
                if (match) portion = parseFloat(match[1].replace(',', '.'));
            }

            groupEntry.products.push({
                name: name.trim(),
                portion: portion,
                measure: measure ? measure.trim() : ""
            });
        }
    });

    // Generate TS content
    const tsContent = `export type Product = {
    name: string;
    portion: number;
    measure: string;
};

export type FoodGroup = {
    group: string;
    products: Product[];
};

export const FOOD_GROUPS: FoodGroup[] = ${JSON.stringify(groups, null, 4)};
`;

    const outputPath = path.join(__dirname, '../src/lib/foodGroups.ts');
    fs.writeFileSync(outputPath, tsContent);
    console.log(`Successfully generated ${outputPath} with ${groups.length} groups.`);

} catch (e) {
    console.error('Error processing file:', e);
}
