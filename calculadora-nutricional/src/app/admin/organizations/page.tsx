import Link from "next/link";
import { AlertTriangle, Building2, Search } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseOrganizationAdminFilters } from "@/features/platform-iam/domain/customer-administration";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { listOrganizationsForAdministration } from "@/features/platform-iam/services/customer-administration";

const statusLabel = { ACTIVE: "Ativa", SUSPENDED: "Suspensa", ARCHIVED: "Arquivada" } as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
}

function seats(used: number, limit: number | null) {
  return limit === null ? `${used} usados · sem limite` : `${used} de ${limit}`;
}

function billingLabel(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Ativa",
    TRIALING: "Em teste",
    PAST_DUE: "Em atraso",
    UNPAID: "Não paga",
    CANCELED: "Cancelada",
    INCOMPLETE: "Pendente",
    SYNC_ERROR: "Falha de sincronização",
    SEM_ASSINATURA: "Sem assinatura",
  };
  return labels[status] ?? status;
}

export default async function OrganizationsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [, params] = await Promise.all([
    requirePlatformPagePermission({
      permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_READ,
      action: "platform.organizations.list.viewed",
      targetId: "/admin/organizations",
    }),
    searchParams,
  ]);
  const filters = parseOrganizationAdminFilters(params);
  const result = await listOrganizationsForAdministration(filters);
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <>
      <PageHeader title="Organizações" actions={<Badge variant="outline">{result.total} organizações</Badge>} />

      {error ? <Alert variant="destructive"><AlertTriangle /><AlertTitle>Consulta não concluída</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      <Card>
        <CardHeader><CardTitle>Filtrar organizações</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2 xl:col-span-2"><Label htmlFor="organization-q">Nome, razão social, e-mail ou 4 dígitos do documento</Label><Input id="organization-q" name="q" defaultValue={filters.query} maxLength={100} placeholder="Digite para localizar" /></div>
            <div className="space-y-2"><Label htmlFor="organization-status">Status</Label><select id="organization-status" name="status" defaultValue={filters.status ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Todos</option><option value="ACTIVE">Ativa</option><option value="SUSPENDED">Suspensa</option><option value="ARCHIVED">Arquivada</option></select></div>
            <div className="space-y-2"><Label htmlFor="organization-billing">Assinatura</Label><select id="organization-billing" name="billing" defaultValue={filters.billing ?? ""} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Todas</option><option value="ACTIVE">Ativa</option><option value="TRIALING">Em teste</option><option value="PAST_DUE">Em atraso</option><option value="UNPAID">Não paga</option><option value="CANCELED">Cancelada</option></select></div>
            <div className="flex items-end"><Button type="submit" className="w-full"><Search />Filtrar</Button></div>
          </form>
        </CardContent>
      </Card>

      {result.rows.length === 0 ? (
        <Empty><EmptyHeader><EmptyMedia variant="icon"><Building2 /></EmptyMedia><EmptyTitle>Nenhuma organização encontrada</EmptyTitle><EmptyDescription>Altere ou remova os filtros para ampliar a busca.</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <Card>
          <CardHeader><CardTitle>Resultados</CardTitle><CardDescription>Página {result.page} de {result.pages}</CardDescription></CardHeader>
          <CardContent>
            <div className="hidden overflow-x-auto lg:block">
              <Table><TableHeader><TableRow><TableHead>Organização</TableHead><TableHead>Plano / assinatura</TableHead><TableHead>Vagas</TableHead><TableHead>Atividade</TableHead><TableHead>Alertas</TableHead><TableHead><span className="sr-only">Ação</span></TableHead></TableRow></TableHeader>
                <TableBody>{result.rows.map((row) => <TableRow key={row.id}>
                  <TableCell><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.ownerEmail} · {row.document}</div><Badge variant="outline" className="mt-2">{statusLabel[row.status]}</Badge></TableCell>
                  <TableCell><div>{row.plan}</div><div className="text-xs text-muted-foreground">{billingLabel(row.billingStatus)}</div></TableCell>
                  <TableCell>{seats(row.seatsUsed, row.seatLimit)}</TableCell><TableCell>{formatDate(row.lastActivityAt)}</TableCell>
                  <TableCell>{row.riskFlags.length ? <div className="flex flex-wrap gap-1">{row.riskFlags.map((flag) => <Badge key={flag} variant="destructive">{flag}</Badge>)}</div> : <Badge variant="secondary">Sem alerta</Badge>}</TableCell>
                  <TableCell><Button asChild variant="outline" size="sm"><Link href={`/admin/organizations/${row.id}`}>Ver organização</Link></Button></TableCell>
                </TableRow>)}</TableBody></Table>
            </div>
            <div className="grid gap-3 lg:hidden">{result.rows.map((row) => <Card key={row.id}><CardHeader><div className="flex items-start justify-between gap-2"><div><CardTitle className="text-base">{row.name}</CardTitle><CardDescription>{row.ownerEmail}</CardDescription></div><Badge variant="outline">{statusLabel[row.status]}</Badge></div></CardHeader><CardContent className="space-y-3 text-sm"><p>{row.document}</p><p><span className="text-muted-foreground">Plano e assinatura:</span> {row.plan} · {billingLabel(row.billingStatus)}</p><p><span className="text-muted-foreground">Vagas:</span> {seats(row.seatsUsed, row.seatLimit)}</p>{row.riskFlags.length ? <div className="flex flex-wrap gap-1">{row.riskFlags.map((flag) => <Badge key={flag} variant="destructive">{flag}</Badge>)}</div> : <Badge variant="secondary">Sem alerta</Badge>}<Button asChild variant="outline" className="w-full"><Link href={`/admin/organizations/${row.id}`}>Ver organização</Link></Button></CardContent></Card>)}</div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button asChild variant="outline" disabled={result.page <= 1}><Link aria-disabled={result.page <= 1} href={{ pathname: "/admin/organizations", query: { ...Object.fromEntries(Object.entries(params).filter(([, v]) => typeof v === "string")), page: Math.max(1, result.page - 1) } }}>Anterior</Link></Button>
              <span className="text-sm text-muted-foreground">Página {result.page} de {result.pages} · {result.total} organizações</span>
              <Button asChild variant="outline" disabled={result.page >= result.pages}><Link aria-disabled={result.page >= result.pages} href={{ pathname: "/admin/organizations", query: { ...Object.fromEntries(Object.entries(params).filter(([, v]) => typeof v === "string")), page: Math.min(result.pages, result.page + 1) } }}>Próxima</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
