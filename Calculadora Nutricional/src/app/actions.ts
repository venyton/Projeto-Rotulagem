'use server'

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";

export async function registerUser(prevState: unknown, formData: FormData): Promise<{ error?: string }> {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password || !name) {
        return { error: "Todos os campos são obrigatórios." };
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { error: "Email já cadastrado." };
    }

    const hashedPassword = await hash(password, 10);

    await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    redirect("/login");
}
