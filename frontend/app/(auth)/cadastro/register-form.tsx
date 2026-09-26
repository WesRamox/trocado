"use client";

import { useRouter } from "next/navigation";
import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callBackend } from "@/lib/call-backend";
import { text } from "@/lib/form-data";
import { useFormRequest } from "@/lib/use-request";

export function RegisterForm() {
  const router = useRouter();
  const { error, onSubmit, pending } = useFormRequest(
    async (form) => {
      const email = text(form, "email");
      const password = text(form, "password");
      await callBackend("/auth/register", { method: "POST", body: { name: text(form, "name"), email, password } });
      // /auth/login é uma rota do Next: guarda o token no cookie httpOnly
      await callBackend("/auth/login", { method: "POST", body: { email, password } });
    },
    {
      onSuccess: () => router.replace("/"),
      refresh: false,
    },
  );

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required maxLength={100} autoFocus />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
        />
      </Field>
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
