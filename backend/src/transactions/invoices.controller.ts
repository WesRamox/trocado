import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InvoiceParams, InvoicePaymentParams } from './dto/invoice.params.js';
import { PayInvoiceDto } from './dto/pay-invoice.dto.js';
import { SetInvoiceTotalDto } from './dto/set-invoice-total.dto.js';
import { TransactionsService } from './transactions.service.js';

@Controller('cards/:cardId/invoices')
export class InvoicesController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // GET /cards/1/invoices/2026-10 -> fatura que vence em outubro/2026
  @Get(':month')
  findOne(@CurrentUser() user: JwtPayload, @Param() { cardId, month }: InvoiceParams) {
    return this.transactionsService.invoice(user.sub, cardId, month);
  }

  // Informa o total da fatura sem os itens; devolve a fatura atualizada
  @Put(':month/total')
  setTotal(
    @CurrentUser() user: JwtPayload,
    @Param() { cardId, month }: InvoiceParams,
    @Body() { total }: SetInvoiceTotalDto,
  ) {
    return this.transactionsService.setInvoiceTotal(user.sub, cardId, month, total);
  }

  @Delete(':month/total')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTotal(@CurrentUser() user: JwtPayload, @Param() { cardId, month }: InvoiceParams) {
    return this.transactionsService.removeInvoiceRemainder(user.sub, cardId, month);
  }

  // Pagamento total ou parcial; devolve a fatura atualizada
  @Post(':month/payments')
  pay(@CurrentUser() user: JwtPayload, @Param() { cardId, month }: InvoiceParams, @Body() dto: PayInvoiceDto) {
    return this.transactionsService.payInvoice(user.sub, cardId, month, dto);
  }

  @Delete(':month/payments/:paymentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePayment(@CurrentUser() user: JwtPayload, @Param() { cardId, month, paymentId }: InvoicePaymentParams) {
    return this.transactionsService.removeInvoicePayment(user.sub, cardId, month, paymentId);
  }
}
