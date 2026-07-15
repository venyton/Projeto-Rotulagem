'use client'

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { MODULE_CATALOG, type SaaSModuleKey } from "@/features/saas/domain/modules";

type ModuleGrant = {
  moduleKey: SaaSModuleKey;
  enabled: boolean;
};

type Member = {
  id: string;
  role: string;
  active: boolean;
  user: {
    name: string | null;
    email: string;
  };
  moduleGrants: ModuleGrant[];
};

type Payload = {
  members: Member[];
  organization: {
    entitlements: Array<{ moduleKey: SaaSModuleKey; enabled: boolean }>;
  };
};

export function ParticipantModuleManager() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/saas/participants/modules", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (response.ok) setPayload(data as Payload);
  }

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const response = await fetch("/api/saas/participants/modules", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (active && response.ok) setPayload(data as Payload);
    }

    void loadInitial();
    return () => {
      active = false;
    };
  }, []);

  const enabledOrganizationModules = useMemo(() => {
    return new Set(payload?.organization.entitlements.filter((item) => item.enabled).map((item) => item.moduleKey) || []);
  }, [payload]);

  async function toggle(memberId: string, moduleKey: SaaSModuleKey, enabled: boolean) {
    const key = `${memberId}:${moduleKey}`;
    setSavingKey(key);
    const response = await fetch("/api/saas/participants/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationMemberId: memberId, moduleKey, enabled }),
    });
    const data = await response.json().catch(() => null) as { error?: string } | null;
    setSavingKey(null);

    if (!response.ok) {
      toast.error(data?.error || "Não foi possível atualizar o módulo.");
      return;
    }

    await load();
  }

  if (!payload) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Participantes</CardTitle>
          <CardDescription>Carregando módulos.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {payload.members.map((member) => {
        const memberGrants = new Map(member.moduleGrants.map((grant) => [grant.moduleKey, grant.enabled]));
        return (
          <Card key={member.id} className="overflow-hidden">
            <CardHeader>
              <CardTitle>{member.user.name || member.user.email}</CardTitle>
              <CardDescription>{member.user.email} - {member.role}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {MODULE_CATALOG.map((module) => {
                const organizationHasModule = enabledOrganizationModules.has(module.key);
                const enabled = member.role === "OWNER" || member.role === "ADMIN"
                  ? organizationHasModule
                  : Boolean(memberGrants.get(module.key));
                const key = `${member.id}:${module.key}`;

                return (
                  <FieldLabel
                    key={module.key}
                    className="rounded-md border p-3 transition-colors hover:border-primary/35 hover:bg-accent/55"
                  >
                    <Field orientation="horizontal">
                    <Checkbox
                      checked={enabled}
                      disabled={!organizationHasModule || member.role === "OWNER" || savingKey === key}
                      onCheckedChange={(checked) => toggle(member.id, module.key, checked === true)}
                    />
                    <span>
                      <span className="block font-medium">{module.name}</span>
                      <span className="block text-muted-foreground">{organizationHasModule ? module.description : "Fora do plano atual."}</span>
                    </span>
                    </Field>
                  </FieldLabel>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
