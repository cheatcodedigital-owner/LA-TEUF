export function formatXof(amount: number, locale: string) {
  return `${new Intl.NumberFormat(locale).format(amount)} FCFA`;
}
