import { subscribeToTickerOnWs } from "@/api";

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
