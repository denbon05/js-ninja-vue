import { subscribeToTickerOnWs } from "@/api";

const cryptoLocalStorageKey = "cryptonomicon-list";

export const tickersHandlers = new Map();

export const subscribeToTicker = (tickerName, cb) => {
  if (!tickersHandlers.has(tickerName)) {
    const subscribers = tickersHandlers.get(tickerName) || [];
    tickersHandlers.set(tickerName, [...subscribers, cb]);
  }

  subscribeToTickerOnWs(tickerName);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
};

export const getTickersData = () => {
  const tickersData = localStorage.getItem(cryptoLocalStorageKey);

  if (tickersData) {
    return JSON.parse(tickersData);
  }
};

export const setTickersData = (tickersList) => {
  localStorage.setItem(cryptoLocalStorageKey, JSON.stringify(tickersList));
};
