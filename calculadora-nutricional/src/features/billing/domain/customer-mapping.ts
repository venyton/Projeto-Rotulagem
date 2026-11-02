import {
  isValidCnpj,
  isValidCpf,
  normalizeBrazilianDocument,
} from "../../organizations/domain/brazilian-documents";
import { parseEmail } from "../../../lib/validation/contacts";

export type CustomerMappingInput = {
  organizationId: string;
  actorUserId: string | null;
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
};

export type ValidatedCustomerMappingInput = {
  organizationId: string;
  actorUserId: string | null;
  name: string;
  cpfCnpj: string;
  email?: string;
  mobilePhone?: string;
};

export class CustomerMappingInputError extends Error {
  constructor(public code: "ORGANIZATION" | "NAME" | "DOCUMENT" | "EMAIL" | "PHONE") {
    super(`Dados inválidos para customer mapping: ${code}.`);
    this.name = "CustomerMappingInputError";
  }
}

export function validateCustomerMappingInput(input: CustomerMappingInput): ValidatedCustomerMappingInput {
  const organizationId = input.organizationId.trim();
  if (!organizationId || organizationId.length > 191) throw new CustomerMappingInputError("ORGANIZATION");

  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 200) throw new CustomerMappingInputError("NAME");

  const cpfCnpj = normalizeBrazilianDocument(input.cpfCnpj);
  if (!cpfCnpj || (!isValidCpf(cpfCnpj) && !isValidCnpj(cpfCnpj))) {
    throw new CustomerMappingInputError("DOCUMENT");
  }

  const email = input.email ? parseEmail(input.email) : null;
  if (input.email && !email) throw new CustomerMappingInputError("EMAIL");

  const mobilePhone = input.mobilePhone?.replace(/\D/g, "") || undefined;
  if (mobilePhone && (mobilePhone.length < 10 || mobilePhone.length > 11)) {
    throw new CustomerMappingInputError("PHONE");
  }

  return {
    organizationId,
    actorUserId: input.actorUserId,
    name,
    cpfCnpj,
    ...(email ? { email } : {}),
    ...(mobilePhone ? { mobilePhone } : {}),
  };
}
