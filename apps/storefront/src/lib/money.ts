export const formatStorefrontMoney = (
  amount: number,
  currencyCode: string,
): string =>
  new Intl.NumberFormat("ar", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
    currencyDisplay: "symbol",
  }).format(amount);
