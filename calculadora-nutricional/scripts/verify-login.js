const { PrismaClient } = require('@prisma/client');
const { compare } = require('bcryptjs');

const prisma = new PrismaClient();

async function verify() {
    const email = process.env.VERIFY_EMAIL;
    const password = process.env.VERIFY_PASSWORD;

    if (!email || !password) {
        throw new Error('Defina VERIFY_EMAIL e VERIFY_PASSWORD para validar login.');
    }

    console.log('Verifying login...');

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error('User NOT found!');
        return;
    }

    console.log('User found.');

    const isValid = await compare(password, user.password);
    console.log('Password valid:', isValid);
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
