import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CardDialog } from "@/components/cards/card-dialog";
import { CardVisual } from "@/components/cards/card-visual";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { callBackend } from "@/lib/call-backend";
import type { Card } from "@/lib/types";

export const metadata: Metadata = { title: "Cartões" };

export default async function CardsPage() {
  const cards = await callBackend<Card[]>("/cards");
  const newButton = (
    <CardDialog
      trigger={
        <Button>
          <Plus /> Novo cartão
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Cartões"
        description="Abra um cartão de crédito para ver as faturas."
        actions={newButton}
      />
      {cards.length === 0 ? (
        <EmptyState
          title="Nenhum cartão cadastrado"
          description="Adicione seus cartões para saber em qual fatura cada compra vai cair."
          action={newButton}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/cartoes/${card.id}`}
                className="block rounded-2xl outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <CardVisual card={card} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
