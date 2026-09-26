import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { RecurrencesModule } from '../recurrences/recurrences.module.js';
import { InvoicesController } from './invoices.controller.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [CardsModule, CategoriesModule, RecurrencesModule],
  controllers: [TransactionsController, InvoicesController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
