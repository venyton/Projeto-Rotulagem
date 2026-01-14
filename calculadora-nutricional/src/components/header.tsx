"use client";

import Image from "next/image";
import { ModeToggle } from "./theme-toggle";

export function Header() {
    return (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-16 items-center justify-between py-4">
                <div className="flex items-center gap-2">
                    <div className="relative h-10 w-32">
                        <Image
                            src="/logo.png"
                            alt="So IZI Logo"
                            fill
                            className="object-contain" // Contain to show full logo
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ModeToggle />
                </div>
            </div>
        </header>
    );
}
