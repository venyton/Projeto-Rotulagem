import { AlertCircle, CheckCircle2, ShieldAlert, ShieldX, UsersRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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

import { createOperatorAssignmentAction, revokeOperatorAssignmentAction } from "./actions";

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value)
    : "Sem expiração";
}

function assignmentState(value: string) {
  const labels: Record<string, string> = { ACTIVE: "Ativo", SUSPENDED: "Suspenso", REVOKED: "Revogado" };
  return labels[value] ?? value;
}

export default async function PlatformOperatorsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [access, feedback] = await Promise.all([requirePlatformPagePermission({
    permission: PLATFORM_PERMISSIONS.SECURITY_OPERATORS_READ,
    action: "platform.security.operators.viewed",
    targetId: "/admin/security/operators",
  }), searchParams]);
  const canManage = access.permissionKeys.includes(PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE);
  const error = typeof feedback.error === "string" ? feedback.error : null;
  const success = typeof feedback.success === "string" ? feedback.success : null;

  const [assignments, roles, users] = await Promise.all([prisma.platformAdminAssignment.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, twoFactorEnabled: true } },
      platformRole: { select: { name: true, key: true } },
    },
  }), prisma.platformRole.findMany({ orderBy: { name: "asc" }, select: { id: true, key: true, name: true } }), prisma.user.findMany({
    where: { twoFactorEnabled: true },
    orderBy: { email: "asc" },
    take: 100,
    select: { id: true, email: true, name: true },
  })]);

  return (
    <>
      <PageHeader title="Administradores da plataforma" actions={<Badge variant="outline">{assignments.length} perfis</Badge>} />

      {error ? <Alert variant="destructive"><AlertCircle /><AlertTitle>Operação não concluída</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert><CheckCircle2 /><AlertTitle>Operação concluída</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Conceder acesso administrativo</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOperatorAssignmentAction} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,.6fr)_auto] lg:items-end">
              <div className="space-y-2"><Label htmlFor="operator-user">Pessoa (2FA ativo)</Label><NativeSelect id="operator-user" name="userId" required defaultValue=""><NativeSelectOption value="" disabled>Selecione uma pessoa</NativeSelectOption>{users.map((user) => <NativeSelectOption key={user.id} value={user.id}>{user.name || user.email} · {user.email} · ID {user.id}</NativeSelectOption>)}</NativeSelect></div>
              <div className="space-y-2"><Label htmlFor="operator-role">Perfil de acesso</Label><NativeSelect id="operator-role" name="platformRoleKey" required defaultValue=""><NativeSelectOption value="" disabled>Selecione um perfil</NativeSelectOption>{roles.map((role) => <NativeSelectOption key={role.id} value={role.key}>{role.name}</NativeSelectOption>)}</NativeSelect></div>
              <div className="space-y-2"><Label htmlFor="operator-expiry">Expiração (vazio = sem prazo)</Label><Input id="operator-expiry" name="expiresAt" type="datetime-local" /></div>
              <Button type="submit">Conceder perfil</Button>
            </form>
            <Alert className="mt-4"><ShieldAlert /><AlertTitle>Exige acesso temporário e aprovação por outra pessoa. O último responsável global não pode ser removido.</AlertTitle><AlertDescription>Abra o acesso temporário para a mesma pessoa selecionada acima.</AlertDescription></Alert>
          </CardContent>
        </Card>
      ) : null}

      {assignments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldX aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>Nenhum perfil de acesso cadastrado</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Perfis concedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operador</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>2FA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Válido até</TableHead>
                    {canManage ? <TableHead>Ação</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <span className="flex flex-col">
                          <span className="font-medium">{assignment.user.name || "Sem nome"}</span>
                          <span className="text-muted-foreground">{assignment.user.email}</span>
                        </span>
                      </TableCell>
                      <TableCell>{assignment.platformRole.name}</TableCell>
                      <TableCell>{assignment.user.twoFactorEnabled ? "Ativo" : "Inativo"}</TableCell>
                      <TableCell><Badge variant="outline">{assignmentState(assignment.status)}</Badge></TableCell>
                      <TableCell>{formatDate(assignment.expiresAt)}</TableCell>
                      {canManage ? <TableCell>{assignment.status !== "REVOKED" ? <form action={revokeOperatorAssignmentAction}><input type="hidden" name="assignmentId" value={assignment.id} /><Button type="submit" size="sm" variant="outline">Remover acesso</Button></form> : "—"}</TableCell> : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <UsersRound aria-hidden="true" />
                    <CardTitle>{assignment.user.name || assignment.user.email}</CardTitle>
                    <CardDescription>{assignment.platformRole.name} · {assignment.user.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="outline">{assignmentState(assignment.status)}</Badge>
                    <Badge variant="secondary">2FA {assignment.user.twoFactorEnabled ? "ativo" : "inativo"}</Badge>
                    <span className="text-muted-foreground">Expiração: {formatDate(assignment.expiresAt)}</span>
                    {canManage && assignment.status !== "REVOKED" ? <form action={revokeOperatorAssignmentAction} className="w-full"><input type="hidden" name="assignmentId" value={assignment.id} /><Button type="submit" size="sm" variant="outline">Remover acesso</Button></form> : null}
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
