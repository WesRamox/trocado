"use client";

import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callBackend } from "@/lib/call-backend";
import { text } from "@/lib/form-data";
import { reloadTo } from "@/lib/navigation";
import { useFormRequest } from "@/lib/use-request";

export function LoginForm() {
  const { error, onSubmit, pending } = useFormRequest(
    // /auth/login é uma rota do Next: guarda o token no cookie httpOnly
    async (form) => {
      await callBackend("/auth/login", {
        method: "POST",
        body: { email: text(form, "email"), password: text(form, "password") },
      });
    },
    { onSuccess: () => reloadTo("/"), refresh: false },
  );

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
