import { ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(value);
}

function resultLabel(value: string) {
  const labels: Record<string, string> = { SUCCESS: "Permitido", DENIED: "Negado", ERROR: "Falhou" };
  return labels[value] ?? value;
}

export default async function PlatformAuditPage() {
  await requirePlatformPagePermission({
    permission: PLATFORM_PERMISSIONS.AUDIT_READ,
    action: "platform.audit.viewed",
    targetId: "/admin/audit",
  });

  const events = await prisma.securityAuditLog.findMany({
    where: { permission: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      permission: true,
      actorRole: true,
      result: true,
      targetType: true,
      targetId: true,
      correlationId: true,
      privilegedSessionId: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  return (
    <>
      <PageHeader title="Auditoria da plataforma" actions={<Badge variant="outline">50 mais recentes · dados sanitizados</Badge>} />

      {events.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ClipboardList aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>Nenhum evento administrativo</EmptyTitle>
            <EmptyDescription>Nenhum acesso administrativo registrado.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Eventos recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ator</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Alvo</TableHead>
                    <TableHead>Acesso temporário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{formatDate(event.createdAt)}</TableCell>
                      <TableCell>{event.user?.email || "Sistema"}</TableCell>
                      <TableCell>{event.action}</TableCell>
                      <TableCell>{event.permission}</TableCell>
                      <TableCell><Badge variant="outline">{resultLabel(event.result)}</Badge></TableCell>
                      <TableCell>{event.targetId || event.targetType || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{event.privilegedSessionId || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 lg:hidden">
              {events.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <CardTitle>{event.action}</CardTitle>
                    <CardDescription>{formatDate(event.createdAt)} · {event.user?.email || "Sistema"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{resultLabel(event.result)}</Badge>
                      {event.actorRole ? <Badge variant="secondary">{event.actorRole}</Badge> : null}
                    </div>
                    <p><span className="text-muted-foreground">Permissão:</span> {event.permission}</p>
                    <p><span className="text-muted-foreground">Alvo:</span> {event.targetId || event.targetType || "—"}</p>
                    <p className="truncate text-muted-foreground">Correlação: {event.correlationId || "—"}</p>
                    <p className="truncate text-muted-foreground">Acesso temporário: {event.privilegedSessionId || "—"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
