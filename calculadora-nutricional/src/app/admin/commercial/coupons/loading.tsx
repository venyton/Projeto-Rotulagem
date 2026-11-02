import { Skeleton } from "@/components/ui/skeleton";
export default function CouponsLoading() { return <div aria-busy="true" aria-label="Carregando cupons" className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-96" /><Skeleton className="h-64" /></div>; }
