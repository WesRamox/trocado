import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CardsModule } from './cards/cards.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { LoansModule } from './loans/loans.module.js';
import { PeopleModule } from './people/people.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RecurrencesModule } from './recurrences/recurrences.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CardsModule,
    CategoriesModule,
    PeopleModule,
    LoansModule,
    TransactionsModule,
    RecurrencesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
