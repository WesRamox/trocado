"use client";

import { Field, FormError } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/lib/use-form-action";
import { register } from "../actions";

export function RegisterForm() {
  const { error, onSubmit, pending } = useFormAction(register);

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
