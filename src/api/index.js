import axios from "axios";

export const fetchCryptoPrice = async ({ tosym, fromsymn = "USD" }) =>
  await axios.get(
    `https://min-api.cryptocompare.com/data/price?fsym=${fromsymn}&tsyms=${tosym}`
  );

export const fetchTickerList = async () =>
  await axios.get(
    "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
  );
