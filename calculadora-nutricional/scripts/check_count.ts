import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.ingredient.count();
    console.log(`Ingredient count: ${count}`);
}
main().finally(() => prisma.$disconnect());
