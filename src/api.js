import axios from "axios";
import { tickersHandlers } from "@/helpers";

const CRYPTO_API_KEY = process.env.VUE_APP_CRYPTO_API_KEY;
const AGGREGATE_IDX = "5";
const INVALID_TYPE = {
  idx: "500",
  msg: "INVALID_SUB",
};

const cryptoURI = new URL("wss://streamer.cryptocompare.com/v2");
cryptoURI.searchParams.set("api_key", CRYPTO_API_KEY);

const socket = new WebSocket(cryptoURI.toString());

const channel = new BroadcastChannel("crypto");
const receiver = new BroadcastChannel("crypto");

const sendMessageBySocket = (fromSymbol, toSymbol = "USD") => {
  const message = JSON.stringify({
    action: "SubAdd",
    subs: [`5~CCCAGG~${fromSymbol}~${toSymbol}`],
  });

  if (socket.readyState === socket.OPEN) {
    socket.send(message);
  }

  return message;
};

receiver.addEventListener("message", ({ data }) => {
  const { currency: curr, newPrice: price, tickerIsValid } = JSON.parse(data);
  const handlers = tickersHandlers.get(curr) ?? [];
  handlers.forEach((fn) => fn(curr, price, tickerIsValid));
});

socket.addEventListener("message", (e) => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice,
    MESSAGE: message,
    PARAMETER: parameter,
  } = JSON.parse(e.data);

  const tickerIsInValid =
    message === INVALID_TYPE.msg && type === INVALID_TYPE.idx;

  if (tickerIsInValid) {
    const triedToReceiveCurrency = parameter.split("~").at(-2);
    const handlers = tickersHandlers.get(triedToReceiveCurrency) ?? [];
    handlers.forEach((fn) => fn(triedToReceiveCurrency, newPrice, false));
  }

  if (type !== AGGREGATE_IDX || !newPrice) {
    return;
  }

  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach((fn) => fn(currency, newPrice));
  channel.postMessage(JSON.stringify({ currency, newPrice }));
});

export const subscribeToTickerOnWs = (tickerName) => {
  const message = sendMessageBySocket(tickerName);

  socket.addEventListener(
    "open",
    () => {
      socket.send(message);
    },
    { once: true }
  );
};

export const fetchTickerList = async () =>
  await axios.get(
    "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
  );

// the main goal here is to UPDATE cryptocurrencies, not to receive their pairs
