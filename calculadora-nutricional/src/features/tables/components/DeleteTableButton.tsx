"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteTableButton({ tableId, title }: { tableId: string; title: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/tables/${tableId}`, {
                method: "DELETE",
            });
            const data = (await response.json().catch(() => ({}))) as { error?: string };

            if (!response.ok) {
                throw new Error(data.error || "Erro ao excluir tabela.");
            }

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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" size="sm" variant="destructive" className="w-full gap-2">
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Excluir tabela?</DialogTitle>
                    <DialogDescription>
                        Esta ação remove "{title}" e não pode ser desfeita.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
                        Cancelar
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Excluindo..." : "Excluir tabela"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
