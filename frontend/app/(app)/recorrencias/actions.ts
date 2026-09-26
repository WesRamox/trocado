"use server";

import { refresh } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { AMOUNT_REQUIRED, hasAmount, optionalId, optionalText, text } from "@/lib/form-data";
import type { ActionState } from "@/lib/types";

// Campos que podem mudar depois de criada
function editableBody(form: FormData) {
  return {
    name: text(form, "name"),
    amount: Number(text(form, "amount")),
    description: optionalText(form, "description"),
    endDate: optionalText(form, "endDate"),
    cardId: optionalId(form, "cardId"),
    categoryId: optionalId(form, "categoryId"),
  };
}

export async function createRecurrence(_: ActionState, form: FormData): Promise<ActionState> {
  if (!hasAmount(form)) return AMOUNT_REQUIRED;
  try {
    await api("/recurrences", {
      method: "POST",
      body: {
        ...editableBody(form),
        type: text(form, "type"),
        frequency: text(form, "frequency"),
        interval: Number(text(form, "interval") || 1),
        startDate: text(form, "startDate"),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Recorrência criada" };
}

export async function updateRecurrence(id: number, _: ActionState, form: FormData): Promise<ActionState> {
  if (!hasAmount(form)) return AMOUNT_REQUIRED;
  try {
    await api(`/recurrences/${id}`, { method: "PATCH", body: editableBody(form) });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Recorrência atualizada" };
}

// Encerrar = definir a data de fim; os lançamentos já gerados continuam
export async function endRecurrence(id: number, endDate: string): Promise<ActionState> {
  try {
    await api(`/recurrences/${id}`, { method: "PATCH", body: { endDate } });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Recorrência encerrada" };
}

export async function deleteRecurrence(id: number): Promise<ActionState> {
  try {
    await api(`/recurrences/${id}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Recorrência excluída" };
}
