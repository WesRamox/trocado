"use client";

import { startTransition, useActionState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import type { ActionState } from "./types";

// Liga um formulário a uma server action.
// Envia via onSubmit (e não via <form action>) porque o React limpa os campos após cada
// envio por action: um erro da API apagaria tudo o que a pessoa digitou.
export function useFormAction(
  action: (state: ActionState, form: FormData) => Promise<ActionState>,
  onSuccess?: () => void,
) {
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message);
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só a um novo resultado
  }, [state]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => formAction(form));
  };

  return { error: state?.ok === false ? state.message : undefined, onSubmit, pending };
}
