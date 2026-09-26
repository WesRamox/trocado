import type { Card } from '../generated/prisma/client.js';
import { toReais } from '../common/money.js';

export function toCardResponse({ userId: _userId, creditLimitInCents, ...card }: Card) {
  return {
    ...card,
    creditLimit: creditLimitInCents === null ? null : toReais(creditLimitInCents),
  };
}
