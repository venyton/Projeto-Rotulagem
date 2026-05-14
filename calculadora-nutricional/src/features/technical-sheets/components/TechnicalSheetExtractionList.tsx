"use client";

import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TechnicalSheetDocumentListItem } from "@/features/technical-sheets/domain/technical-sheet-types";

const statusIcon = {
  COMPLETED: CheckCircle2,
  PROCESSING: Clock3,
  PENDING: Clock3,
  FAILED: XCircle,
} as const;

const DOC_TYPE_LABELS: Record<string, string> = {
  PRODUCT_TECHNICAL: "Ficha técnica",
  PRODUCT_TECHNICAL_SHEET: "Ficha técnica",
  TECHNICAL_SHEET: "Ficha técnica",
  NUTRITION_LABEL: "Rótulo nutricional",
  NUTRITION_TABLE_ONLY: "Tabela nutricional",
  SAFETY_DATA_SHEET: "FISPQ",
  CERTIFICATE: "Certificado",
  UNKNOWN: "Não identificado",
  Pendente: "Pendente",
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Concluído",
  PROCESSING: "Processando",
  PENDING: "Pendente",
  FAILED: "Falhou",
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  NEEDS_REVIEW: "Revisão necessária",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

const statusColor: Record<string, string> = {
  COMPLETED: "text-emerald-600",
  APPROVED: "text-emerald-600",
  PROCESSING: "text-amber-500",
  PENDING: "text-muted-foreground",
  NEEDS_REVIEW: "text-amber-500",
  FAILED: "text-red-500",
  REJECTED: "text-red-500",
};

export function TechnicalSheetExtractionList({
  documents,
  selectedDocumentId,
}: {
  documents: TechnicalSheetDocumentListItem[];
  selectedDocumentId?: string;
}) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/[0.22]">
            <TableHead>Arquivo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Confiança</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Nenhuma ficha técnica importada.
              </TableCell>
            </TableRow>
          ) : (
            documents.map((document) => {
              const displayStatus = document.reviewStatus || document.status;
              const Icon = statusIcon[document.status as keyof typeof statusIcon] || AlertCircle;
              const active = selectedDocumentId === document.id;
              const color = statusColor[displayStatus] || "text-muted-foreground";

              return (
                <TableRow
                  key={document.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/30 ${active ? "bg-primary/[0.06] ring-1 ring-inset ring-primary/20" : ""}`}
                  onClick={() =>
                    router.push(`/dashboard/ingredients/technical-sheets?documentId=${document.id}`)
                  }
                >
                  <TableCell>
                    <div className="font-medium">{document.productName || document.fileName}</div>
                    <div className="text-xs text-muted-foreground">{document.fileName}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {DOC_TYPE_LABELS[document.documentType] || document.documentType}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {REVIEW_STATUS_LABELS[displayStatus] || STATUS_LABELS[displayStatus] || displayStatus}
                    </span>
                  </TableCell>
                  <TableCell>
                    {typeof document.confidence === "number"
                      ? `${Math.round(document.confidence * 100)}%`
                      : "-"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
