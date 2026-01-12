const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'izidoro.venyton@gmail.com';
    const newPassword = '123456';

    console.log(`Resetting password for ${email}...`);

    const hashedPassword = await hash(newPassword, 10);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword
            },
            create: {
                email,
                name: 'Izidoro Venyton',
                password: hashedPassword,
            },
        });
        console.log('Success! User updated:', user.email);
        console.log('New password is:', newPassword);
    } catch (e) {
        console.error('Error updating user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
