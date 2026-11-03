"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { decimalText, shiftDecimalInput } from "@/features/tables/domain/decimal-display";

type Props = {
  value: number;
  exactValue?: string;
  ingredientName: string;
  onChange: (value: number, exactValue: string) => void;
};

/** Keep the user's decimal separator and trailing zeroes while editing. */
export function IngredientQuantityInput({ value, exactValue, ingredientName, onChange }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [unit, setUnit] = useState<"g" | "mg" | "µg">("g");
  const places = unit === "g" ? 0 : unit === "mg" ? 3 : 6;
  const displayValue = value > 0 ? shiftDecimalInput(exactValue ?? decimalText(value), places) ?? "" : "";
  const canonicalDraft = draft === null ? null : shiftDecimalInput(draft, -places);
  const invalid = draft !== null && (canonicalDraft === null || canonicalDraft.length > 90 || (canonicalDraft.split(".")[1]?.length ?? 0) > 80 || !Number.isFinite(Number(canonicalDraft)) || (Number(canonicalDraft) === 0 && /[1-9]/.test(canonicalDraft)));

  return (
    <div className="flex flex-col gap-1">
    <div className="flex gap-1">
    <Input
      type="text"
      inputMode="decimal"
      aria-label={`Quantidade de ${ingredientName} em ${unit}`}
      aria-invalid={invalid}
      placeholder="Qtd"
      value={draft ?? displayValue}
      onFocus={() => setDraft((current) => current ?? displayValue)}
      onBlur={() => { if (!invalid) setDraft(null); }}
      onChange={(event) => {
        const next = event.target.value;
        if (!/^\d*[.,]?\d*$/.test(next) || next.length > 350) return;
        const converted = shiftDecimalInput(next, -places);
        setDraft(next);
        const valid = converted !== null && converted.length <= 90 && (converted.split(".")[1]?.length ?? 0) <= 80 && Number.isFinite(Number(converted)) && !(Number(converted) === 0 && /[1-9]/.test(converted));
        onChange(valid ? Number(converted) : 0, valid ? converted : "0");
      }}
      className="h-8"
    />
    <NativeSelect aria-label={`Unidade da quantidade de ${ingredientName}`} value={unit} disabled={invalid} onChange={(event) => {
      const nextUnit = event.target.value;
      if (nextUnit !== "g" && nextUnit !== "mg" && nextUnit !== "µg") return;
      setUnit(nextUnit);
      setDraft(null);
    }}>
      <NativeSelectOption value="g">g</NativeSelectOption>
      <NativeSelectOption value="mg">mg</NativeSelectOption>
      <NativeSelectOption value="µg">µg</NativeSelectOption>
    </NativeSelect>
    </div>
    {invalid ? <span role="alert" className="text-xs text-destructive">Valor não representável. Reduza os algarismos.</span> : null}
    </div>
  );
}
