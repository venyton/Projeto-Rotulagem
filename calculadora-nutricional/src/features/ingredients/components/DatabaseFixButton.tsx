'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DatabaseFixButton() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    if (process.env.NODE_ENV === "production") {
        return null;
    }

    const handleFix = async () => {
        setLoading(true);
        setMessage(null);

        // Setup manual timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        try {
            const res = await fetch('/api/debug/force-migrate', {
                method: 'POST',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const text = await res.text();
                // Slice error text to prevent massive layout shifts
                throw new Error(`Erro ${res.status}: ${text.slice(0, 100)}`);
            }

            const data = await res.json() as { success?: boolean; errors?: string[] };

            if (data.success) {
                setMessage("Banco de dados corrigido! Recarregando...");
                // Reload page to reflect database changes
                setTimeout(() => {
                    router.refresh();
                }, 2000);
            } else {
                const errorDetails = data.errors?.join(", ") || "Erro desconhecido";
                setMessage(`Falha parcial: ${errorDetails.slice(0, 100)}...`);
            }
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                setMessage("Tempo limite esgotado. O servidor demorou muito.");
            } else {
                const message = error instanceof Error ? error.message : String(error);
                setMessage("Erro: " + message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-4">
            <Button
                onClick={handleFix}
                disabled={loading}
                variant="destructive"
                className="gap-2"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                {loading ? "Corrigindo..." : "Corrigir Banco de Dados Automaticamente"}
            </Button>
            {message && (
                <p className="mt-2 text-sm font-medium animate-in fade-in">{message}</p>
            )}
        </div>
    );
}
