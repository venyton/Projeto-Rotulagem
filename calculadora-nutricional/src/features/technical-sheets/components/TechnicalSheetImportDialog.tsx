"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Info, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { importTechnicalSheet } from "@/features/technical-sheets/actions/technical-sheet-actions";
import type { TechnicalSheetActionState } from "@/features/technical-sheets/domain/technical-sheet-types";

const initialState: TechnicalSheetActionState = {};

export function TechnicalSheetImportDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [state, formAction] = useActionState(importTechnicalSheet, initialState);

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success && state.documentId) {
      toast.success(state.message || "Ficha importada.");
      const timeoutId = window.setTimeout(() => setOpen(false), 0);
      router.push(`/dashboard/ingredients/technical-sheets?documentId=${state.documentId}`);
      router.refresh();
      return () => window.clearTimeout(timeoutId);
    }
  }, [router, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UploadCloud className="mr-2 h-4 w-4" />
            Importar ficha técnica com IA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,34rem)] max-w-none">
        <DialogHeader>
          <DialogTitle>Importar ficha técnica com IA</DialogTitle>
          <DialogDescription>Envie arquivos para extrair e revisar os dados antes do cadastro.</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <FieldGroup>
          <Field>
            <FieldLabel htmlFor="technical-sheet-file">PDF ou imagem</FieldLabel>
            <Input
              id="technical-sheet-file"
              name="files"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              multiple
              required
              onChange={(event) => setSelectedCount(event.currentTarget.files?.length || 0)}
            />
            <FieldDescription>
              {selectedCount > 0
                ? `${selectedCount} arquivo(s) selecionado(s).`
                : "Pode selecionar mais de um arquivo. O processamento é em fila."}
            </FieldDescription>
          </Field>

          <Alert>
            <Info aria-hidden="true" />
            <AlertDescription>A extração fica pendente. O ingrediente só é criado depois da sua aprovação.</AlertDescription>
          </Alert>

          <SubmitButton />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Spinner data-icon="inline-start" /> : <UploadCloud data-icon="inline-start" />}
      {pending ? "Processando fila..." : "Enviar para IA"}
    </Button>
  );
}
