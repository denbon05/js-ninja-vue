export const tickersValidation = (tickers) => [
  (v) => !!v || "Ticker name is required",
  (v) =>
    !tickers.some(({ name }) => name === v.toUpperCase()) ||
    "That ticker has already been added",
];
