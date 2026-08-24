import "server-only";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isInternalMasterEmail } from "@/features/master/domain/master-identity";

export { isInternalMasterEmail } from "@/features/master/domain/master-identity";

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
