import { ApiError } from "./call-backend";

// Leitura de campos de formulário para montar o corpo das requisições

// Valor em reais vindo do CurrencyInput; sem valor, a requisição nem é feita
export function requireAmount(form: FormData): number {
  const amount = Number(text(form, "amount"));
  if (!(amount > 0)) throw new ApiError(400, "Informe um valor maior que zero.");
  return amount;
}

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
