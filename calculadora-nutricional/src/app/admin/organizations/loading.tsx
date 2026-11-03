import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationsLoading() {
  return <div aria-label="Carregando organizações" className="space-y-4" aria-busy="true"><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>;
}
