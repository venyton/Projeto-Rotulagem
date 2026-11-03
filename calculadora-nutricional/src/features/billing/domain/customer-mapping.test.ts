import assert from "node:assert/strict";
import test from "node:test";

import { CustomerMappingInputError, validateCustomerMappingInput } from "./customer-mapping";

test("normaliza os dados mínimos do customer sem persistir documento", () => {
  const result = validateCustomerMappingInput({
    organizationId: " org_test ",
    actorUserId: "user_test",
    name: "  Empresa   Teste  ",
    cpfCnpj: "04.252.011/0001-10",
    email: " FINANCEIRO@EXAMPLE.TEST ",
    mobilePhone: "(11) 99999-9999",
  });
  assert.deepEqual(result, {
    organizationId: "org_test",
    actorUserId: "user_test",
    name: "Empresa Teste",
    cpfCnpj: "04252011000110",
    email: "financeiro@example.test",
    mobilePhone: "11999999999",
  });
});

test("rejeita documento brasileiro inválido antes de chamar o provider", () => {
  assert.throws(
    () => validateCustomerMappingInput({
      organizationId: "org_test",
      actorUserId: null,
      name: "Cliente Teste",
      cpfCnpj: "111.111.111-11",
    }),
    (error) => error instanceof CustomerMappingInputError && error.code === "DOCUMENT",
  );
});

test("rejeita email e telefone inválidos na fronteira interna", () => {
  assert.throws(
    () => validateCustomerMappingInput({
      organizationId: "org_test",
      actorUserId: null,
      name: "Cliente Teste",
      cpfCnpj: "529.982.247-25",
      email: "invalido",
    }),
    (error) => error instanceof CustomerMappingInputError && error.code === "EMAIL",
  );
  assert.throws(
    () => validateCustomerMappingInput({
      organizationId: "org_test",
      actorUserId: null,
      name: "Cliente Teste",
      cpfCnpj: "529.982.247-25",
      mobilePhone: "123",
    }),
    (error) => error instanceof CustomerMappingInputError && error.code === "PHONE",
  );
});
