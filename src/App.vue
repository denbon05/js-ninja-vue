<template>
  <v-app
    ><v-snackbar
      :color="snackbar.color"
      :timeout="5000"
      v-model="snackbar.isVisible"
      shaped
      top
    >
      {{ snackbar.message }}
    </v-snackbar>
    <v-main>
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="6">
            <add-ticker @add-ticker="addTicker" :tickers="tickers" />
          </v-col>
          <v-col cols="12" md="6" class="d-flex flex-column">
            <section id="filter">
              <v-text-field
                v-model="filter"
                label="Filter"
                variant="outlined"
                dense
                hide-details
                class="pt-2"
              ></v-text-field>
            </section>
            <section id="pagination" class="d-flex justify-end mb-3">
              <v-btn @click="page = page - 1" v-if="page > 1" class="mr-2"
                >prev</v-btn
              >
              <v-btn v-if="hasNextPage" @click="page += 1">next</v-btn>
            </section>
          </v-col>
        </v-row>

        <hr v-if="tickers.length" class="border-gray-600 my-3" />
        <v-row>
          <v-col
            cols="12"
            md="4"
            :key="idx"
            v-for="(t, idx) in paginatedTickers"
          >
            <v-card
              class="d-flex flex-column align-center py-3"
              :variant="
                t.name === selectedTicker?.name ? 'outlined' : 'contained'
              "
              elevation="4"
              :color="t.isInvalid ? '#ffd9e0' : ''"
              @click="selectTicker(t)"
            >
              <div class="pa-4 text-center">
                <dt class="text-subtitle-2">{{ t.name }} - USD</dt>
                <dd class="text-subtitle-1">
                  {{ t.price || "-" }}
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
          <v-col cols="12">
            <ticker-graph
              @close-graph="removeDashboard()"
              v-model="selectedTicker"
              :graph="graph"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
// [x] 6. Availability in the state of dependent data | Criticality: 5+
// [x] 4. Requests directly inside the component (???) | Criticality: 5.
// [x] 2. When you delete the Ticker load subscription remains | Criticality: 5.
// [x] 5. API error handling | Criticality: 5.
// [x] 3. Number of requests | Criticality: 4.
// [x] 8. When removing a ticker, LocalStorage | Criticality: 4.
// [x] 1. Same code in Watch | Criticality: 3.
// [] 9. LocalStorage and anonymous tabs | Criticality: 3.
// [x] 7. The graph is terribly looking if there are many prices | Criticality: 2.
// [] 10. Magic strings and numbers (URL, 5000 milliseconds delay, localStorage key, number on page) | Criticality: 1.

// Parallel
// [x] normalizedGraph is broken if everywhere identical values
// [x] When deleting a ticker, the choice remains

import AddTicker from "@/components/AddTicker.vue";
import TickerGraph from "@/components/TickerGraph.vue";
import {
  subscribeToTicker,
  unsubscribeFromTicker,
  getTickersData,
  setTickersData,
} from "./helpers";

export default {
  name: "App",

  components: {
    AddTicker,
    TickerGraph,
  },

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

    filter: "",
    tickers: [],
    selectedTicker: null,
    graph: [],
    page: 1,

    graphView: {
      firstItemPx: 5,
      graphItemPerPx: 22,
    },
  }),

  methods: {
    updateTicker(tickerName, price, tickerIsValid = true) {
      if (!tickerIsValid) {
        this.tickers.find((t) => t.name === tickerName).isInvalid = true;
      }

      this.tickers
        .filter((t) => t.name === tickerName)
        .forEach((t) => {
          t.price = price;
          if (this.selectedTicker?.name === t?.name) {
            this.graph.push(t.price);
            if (this.graph.length > this.maxGraphElements) {
              this.graph = this.graph.slice(
                this.graph.length - this.maxGraphElements
              );
            }
          }
        });
    },

    async addTicker(tickerName) {
      const currentTicker = {
        name: tickerName.toUpperCase(),
        price: "-",
      };
      this.tickers = [...this.tickers, currentTicker];
    },

    removeDashboard() {
      this.selectedTicker = null;
    },

    removeTicker(t) {
      this.tickers = this.tickers.filter(({ name }) => name !== t.name);
      unsubscribeFromTicker(t.name);
      if (t.name === this.selectedTicker?.name) {
        this.selectedTicker = null;
      }
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
      return this.tickers.filter(
        ({ name }) => name && name.includes(this.filter.toUpperCase())
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
    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );
    if (windowData.filter) this.filter = windowData.filter;
    if (windowData.page) this.page = parseInt(windowData.page);
    this.tickers = getTickersData() ?? [];

    this.tickers.forEach(({ name }) => {
      subscribeToTicker(name, this.updateTicker);
    });
  },

  watch: {
    selectedTicker() {
      this.graph = [];
    },

    tickers: {
      handler() {
        setTickersData(this.tickers);
        this.tickers.forEach(({ name }) => {
          subscribeToTicker(name, this.updateTicker);
        });
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

<style>
svg {
  stroke: #1f8ceb;
  fill: rgba(31, 140, 235, 0.06);
}

svg path {
  box-sizing: border-box;
}
</style>
