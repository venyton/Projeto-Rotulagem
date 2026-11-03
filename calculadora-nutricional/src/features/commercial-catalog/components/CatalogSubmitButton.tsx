"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function CatalogSubmitButton({
  children,
  pendingLabel,
  variant = "default",
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const unavailable = pending || disabled;

  return (
    <Button type="submit" disabled={unavailable} aria-disabled={unavailable} variant={variant}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
