"use client";

import { useFormStatus } from "react-dom";
import { ExternalLink, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BillingSubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} aria-disabled={disabled || pending}>
      {pending ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <ExternalLink data-icon="inline-start" />}
      {pending ? "Preparando checkout" : "Abrir checkout seguro"}
    </Button>
  );
}
