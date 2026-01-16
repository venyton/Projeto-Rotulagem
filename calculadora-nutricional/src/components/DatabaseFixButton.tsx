'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wrench } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DatabaseFixButton() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    const handleFix = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/debug/force-migrate');
            const data = await res.json();

            if (data.success) {
                setMessage("Banco de dados corrigido! Recarregando...");
                setTimeout(() => {
                    router.refresh();
                }, 2000);
            } else {
                setMessage("Erro ao corrigir. Tente novamente ou contate o suporte.");
            }
        } catch (error) {
            console.error(error);
            setMessage("Erro na conexão.");
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
                <p className="mt-2 text-sm font-medium">{message}</p>
            )}
        </div>
    );
}
