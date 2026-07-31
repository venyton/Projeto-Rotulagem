"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

function statusVariant(status: string) {
  if (status === "COMPLETED" || status === "APPROVED") return "success" as const;
  if (status === "PROCESSING" || status === "NEEDS_REVIEW") return "warning" as const;
  if (status === "FAILED" || status === "REJECTED") return "destructive" as const;
  return "secondary" as const;
}

export function TechnicalSheetExtractionList({
  documents,
  selectedDocumentId,
  page,
  pageSize,
  total,
}: {
  documents: TechnicalSheetDocumentListItem[];
  selectedDocumentId?: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const openDocument = (documentId: string) => {
    router.push(`/dashboard/ingredients/technical-sheets?documentId=${encodeURIComponent(documentId)}`);
  };

  return (
    <Card className="overflow-hidden py-0">
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
              const confidence = typeof document.confidence === "number"
                ? Math.round(document.confidence * 100)
                : null;

              return (
                <TableRow
                  key={document.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/30 ${active ? "bg-primary/[0.06] ring-1 ring-inset ring-primary/20" : ""}`}
                  role="link"
                  tabIndex={0}
                  aria-current={active ? "page" : undefined}
                  aria-label={`Abrir ${document.productName || document.fileName}`}
                  onClick={() => openDocument(document.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDocument(document.id);
                    }
                  }}
                >
                  <TableCell>
                    <div className="font-medium">{document.productName || document.fileName}</div>
                    <div className="text-xs text-muted-foreground">{document.fileName}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {DOC_TYPE_LABELS[document.documentType] || document.documentType}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(displayStatus)}>
                      <Icon aria-hidden="true" />
                      {REVIEW_STATUS_LABELS[displayStatus] || STATUS_LABELS[displayStatus] || displayStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {confidence === null ? "-" : (
                      <div className="flex min-w-24 items-center gap-2">
                        <Progress value={confidence} aria-label={`Confiança: ${confidence}%`} />
                        <span className="w-9 text-xs tabular-nums">{confidence}%</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {total > pageSize ? (
        <div className="flex items-center justify-between gap-3 border-t p-3 text-sm text-muted-foreground">
          <span>Mostrando {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/ingredients/technical-sheets?page=${page - 1}`}>Anterior</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>Anterior</Button>
            )}
            {page * pageSize < total ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/ingredients/technical-sheets?page=${page + 1}`}>Próxima</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
