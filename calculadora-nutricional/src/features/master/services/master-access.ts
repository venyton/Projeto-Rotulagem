import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function configuredMasterEmails() {
  return (process.env.INTERNAL_MASTER_EMAILS || process.env.MASTER_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isInternalMasterEmail(email?: string | null) {
  if (!email) return false;
  return configuredMasterEmails().includes(email.trim().toLowerCase());
}

export async function getCurrentInternalMaster() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!isInternalMasterEmail(email)) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  return user;
}
