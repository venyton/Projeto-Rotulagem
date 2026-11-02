"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export function ApplicationChrome({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
}) {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return children;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header isLoggedIn={isLoggedIn} />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
