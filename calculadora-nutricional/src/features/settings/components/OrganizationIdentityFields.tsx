"use client";

import { useState } from "react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type OrganizationIdentityKind = "INDIVIDUAL" | "COMPANY";

type OrganizationIdentityFieldsProps = {
    idPrefix: string;
    initialKind: OrganizationIdentityKind;
    personName?: string | null;
    cpfLastFour?: string | null;
    legalName?: string | null;
    tradeName?: string | null;
    cnpjLastFour?: string | null;
    lockCompanyKind?: boolean;
};

export function OrganizationIdentityFields({
    idPrefix,
    initialKind,
    personName,
    cpfLastFour,
    legalName,
    tradeName,
    cnpjLastFour,
    lockCompanyKind = false,
}: OrganizationIdentityFieldsProps) {
    const [kind, setKind] = useState<OrganizationIdentityKind>(initialKind);

    return (
        <>
            <Field>
                <FieldLabel htmlFor={`${idPrefix}-kind`}>Cadastro</FieldLabel>
                <NativeSelect
                    id={`${idPrefix}-kind`}
                    name="kind"
                    value={kind}
                    onChange={(event) => setKind(event.target.value as OrganizationIdentityKind)}
                >
                    <NativeSelectOption value="INDIVIDUAL" disabled={lockCompanyKind}>Pessoa física (CPF)</NativeSelectOption>
                    <NativeSelectOption value="COMPANY">Pessoa jurídica (CNPJ)</NativeSelectOption>
                </NativeSelect>
            </Field>

            {kind === "INDIVIDUAL" ? (
                <>
                    <Field className="lg:col-span-2">
                        <FieldLabel htmlFor={`${idPrefix}-person-name`}>Nome completo</FieldLabel>
                        <Input
                            id={`${idPrefix}-person-name`}
                            name="personName"
                            required
                            minLength={2}
                            maxLength={120}
                            autoComplete="name"
                            defaultValue={personName || ""}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor={`${idPrefix}-cpf`}>CPF</FieldLabel>
                        <Input
                            id={`${idPrefix}-cpf`}
                            name="cpf"
                            inputMode="numeric"
                            required={!cpfLastFour}
                            maxLength={14}
                            pattern="(?:[0-9]{11}|[0-9]{3}[.][0-9]{3}[.][0-9]{3}-[0-9]{2})"
                            placeholder={cpfLastFour ? `CPF cadastrado ••••${cpfLastFour}` : "000.000.000-00"}
                        />
                        <FieldDescription>
                            {cpfLastFour ? "Deixe vazio para manter o CPF cadastrado." : "Obrigatório para pessoa física."}
                        </FieldDescription>
                    </Field>
                </>
            ) : (
                <>
                    <Field>
                        <FieldLabel htmlFor={`${idPrefix}-legal-name`}>Razão social</FieldLabel>
                        <Input
                            id={`${idPrefix}-legal-name`}
                            name="legalName"
                            required
                            minLength={2}
                            maxLength={120}
                            autoComplete="organization"
                            defaultValue={legalName || ""}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor={`${idPrefix}-trade-name`}>Nome fantasia</FieldLabel>
                        <Input
                            id={`${idPrefix}-trade-name`}
                            name="tradeName"
                            maxLength={120}
                            autoComplete="organization"
                            defaultValue={tradeName || ""}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor={`${idPrefix}-cnpj`}>CNPJ</FieldLabel>
                        <Input
                            id={`${idPrefix}-cnpj`}
                            name="cnpj"
                            inputMode="numeric"
                            required={!cnpjLastFour}
                            maxLength={18}
                            pattern="(?:[0-9]{14}|[0-9]{2}[.][0-9]{3}[.][0-9]{3}/[0-9]{4}-[0-9]{2})"
                            placeholder={cnpjLastFour ? `CNPJ cadastrado ••••${cnpjLastFour}` : "00.000.000/0000-00"}
                        />
                        <FieldDescription>
                            {cnpjLastFour ? "Deixe vazio para manter o CNPJ cadastrado." : "Obrigatório para pessoa jurídica."}
                        </FieldDescription>
                    </Field>
                </>
            )}
        </>
    );
}
