// Leitura de campos de formulário para montar o corpo das requisições

// Valor em reais vindo do CurrencyInput
export const AMOUNT_REQUIRED = { ok: false, message: "Informe um valor maior que zero." } as const;
export const hasAmount = (form: FormData) => Number(text(form, "amount")) > 0;

export const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

// Campo opcional: vazio vira null (a API usa null para limpar o valor)
export const optionalText = (form: FormData, key: string) => text(form, key) || null;

export const optionalNumber = (form: FormData, key: string) => {
  const value = text(form, key);
  return value === "" ? null : Number(value);
};

// Select com a opção "none" (nenhum) -> null
export const optionalId = (form: FormData, key: string) => {
  const value = text(form, key);
  return value === "" || value === "none" ? null : Number(value);
};
