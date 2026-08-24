import { isValidCnpj, isValidCpf } from "./brazilian-documents";

export type OrganizationIdentityKind = "INDIVIDUAL" | "COMPANY";

export type OrganizationIdentityError =
    | "invalid"
    | "individual_identity"
    | "cpf"
    | "company_identity"
    | "cnpj";

type OrganizationIdentityDraft = {
    kind: unknown;
    personName: unknown;
    cpf: unknown;
    legalName: unknown;
    tradeName: unknown;
    cnpj: unknown;
};

type ExistingIdentity = {
    hasCpf: boolean;
    hasCnpj: boolean;
};

export type ValidOrganizationIdentity = {
    kind: OrganizationIdentityKind;
    personName: string;
    cpf: string;
    legalName: string;
    tradeName: string;
    cnpj: string;
};

export function validateOrganizationIdentity(
    draft: OrganizationIdentityDraft,
    existing: ExistingIdentity = { hasCpf: false, hasCnpj: false },
): { success: true; data: ValidOrganizationIdentity } | { success: false; error: OrganizationIdentityError } {
    if (draft.kind !== "INDIVIDUAL" && draft.kind !== "COMPANY") {
        return { success: false, error: "invalid" };
    }

    const personName = typeof draft.personName === "string" ? draft.personName.trim() : "";
    const cpf = typeof draft.cpf === "string" ? draft.cpf.trim() : "";
    const legalName = typeof draft.legalName === "string" ? draft.legalName.trim() : "";
    const tradeName = typeof draft.tradeName === "string" ? draft.tradeName.trim() : "";
    const cnpj = typeof draft.cnpj === "string" ? draft.cnpj.trim() : "";

    if (draft.kind === "INDIVIDUAL") {
        if (personName.length < 2 || personName.length > 120 || (!cpf && !existing.hasCpf)) {
            return { success: false, error: "individual_identity" };
        }
        if (cpf && !isValidCpf(cpf)) return { success: false, error: "cpf" };

        return {
            success: true,
            data: { kind: "INDIVIDUAL", personName, cpf, legalName: "", tradeName: "", cnpj: "" },
        };
    }

    if (legalName.length < 2 || legalName.length > 120 || tradeName.length > 120 || (!cnpj && !existing.hasCnpj)) {
        return { success: false, error: "company_identity" };
    }
    if (cnpj && !isValidCnpj(cnpj)) return { success: false, error: "cnpj" };

    return {
        success: true,
        data: { kind: "COMPANY", personName: "", cpf: "", legalName, tradeName, cnpj },
    };
}
