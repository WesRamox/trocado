import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { TransactionsService } from './transactions.service.js';

@Controller('cards/:cardId/limit')
export class CreditLimitController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // GET /cards/1/limit -> limite total, em uso (tudo que ainda não foi pago) e disponível
  @Get()
  findOne(@CurrentUser() user: JwtPayload, @Param('cardId', ParseIntPipe) cardId: number) {
    return this.transactionsService.creditLimit(user.sub, cardId);
  }
}
