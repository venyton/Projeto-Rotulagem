import { Skeleton } from "@/components/ui/skeleton";
export default function GrantsLoading() { return <div aria-busy="true" aria-label="Carregando grants" className="space-y-4"><Skeleton className="h-20" /><div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-[40rem]" /><Skeleton className="h-[40rem]" /></div></div>; }
