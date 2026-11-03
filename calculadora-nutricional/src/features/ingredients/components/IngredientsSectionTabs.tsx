import Link from "next/link";
import { FileSearch, PackageSearch } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type IngredientsSectionTab = "ingredients" | "technical-sheets";

const tabs: Array<{
  value: IngredientsSectionTab;
  label: string;
  href: string;
  icon: typeof PackageSearch;
}> = [
  { value: "ingredients", label: "Meus ingredientes", href: "/dashboard/ingredients", icon: PackageSearch },
  { value: "technical-sheets", label: "Fichas técnicas", href: "/dashboard/ingredients/technical-sheets", icon: FileSearch },
];

export function IngredientsSectionTabs({
  activeTab,
  canUseIngredients,
  canUseTechnicalSheets,
}: {
  activeTab: IngredientsSectionTab;
  canUseIngredients: boolean;
  canUseTechnicalSheets: boolean;
}) {
  const visibleTabs = tabs.filter((tab) => (
    tab.value === "ingredients" ? canUseIngredients : canUseTechnicalSheets
  ));

  if (visibleTabs.length < 2) return null;

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList variant="line" aria-label="Seção de ingredientes" className="w-full justify-start overflow-x-auto">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <TabsTrigger key={tab.value} value={tab.value} asChild>
              <Link href={tab.href} className="inline-flex min-w-max items-center gap-2">
                <Icon aria-hidden="true" />
                {tab.label}
              </Link>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
