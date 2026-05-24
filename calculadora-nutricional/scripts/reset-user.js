const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = process.env.RESET_EMAIL;
    const newPassword = process.env.RESET_PASSWORD;
    const name = process.env.RESET_NAME || 'Usuario';

    if (!email || !newPassword) {
        throw new Error('Defina RESET_EMAIL e RESET_PASSWORD para resetar senha.');
    }

    console.log('Resetting password...');

    const hashedPassword = await hash(newPassword, 12);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword
            },
            create: {
                email,
                name,
                password: hashedPassword,
            },
        });
        console.log('Success! User updated:', user.id);
    } catch (e) {
        console.error('Error updating user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
