import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { PeopleModule } from '../people/people.module.js';
import { UsersModule } from '../users/users.module.js';
import { CreditLimitController } from './credit-limit.controller.js';
import { InvoicesController } from './invoices.controller.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [CardsModule, CategoriesModule, PeopleModule, UsersModule],
  controllers: [TransactionsController, InvoicesController, CreditLimitController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
