const { PrismaClient } = require('@prisma/client');
const { compare } = require('bcryptjs');

const prisma = new PrismaClient();

async function verify() {
    const email = 'izidoro.venyton@gmail.com';
    const password = '123456';

    console.log(`Verifying login for ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error('User NOT found!');
        return;
    }

    console.log('User found:', user.email);
    console.log('Stored hash:', user.password);

    const isValid = await compare(password, user.password);
    console.log('Password valid:', isValid);
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
