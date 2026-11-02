import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_PERMISSIONS } from "@/features/platform-iam/domain/platform-authorization";
import { requirePlatformPagePermission } from "@/features/platform-iam/services/platform-access";
import { getPrivilegedSessionConsole } from "@/features/platform-iam/services/privileged-sessions";

import {
  approvePrivilegedSessionAction,
  requestPrivilegedSessionAction,
  revokePrivilegedSessionAction,
} from "./actions";

function date(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(value);
}

function feedbackValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

function sessionState(value: string) {
  const labels: Record<string, string> = { ACTIVE: "Ativa", PENDING_APPROVAL: "Aguardando aprovação", REVOKED: "Encerrada", EXPIRED: "Expirada" };
  return labels[value] ?? value;
}

function riskLabel(value: string) {
  const labels: Record<string, string> = { HIGH: "Risco alto", CRITICAL: "Risco crítico" };
  return labels[value] ?? value;
}

export default async function PrivilegedSessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [access, feedback] = await Promise.all([
    requirePlatformPagePermission({
      permission: PLATFORM_PERMISSIONS.ACCESS,
      action: "platform.privileged_sessions.viewed",
      targetId: "/admin/security/privileged-sessions",
    }),
    searchParams,
  ]);
  const data = await getPrivilegedSessionConsole({
    userId: access.user!.id,
    permissionKeys: access.permissionKeys,
    canApprove: access.permissionKeys.includes(PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE),
  });
  const error = feedbackValue(feedback.error);
  const success = feedbackValue(feedback.success);

  return (
    <>
      <PageHeader title="Acessos temporários" actions={<Badge variant="outline">Expiram em até 15 minutos</Badge>} />

      {error ? <Alert variant="destructive"><AlertTriangle /><AlertTitle>Operação não concluída</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert><CheckCircle2 /><AlertTitle>Operação concluída</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

      {!access.user?.twoFactorEnabled ? (
        <Alert variant="destructive">
          <KeyRound />
          <AlertTitle>2FA obrigatório</AlertTitle>
            <AlertDescription>Ative o autenticador em <Link className="underline" href="/dashboard/profile">Perfil e segurança</Link>.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck aria-hidden="true" /> Solicitar acesso temporário</CardTitle>
          </CardHeader>
          <CardContent>
            {data.permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma permissão de risco alto disponível para este perfil.</p>
            ) : (
              <form action={requestPrivilegedSessionAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="permission">Ação que precisa executar</Label>
                  <NativeSelect id="permission" name="permission" required defaultValue="" disabled={!access.user?.twoFactorEnabled}>
                    <NativeSelectOption value="" disabled>Selecione uma ação</NativeSelectOption>
                    {data.permissions.map((permission) => (
                      <NativeSelectOption key={permission.key} value={permission.key}>
                        {permission.name} · {riskLabel(permission.riskLevel)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <p className="text-xs text-muted-foreground">Ações críticas aguardam aprovação de outro administrador.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="targetType">Tipo do alvo (ex.: ORGANIZATION)</Label>
                    <Input id="targetType" name="targetType" required placeholder="ORGANIZATION" maxLength={64} disabled={!access.user?.twoFactorEnabled} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetId">ID exato do alvo</Label>
                    <Input id="targetId" name="targetId" required placeholder="Cole o ID do recurso" maxLength={128} disabled={!access.user?.twoFactorEnabled} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Exemplos: ORGANIZATION, PLAN_VERSION, COMMERCIAL_COUPON, PLATFORM_USER.</p>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Resumo da tarefa</Label>
                  <Input id="purpose" name="purpose" required minLength={4} maxLength={120} placeholder="Ex.: corrigir entitlement contratado" disabled={!access.user?.twoFactorEnabled} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="justification">Por que este acesso é necessário?</Label>
                  <Textarea id="justification" name="justification" required minLength={12} maxLength={1000} placeholder="Descreva a necessidade" disabled={!access.user?.twoFactorEnabled} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                  <Label htmlFor="ticketReference">Chamado (opcional)</Label>
                    <Input id="ticketReference" name="ticketReference" maxLength={120} placeholder="SUP-1234" disabled={!access.user?.twoFactorEnabled} />
                  </div>
                  <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Acesso válido por</Label>
                    <NativeSelect id="durationMinutes" name="durationMinutes" defaultValue="15" disabled={!access.user?.twoFactorEnabled}>
                      <NativeSelectOption value="5">5 minutos</NativeSelectOption>
                      <NativeSelectOption value="10">10 minutos</NativeSelectOption>
                      <NativeSelectOption value="15">15 minutos</NativeSelectOption>
                    </NativeSelect>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode">Código 2FA</Label>
                  <Input id="twoFactorCode" name="twoFactorCode" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" disabled={!access.user?.twoFactorEnabled} />
                </div>
                <Button type="submit" disabled={!access.user?.twoFactorEnabled}>Solicitar acesso temporário</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <section className="space-y-3" aria-labelledby="session-history-title">
          <div>
            <h2 id="session-history-title" className="text-lg font-semibold">Pedidos e sessões</h2>
          </div>
          {data.sessions.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum pedido ou acesso temporário registrado.</CardContent></Card>
          ) : data.sessions.map((session) => {
            const own = session.requestedByUserId === access.user!.id;
            const canApprove = session.status === "PENDING_APPROVAL" && !own
              && access.permissionKeys.includes(PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE);
            const canRevoke = own || access.permissionKeys.includes(PLATFORM_PERMISSIONS.SECURITY_OPERATORS_MANAGE);
            return (
              <Card key={session.id} className={session.status === "ACTIVE" ? "border-primary/50" : undefined}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{session.platformPermission.name}</CardTitle>
                      <CardDescription>{session.platformPermission.key}</CardDescription>
                    </div>
                    <Badge variant={session.status === "ACTIVE" ? "secondary" : session.status === "PENDING_APPROVAL" ? "destructive" : "outline"}>{sessionState(session.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{session.purpose}</p>
                  <p className="text-muted-foreground">{session.justification}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Alvo: {session.targetType}: {session.targetId}</Badge>
                    <Badge variant="outline"><Clock3 aria-hidden="true" /> {session.requestedDurationMinutes} min</Badge>
                    <Badge variant="outline">expira {date(session.expiresAt)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Solicitado por {session.requestedByUser.name || session.requestedByUser.email} em {date(session.requestedAt)}{session.ticketReference ? ` · ${session.ticketReference}` : ""}.</p>
                  {session.approvedByUser ? <p className="text-xs text-muted-foreground">Aprovado por {session.approvedByUser.name || session.approvedByUser.email}.</p> : null}
                  {canApprove ? (
                    <form action={approvePrivilegedSessionAction} className="space-y-2 rounded-md border border-destructive/40 p-3">
                      <input type="hidden" name="privilegedSessionId" value={session.id} />
                      <Label htmlFor={`approval-code-${session.id}`}>Seu código 2FA para aprovar</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input id={`approval-code-${session.id}`} name="twoFactorCode" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" />
                      <Button type="submit" variant="destructive">Aprovar acesso temporário</Button>
                      </div>
                    </form>
                  ) : null}
                  {canRevoke && (session.status === "ACTIVE" || session.status === "PENDING_APPROVAL") ? (
                    <form action={revokePrivilegedSessionAction}>
                      <input type="hidden" name="privilegedSessionId" value={session.id} />
                      <Button type="submit" variant="outline">Encerrar acesso agora</Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </div>

      <Alert><ShieldAlert /><AlertTitle>O acesso temporário não abre conteúdo de clientes.</AlertTitle></Alert>
    </>
  );
}
