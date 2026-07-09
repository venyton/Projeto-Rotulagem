import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getTechnicalSheetExtraction,
  listTechnicalSheetDocuments,
} from "@/features/technical-sheets/actions/technical-sheet-actions";
import { TechnicalSheetExtractionList } from "@/features/technical-sheets/components/TechnicalSheetExtractionList";
import { TechnicalSheetExtractionReview } from "@/features/technical-sheets/components/TechnicalSheetExtractionReview";
import { TechnicalSheetImportDialog } from "@/features/technical-sheets/components/TechnicalSheetImportDialog";
import { ModuleGateMessage } from "@/features/saas/components/ModuleGateMessage";
import { SAAS_MODULES } from "@/features/saas/domain/modules";
import { contextHasModuleAccess, getCurrentSaaSContext } from "@/features/saas/services/entitlements";

type TechnicalSheetsPageProps = {
  searchParams: Promise<{ documentId?: string }>;
};

export default async function TechnicalSheetsPage({ searchParams }: TechnicalSheetsPageProps) {
  const context = await getCurrentSaaSContext();
  if (!context || !contextHasModuleAccess(context, SAAS_MODULES.TECHNICAL_SHEETS)) {
    return <ModuleGateMessage moduleKey={SAAS_MODULES.TECHNICAL_SHEETS} />;
  }

  const params = await searchParams;
  const selectedDocumentId = params.documentId;
  const [documents, selectedExtraction] = await Promise.all([
    listTechnicalSheetDocuments(context.user.id),
    selectedDocumentId ? getTechnicalSheetExtraction(selectedDocumentId, context.user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="app-page space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/dashboard/ingredients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ingredientes
            </Link>
          </Button>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Ingredientes</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Fichas técnicas importadas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revise extrações por IA antes de salvar em meus ingredientes.
          </p>
        </div>
        <TechnicalSheetImportDialog />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <TechnicalSheetExtractionList
          documents={documents}
          selectedDocumentId={selectedDocumentId}
        />

        {selectedDocumentId && selectedExtraction && (
          <TechnicalSheetExtractionReview data={selectedExtraction} />
        )}

        {selectedDocumentId && !selectedExtraction && (
          <div className="app-panel p-6 text-sm text-amber-800">
            Nenhuma extração encontrada para este documento. Ele pode ainda estar sendo processado ou ter falhado.
          </div>
        )}

        {!selectedDocumentId && (
          <div className="app-empty-state p-6 text-sm">
            Selecione uma ficha técnica para revisar.
          </div>
        )}
      </div>
    </div>
  );
}
