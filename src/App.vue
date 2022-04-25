<template>
  <v-snackbar
    :color="snackbar.color"
    :timeout="5000"
    v-model="snackbar.isVisible"
    shaped
    top
  >
    {{ snackbar.message }}
  </v-snackbar>
  <v-app>
    <v-main>
      <v-container>
        <v-row>
          <v-col cols="6">
            <v-form ref="tickerForm" class="d-flex flex-column mt-2">
              <v-text-field
                style="width: 30%; min-width: 400px"
                variant="outlined"
                label="Ticker"
                autofocus
                v-model="ticker"
                @keyup.enter="addTicket"
                :rules="[
                  (v) => v || 'Ticker name is required',
                  (v) =>
                    !tickers.some(({ name }) => name === v.toUpperCase()) ||
                    'Тhat ticker has already been added',
                ]"
              ></v-text-field>
              <section
                v-if="tickerHints.length"
                style="gap: 10px"
                class="d-flex mb-2"
              >
                <v-btn
                  :key="hint"
                  v-for="hint in tickerHints"
                  variant="outlined"
                  @click="addTicket()"
                  >{{ hint }}</v-btn
                >
              </section>
              <v-btn
                @click="addTicket"
                rounded="pill"
                color="grey"
                class="text--white"
                width="100"
                >Add</v-btn
              >
            </v-form>
          </v-col>
          <v-col cols="6" class="d-flex flex-column">
            <section id="pagination" class="d-flex justify-end mb-3">
              <v-btn @click="page = page - 1" v-if="page > 1" class="mr-2"
                >prev</v-btn
              >
              <v-btn v-if="hasNextPage" @click="page += 1">next</v-btn>
            </section>
            <section id="filter">
              <v-text-field
                v-model="filter"
                label="Filter"
                dense
                hide-details
              ></v-text-field>
            </section>
          </v-col>
        </v-row>

        <hr v-if="tickers.length" class="border-gray-600 my-3" />
        <v-row>
          <v-col cols="4" :key="idx" v-for="(t, idx) in paginatedTickers">
            <v-card
              class="d-flex flex-column align-center py-3"
              :variant="
                t.name === selectedTicker?.name ? 'outlined' : 'contained'
              "
              elevation="4"
              @click="selectTicker(t)"
            >
              <div class="pa-4 text-center">
                <dt class="text-sm font-medium text-gray-500 truncate">
                  {{ t.name }} - USD
                </dt>
                <dd class="mt-1 text-3xl font-semibold text-gray-900">
                  {{ t.price }}
                </dd>
                <div class="border-gray-200"></div>
              </div>
              <button
                @click.stop="removeTicker(t)"
                class="d-flex justify-center"
              >
                <v-icon> mdi-delete-outline </v-icon>
                Delete
              </button>
            </v-card>
          </v-col>
        </v-row>
        <hr v-if="tickers.length" class="border-gray-600 my-4" />
        <v-row v-if="selectedTicker">
          <v-col>
            <section class="d-flex justify-space-between">
              <h3 class="subtitle">{{ selectedTicker?.name }} - USD</h3>
              <button @click="removeDashboard">
                <v-icon>mdi-close</v-icon>
              </button>
            </section>

            <svg height="400" :width="graphView.dashboardWidth">
              <path
                id="lineAB"
                :d="`M 0 0 v ${graphView.graphMaxItemHeight + 5}`"
                stroke="grey"
                stroke-width="2"
                fill="none"
              />
              <path
                id="lineBC"
                :d="`M 0 ${graphView.graphMaxItemHeight + 5} h 1000`"
                stroke="grey"
                stroke-width="2"
                fill="none"
              />

              <rect
                :key="`price_${gIdx}`"
                v-for="(itemHeight, gIdx) in normalizedGraph"
                :x="dashboardXBy[gIdx]"
                :y="graphView.graphMaxItemHeight - itemHeight"
                width="20"
                :height="itemHeight"
                fill="#5a20e3"
              />
            </svg>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
// [x] 6. Availability in the state of dependent data | Criticality: 5+
// [] 4. Requests directly inside the component (???) | Criticality: 5.
// [] 2. When you delete the Ticker load subscription remains | Criticality: 5.
// [] 5. API error handling | Criticality: 5.
// [] 3. Number of requests | Criticality: 4.
// [x] 8. When removing a ticker, LocalStorage | Criticality: 4.
// [x] 1. Same code in Watch | Criticality: 3.
// [] 9. Localstorage and anonymous tabs | Criticality: 3.
// [] 7. The schedule is terribly looking if there are many prices | Criticality: 2.
// [] 10. Magic strings and numbers (URL, 5000 milliseconds delay, localStorage key, number on page) | Criticality: 1.

// Parallel
// [x] normalizedGraph is broken if everywhere identical values
// [x] When deleting a ticker, the choice remains

import { values } from "lodash";
import {
  fetchTickerList,
  subscribeToTicker,
  unsubscribeFromTicker,
} from "@/api";

