const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'teste@teste.com';
    const password = 'teste';

    console.log(`Creating test user ${email}...`);

    const hashedPassword = await hash(password, 10);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword
            },
            create: {
                email,
                name: 'Usuario Teste',
                password: hashedPassword,
            },
        });
        console.log('Success! Created/Updated user:', user.email);
        console.log('Password:', password);
    } catch (e) {
        console.error('Error creating user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
