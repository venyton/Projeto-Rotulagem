import { Skeleton } from "@/components/ui/skeleton";

export default function BillingOperationsLoading() {
  return <div aria-label="Carregando operações de billing" aria-busy="true" className="space-y-4"><Skeleton className="h-20 w-full" /><div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
}
