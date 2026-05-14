"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="technical-sheet-file">PDF ou imagem</Label>
            <Input
              id="technical-sheet-file"
              name="files"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              multiple
              required
              onChange={(event) => setSelectedCount(event.currentTarget.files?.length || 0)}
            />
            <p className="text-xs text-muted-foreground">
              {selectedCount > 0
                ? `${selectedCount} arquivo(s) selecionado(s).`
                : "Pode selecionar mais de um arquivo. O processamento é em fila."}
            </p>
          </div>

          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
            A extração fica pendente. O ingrediente só nasce depois da sua aprovação.
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Processando fila..." : "Enviar para IA"}
    </Button>
  );
}
