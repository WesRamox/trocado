import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { RecurrencesController } from './recurrences.controller.js';
import { RecurrencesScheduler } from './recurrences.scheduler.js';
import { RecurrencesService } from './recurrences.service.js';

@Module({
  imports: [CardsModule, CategoriesModule],
  controllers: [RecurrencesController],
  providers: [RecurrencesService, RecurrencesScheduler],
})
export class RecurrencesModule {}
