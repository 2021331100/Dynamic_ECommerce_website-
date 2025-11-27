const CURRENCY_LOCALE = "en-BD";
const DEFAULT_FORMATTER = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount = 0, { minimumFractionDigits = 0 } = {}) => {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
    minimumFractionDigits,
  }).format(value);
};

export const formatCurrencyCompact = (amount = 0) => {
  const value = Number(amount) || 0;
  if (value >= 1000) {
    return `৳${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return DEFAULT_FORMATTER.format(value);
};
