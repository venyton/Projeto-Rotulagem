import { Skeleton } from "@/components/ui/skeleton";

export default function PrivilegedSessionsLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando sessões privilegiadas">
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[34rem]" />
        <Skeleton className="h-[34rem]" />
      </div>
    </div>
  );
}
