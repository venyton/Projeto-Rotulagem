import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileSearch } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
  const canUseAiImport = contextHasModuleAccess(context, SAAS_MODULES.AI_IMPORT);
  const canUseCustomIngredients = contextHasModuleAccess(context, SAAS_MODULES.CUSTOM_INGREDIENTS);
  const selectedDocumentId = params.documentId;
  const [documents, selectedExtraction] = await Promise.all([
    listTechnicalSheetDocuments(),
    selectedDocumentId ? getTechnicalSheetExtraction(selectedDocumentId) : Promise.resolve(null),
  ]);

  return (
    <div className="app-page flex flex-col gap-6">
      <PageHeader
        eyebrow="Ingredientes"
        icon={FileSearch}
        title="Fichas técnicas importadas"
        description="Revise as extrações por IA antes de salvar os dados em seus ingredientes."
        actions={
          <>
            {canUseCustomIngredients ? (
              <Button asChild variant="outline">
                <Link href="/dashboard/ingredients">
                  <ArrowLeft data-icon="inline-start" />
                  Ingredientes
                </Link>
              </Button>
            ) : null}
            {canUseAiImport ? <TechnicalSheetImportDialog /> : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <TechnicalSheetExtractionList
          documents={documents}
          selectedDocumentId={selectedDocumentId}
        />

        {selectedDocumentId && selectedExtraction && (
          <TechnicalSheetExtractionReview data={selectedExtraction} canApprove={canUseCustomIngredients} />
        )}

        {selectedDocumentId && !selectedExtraction && (
          <Alert variant="default">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Extração indisponível</AlertTitle>
            <AlertDescription>O documento pode ainda estar em processamento ou ter falhado.</AlertDescription>
          </Alert>
        )}

        {!selectedDocumentId && (
          <Empty className="min-h-64 border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon"><FileSearch aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Selecione uma ficha técnica</EmptyTitle>
              <EmptyDescription>Escolha um documento na lista para revisar a extração.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
