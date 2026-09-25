import { Module } from '@nestjs/common';
import { CardsModule } from '../cards/cards.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { RecurrencesController } from './recurrences.controller.js';
import { RecurrencesService } from './recurrences.service.js';

@Module({
  imports: [CardsModule, CategoriesModule],
  controllers: [RecurrencesController],
  providers: [RecurrencesService],
  exports: [RecurrencesService],
})
export class RecurrencesModule {}
