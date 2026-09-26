"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "./call-backend";

// Uma operação de escrita: faz as requisições e devolve a mensagem de sucesso (se houver).
// Erros da API (ApiError) viram mensagem para a pessoa; outros erros sobem normalmente.
type Operation = () => Promise<string | void>;

interface Options {
  onSuccess?: () => void;
  // Recarrega os dados das páginas (server components) depois do sucesso. Padrão: true
  refresh?: boolean;
}

function useOperation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (operation: Operation, { onSuccess, refresh = true }: Options, onError: (message: string) => void) =>
    startTransition(async () => {
      try {
        const message = await operation();
        if (message) toast.success(message);
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        onError(error.message);
        return;
      }
      onSuccess?.();
      if (refresh) router.refresh();
    });

  return { run, pending };
}

// Ações avulsas (excluir, encerrar...): erros aparecem em um toast
export function useRequest() {
  const { run, pending } = useOperation();
  return {
    pending,
    run: (operation: Operation, options: Options = {}) => run(operation, options, (message) => toast.error(message)),
  };
}

// Liga um formulário a uma operação; o erro fica visível no próprio formulário.
// Os campos não são limpos em caso de erro, para a pessoa corrigir e reenviar.
export function useFormRequest(submit: (form: FormData) => Promise<string | void>, options: Options = {}) {
  const { run, pending } = useOperation();
  const [error, setError] = useState<string>();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(undefined);
    run(() => submit(form), options, setError);
  };

  return { error, onSubmit, pending };
}
