"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function DeleteTableButton({ tableId, title }: { tableId: string; title: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/tables/${tableId}`, { method: "DELETE" });
            const data = (await response.json().catch(() => ({}))) as { error?: string };
            if (!response.ok) throw new Error(data.error || "Erro ao excluir tabela.");
            toast.success("Tabela excluída.");
            setOpen(false);
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Erro ao excluir tabela.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button type="button" size="sm" variant="destructive" className="w-full">
                    <Trash2 data-icon="inline-start" />Excluir
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir tabela?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação remove “{title}” e não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting ? <Spinner data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
                        {deleting ? "Excluindo..." : "Excluir tabela"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
