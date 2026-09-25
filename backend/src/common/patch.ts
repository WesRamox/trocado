// Em um PATCH: undefined = campo não enviado (mantém o atual); null = limpar o valor.
export const valueOrCurrent = <T>(value: T | undefined, current: T): T =>
  value === undefined ? current : value;
