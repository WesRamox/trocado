"use server";

import { refresh } from "next/cache";
import { api, ApiError } from "@/lib/api";
import { optionalText, text } from "@/lib/form-data";
import type { ActionState } from "@/lib/types";

export async function createCategory(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api("/categories", {
      method: "POST",
      body: { name: text(form, "name"), type: text(form, "type"), color: optionalText(form, "color") },
    });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Categoria criada" };
}

// O tipo da categoria não muda depois de criada
export async function updateCategory(id: number, _: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api(`/categories/${id}`, {
      method: "PATCH",
      body: { name: text(form, "name"), color: optionalText(form, "color") },
    });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Categoria atualizada" };
}

export async function deleteCategory(id: number): Promise<ActionState> {
  try {
    await api(`/categories/${id}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Categoria excluída" };
}
