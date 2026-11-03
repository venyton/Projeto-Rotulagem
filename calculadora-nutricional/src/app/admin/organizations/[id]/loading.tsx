import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationDetailLoading() {
  return <div aria-label="Carregando detalhe da organização" aria-busy="true" className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-full" /><div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div><Skeleton className="h-96 w-full" /></div>;
}
