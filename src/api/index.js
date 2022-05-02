import axios from "axios";

const CRYPTO_API_KEY = process.env.VUE_APP_CRYPTO_API_KEY;
const AGGREGATE_IDX = "5";
const tickersHandlers = new Map();

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${CRYPTO_API_KEY}`
);

const channel = new BroadcastChannel("crypto");
const receiver = new BroadcastChannel("crypto");

receiver.addEventListener("message", ({ data }) => {
  const { currency: curr, newPrice: price } = JSON.parse(data);
  const handlers = tickersHandlers.get(curr) ?? [];
  handlers.forEach((fn) => fn(curr, price));
});

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice,
  } = JSON.parse(e.data);

  if (type !== AGGREGATE_IDX || !newPrice) {
    return;
  }

  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach((fn) => fn(currency, newPrice));
  channel.postMessage(JSON.stringify({ currency, newPrice }));
});

const subscribeToTickerOnWs = (tickerName) => {
  const message = JSON.stringify({
    action: "SubAdd",
    subs: [`5~CCCAGG~${tickerName}~USD`],
  });
  if (socket.readyState === socket.OPEN) {
    socket.send(message);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(message);
    },
    { once: true }
  );
};

export const subscribeToTicker = (tickerName, cb) => {
  const subscribers = tickersHandlers.get(tickerName) || [];
  tickersHandlers.set(tickerName, [...subscribers, cb]);
  subscribeToTickerOnWs(tickerName);
};

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
};

export const fetchTickerList = async () =>
  await axios.get(
    "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
  );

// the main goal here is to UPDATE cryptocurrencies, not to receive their pairs
