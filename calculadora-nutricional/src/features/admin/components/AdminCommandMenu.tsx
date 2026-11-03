"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { AdminNavGroup } from "@/components/dashboard/DashboardShell";

export function AdminCommandMenu({ groups }: { groups: AdminNavGroup[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden min-w-40 justify-between gap-3 font-normal text-muted-foreground sm:flex"
        onClick={() => setOpen(true)}
        aria-label="Buscar área administrativa"
      >
        <span className="flex items-center gap-2">
          <Search data-icon="inline-start" />
          Buscar área
        </span>
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘ K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Buscar área administrativa"
      >
        <Search aria-hidden="true" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar na gestão"
        description="Navegar para uma área"
      >
        <CommandInput placeholder="Buscar clientes, cobranças, planos..." />
        <CommandList>
          <CommandEmpty>Nenhuma área encontrada.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    value={`${group.label} ${item.label}`}
                    onSelect={() => goTo(item.href)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