export default {
  name: "App",

  data: () => ({
    snackbar: {
      isVisible: false,
      message: "",
      color: "success",
    },
    tickerDataQuery: {
      isLoading: false,
      isSuccess: true,
      message: "",
    },
    loadContextQuery: {
      isLoading: false,
      isSuccess: true,
      message: "",
    },

    filter: "",
    ticker: "",
    tickers: [],
    tickerHints: [],
    allTickerHints: [],
    selectedTicker: null,
    graph: [],
    page: 1,

    graphView: {
      firstItemPx: 5,
      dashboardWidth: 1000,
      graphMaxItemHeight: 300,
      graphItemPerPx: 22,
    },
  }),

  methods: {
    async loadContext() {
      const { loadContextQuery } = this;
      loadContextQuery.isLoading = true;
      try {
        const {
          data: { Data: tickerList },
        } = await fetchTickerList();
        this.allTickerHints = tickerList;
        loadContextQuery.isLoading = { isSuccess: true, isLoading: false };
      } catch (err) {
        console.error(err);
        this.loadContextQuery = {
          isLoading: false,
          isSuccess: false,
          message: err.message,
        };
      }
    },

    updateTicker(tickerName, price) {
      // debugger;
      this.tickers
        .filter((t) => t.name === tickerName)
        .forEach((t) => {
          t.price = price;
        });
    },

    selectHint({ symbol }) {
      this.ticker = symbol;
      this.addTicket();
    },

    async addTicket() {
      const { valid: isValidForm } = await this.$refs.tickerForm.validate();
      if (isValidForm) {
        const currentTicker = {
          name: this.ticker.toUpperCase(),
          price: "-",
        };
        this.tickers = [...this.tickers, currentTicker];
      }
    },

    removeDashboard() {
      this.selectedTicker = null;
    },

    removeTicker(t) {
      this.tickers = this.tickers.filter(({ name }) => name !== t.name);
      unsubscribeFromTicker(t);
    },

    selectTicker(t) {
      this.selectedTicker = t;
    },

    showSnackBar({ message, isSuccess = true }) {
      this.snackbar = {
        isVisible: true,
        message,
        color: isSuccess ? "success" : "red darken-2",
      };
    },
  },

  computed: {
    beginPaginationIdx() {
      return (this.page - 1) * 6;
    },

    endPaginationIdx() {
      return this.page * 6;
    },

    filteredTickers() {
      return this.tickers.filter(({ name }) =>
        name.includes(this.filter.toUpperCase())
      );
    },

    paginatedTickers() {
      return this.filteredTickers.slice(
        this.beginPaginationIdx,
        this.endPaginationIdx
      );
    },

    hasNextPage() {
      return this.filteredTickers.length > this.endPaginationIdx;
    },

    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page,
      };
    },

    normalizedGraph() {
      const {
        graphView: {
          graphItemPerPx,
          dashboardWidth,
          graphMaxItemHeight,
          firstItemPx,
        },
        graph,
      } = this;
      const fulFilledDashboard =
        graphItemPerPx * graph.length + firstItemPx * 2;
      const prices = this.graph.slice(
        fulFilledDashboard < dashboardWidth - graphItemPerPx * 2
          ? 0
          : (fulFilledDashboard - dashboardWidth) / graphItemPerPx
      );
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      if (maxPrice === minPrice) {
        return Array(graph.length).fill(graphMaxItemHeight / 2);
      }
      const res = prices.map((p) => p / (maxPrice / graphMaxItemHeight));
      // console.log(res);
      return res;
    },

    dashboardXBy() {
      const { firstItemPx, graphItemPerPx } = this.graphView;
      let x = firstItemPx;
      return this.normalizedGraph.map((_p, idx) => {
        if (idx > 0) x += graphItemPerPx;
        return x;
      });
    },
  },

  created() {
    this.loadContext();

    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );
    if (windowData.filter) this.filter = windowData.filter;
    if (windowData.page) this.page = parseInt(windowData.page);
    const tickersData = localStorage.getItem("cryptonomicon-list");

    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach(({ name }) => {
        subscribeToTicker(name, this.updateTicker);
      });
    }
  },

  watch: {
    selectedTicker() {
      this.graph = [];
    },

    tickers: {
      handler() {
        localStorage.setItem(
          "cryptonomicon-list",
          JSON.stringify(this.tickers)
        );
        if (this.selectedTicker) {
          const { price: newPrice } = this.tickers.find(
            ({ name }) => name === this.selectedTicker.name
          );
          this.graph.push(newPrice);
        }
      },
      deep: true,
    },

    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },

    filter() {
      this.page = 1;
    },

    tickerDataQuery: {
      handler({ isLoading, isSuccess, message }) {
        if (!isLoading && !isSuccess) {
          this.showSnackBar({ isLoading, isSuccess, message });
        }
      },
      deep: true,
      immediate: false,
    },

    ticker(value) {
      const { allTickerHints } = this;
      if (!value) {
        this.tickerHints = [];
      } else {
        this.tickerHints = values(allTickerHints)
          .filter(
            ({ Symbol, FullName }) =>
              FullName.includes(value) || Symbol.includes(value)
          )
          .slice(0, 4)
          .map(({ Symbol }) => Symbol);
      }
    },

    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },
  },
};
</script>
