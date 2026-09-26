import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurrencesService } from './recurrences.service.js';

// De hora em hora: cada pessoa vira o dia no próprio fuso, então rodar a cada hora garante que
// as ocorrências de "hoje" apareçam no máximo uma hora depois da meia-noite dela.
// Se o servidor ficar fora do ar, a próxima execução gera tudo o que ficou para trás
// (a geração parte de lastGeneratedDate), e execuções simultâneas não duplicam lançamentos.
@Injectable()
export class RecurrencesScheduler {
  private readonly logger = new Logger(RecurrencesScheduler.name);
  private running = false;

  constructor(private readonly recurrencesService: RecurrencesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async generateDue() {
    // Uma execução longa não se sobrepõe à seguinte
    if (this.running) return;
    this.running = true;
    try {
      const created = await this.recurrencesService.generateAllDue();
      if (created > 0) this.logger.log(`${created} lançamento(s) gerado(s) a partir de recorrências`);
    } catch (error) {
      this.logger.error('Falha ao gerar lançamentos das recorrências', error instanceof Error ? error.stack : error);
    } finally {
      this.running = false;
    }
  }
}
