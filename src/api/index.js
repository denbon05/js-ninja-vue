import axios from "axios";

const tickerHandlers = new Map();

const loadTickers = async () => {
  if (tickerHandlers.size === 0) {
    return;
  }

  const cryptoCompareUrl = new URL(
    "https://min-api.cryptocompare.com/data/pricemulti"
  );
  cryptoCompareUrl.searchParams.set(
    "fsyms",
    [...tickerHandlers.keys()].join(",")
  );
  cryptoCompareUrl.searchParams.set("tsyms", "USD");

  const rateDataByCurrency = await axios.get(cryptoCompareUrl);
  const updatedPrices = Object.fromEntries(
    Object.entries(rateDataByCurrency).map(([currency, rateData]) => [
      currency,
      rateData.USD,
    ])
  );
  Object.entries(updatedPrices).forEach(([currency, newPrice]) => {
    const handlers = tickerHandlers.get(currency) ?? [];
    handlers.forEach((fn) => fn(newPrice));
  });
};

export const subscribeToTicker = (tickerName, cb) => {
  const subscribers = tickerHandlers.get(tickerName) || [];
  tickerHandlers.set(tickerName, [...subscribers, cb]);
};

export const unsubscribeFromTicker = (ticker) => {
  tickerHandlers.delete(ticker);
};

setInterval(loadTickers, 5000);

export const fetchTickerList = async () =>
  await axios.get(
    "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
  );
