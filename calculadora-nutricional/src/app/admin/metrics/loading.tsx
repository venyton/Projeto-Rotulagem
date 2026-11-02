import { Skeleton } from "@/components/ui/skeleton";

export default function MetricsLoading() {
  return <div className="space-y-4" aria-busy="true" aria-label="Carregando métricas"><Skeleton className="h-10 w-72" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36" />)}</div><Skeleton className="h-96 w-full" /></div>;
}
