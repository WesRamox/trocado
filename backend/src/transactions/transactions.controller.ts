import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQuery, MonthQuery } from './dto/list-transactions.query.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { TransactionsService } from './transactions.service.js';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListTransactionsQuery) {
    return this.transactionsService.findAll(user.sub, query);
  }

  // Precisa vir antes de ':id' para 'summary' não ser lido como id
  @Get('summary')
  summary(@CurrentUser() user: JwtPayload, @Query() query: MonthQuery) {
    return this.transactionsService.summary(user.sub, query.month);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.transactionsService.findOne(user.sub, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('allInstallments', new ParseBoolPipe({ optional: true })) allInstallments?: boolean,
  ) {
    return this.transactionsService.remove(user.sub, id, allInstallments);
  }
}
