"use server";

import { refresh } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { AMOUNT_REQUIRED, hasAmount, optionalId, optionalText, text } from "@/lib/form-data";
import type { ActionState } from "@/lib/types";

function transactionBody(form: FormData) {
  return {
    type: text(form, "type"),
    name: text(form, "name"),
    amount: Number(text(form, "amount")),
    date: text(form, "date"),
    description: optionalText(form, "description"),
    cardId: optionalId(form, "cardId"),
    categoryId: optionalId(form, "categoryId"),
  };
}

export async function createTransaction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!hasAmount(form)) return AMOUNT_REQUIRED;
  const installments = Number(text(form, "installments") || 1);
  try {
    await api("/transactions", {
      method: "POST",
      body: { ...transactionBody(form), ...(installments > 1 && { installments }) },
    });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return {
    ok: true,
    message: installments > 1 ? `Lançamento criado em ${installments} parcelas` : "Lançamento criado",
  };
}

export async function updateTransaction(
  id: number,
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!hasAmount(form)) return AMOUNT_REQUIRED;
  try {
    await api(`/transactions/${id}`, { method: "PATCH", body: transactionBody(form) });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Lançamento atualizado" };
}

export async function deleteTransaction(id: number, allInstallments: boolean): Promise<ActionState> {
  try {
    await api(`/transactions/${id}?allInstallments=${allInstallments}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: allInstallments ? "Parcelas excluídas" : "Lançamento excluído" };
}
