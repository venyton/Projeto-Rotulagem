const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log("Testing database connection...");

    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        console.log("Attempting to connect...");
        await prisma.$connect();
        console.log("Connected successfully!");

        console.log("Running simple query...");
        const count = await prisma.user.count();
        console.log(`User count: ${count}`);

    } catch (e) {
        console.error("Connection failed:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
