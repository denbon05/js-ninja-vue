<template>
  <v-form
    v-model="isValidForm"
    lazy-validation
    ref="tickerForm"
    class="d-flex flex-column mt-2"
  >
    <v-text-field
      style="max-width: 100%; min-width: 300px"
      variant="outlined"
      label="Ticker"
      autofocus
      v-model="ticker"
      @keyup.enter="() => addTicker()"
      :rules="tickersValidation(tickers)"
    ></v-text-field>
    <section v-if="tickerHints.length" style="gap: 10px" class="d-flex mb-2">
      <v-btn
        :key="hint"
        v-for="hint in tickerHints"
        variant="outlined"
        @click="addTicker(hint)"
        >{{ hint }}</v-btn
      >
    </section>
    <v-btn
      @click="addTicker()"
      rounded="pill"
      color="grey"
      class="text--white"
      width="100"
      >Add</v-btn
    >
  </v-form>
</template>

<script>
import { values } from "lodash";
import { tickersValidation } from "@/validation";
import { fetchTickerList } from "@/api";

export default {
  props: {
    tickers: {
      type: Array,
      default: () => [],
    },
  },

  emits: {
    "add-ticker": (value) => value,
  },

  data: () => ({
    loadHintsQuery: {
      isLoading: false,
      isSuccess: true,
      message: "",
    },
    ticker: "",
    tickerHints: [],
    allTickerHints: [],
    isValidForm: true,
  }),

  methods: {
    tickersValidation,

    addTicker(ticker = this.ticker) {
      this.$refs.tickerForm.validate().then(({ valid: isValidForm }) => {
        this.isValidForm = isValidForm;
        if (isValidForm) {
          this.$emit("add-ticker", ticker);
          this.ticker = "";
        }
      });
    },

    async loadHints() {
      const { loadHintsQuery } = this;
      loadHintsQuery.isLoading = true;
      try {
        const {
          data: { Data: tickerList },
        } = await fetchTickerList();
        this.allTickerHints = tickerList;
        loadHintsQuery.isLoading = { isSuccess: true, isLoading: false };
      } catch (err) {
        console.error(err);
        this.loadHintsQuery = {
          isLoading: false,
          isSuccess: false,
          message: err.message,
        };
      }
    },
  },

  watch: {
    ticker(value) {
      this.$refs.tickerForm.resetValidation();
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
  },

  created() {
    this.loadHints();
  },
};
</script>
