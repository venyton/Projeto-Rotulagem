const { PrismaClient } = require('@prisma/client');

console.log('PrismaClient type:', typeof PrismaClient);
console.log('Env DATABASE_URL:', process.env.DATABASE_URL);

// Workaround attempts
process.env.DATABASE_URL = "file:./dev.db";

try {
    const prisma = new PrismaClient();
    console.log('PrismaClient instance created successfully');

    prisma.user.count().then(c => console.log('Count:', c)).catch(e => console.error('Query failed:', e));

} catch (e) {
    console.error('Instantiation failed in test script!');
    console.error(e.message);
    if (e.stack) console.error(e.stack);
}
