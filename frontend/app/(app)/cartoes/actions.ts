"use server";

import { refresh } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { optionalNumber, text } from "@/lib/form-data";
import type { ActionState } from "@/lib/types";

function cardBody(form: FormData) {
  return {
    name: text(form, "name"),
    type: text(form, "type"),
    lastFourDigits: text(form, "lastFourDigits"),
    closingDay: optionalNumber(form, "closingDay"),
    dueDay: optionalNumber(form, "dueDay"),
    creditLimit: optionalNumber(form, "creditLimit"),
  };
}

export async function createCard(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api("/cards", { method: "POST", body: cardBody(form) });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Cartão adicionado" };
}

export async function updateCard(id: number, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api(`/cards/${id}`, { method: "PATCH", body: cardBody(form) });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Cartão atualizado" };
}

export async function deleteCard(id: number): Promise<ActionState> {
  try {
    await api(`/cards/${id}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  return { ok: true, message: "Cartão excluído" };
}
