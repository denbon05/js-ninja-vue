<template>
  <div v-if="modelValue" ref="graphRef">
    <section class="d-flex justify-space-between">
      <h3 class="subtitle">{{ modelValue?.name }} - USD</h3>
      <button @click="closeGraph">
        <v-icon>mdi-close</v-icon>
      </button>
    </section>
    <svg
      class="sparkline"
      :width="graphWidth"
      :height="graphHeight"
      :graphStroke-width="graphStroke"
    >
      <path class="sparkline--line" :d="shape" fill="none"></path>
      <path
        class="sparkline--fill"
        :d="[shape, fillEndPath].join(' ')"
        graphStroke="none"
      ></path>
    </svg>
  </div>
</template>

<script>
import { useDisplay } from "vuetify";

export default {
  setup() {
    const display = useDisplay();

    return { display };
  },

  props: {
    modelValue: {
      type: Object,
      default: () => {},
    },
    graph: {
      type: Array,
      default: () => [],
    },
  },

  emits: {
    "update:modelValue": null,
    "close-graph": null,
  },

  data: () => ({
    graphWidth: 700,
    graphStroke: 3,
    graphHeight: 200,
    maxGraphElements: 1,
  }),

  methods: {
    closeGraph() {
      this.$emit("close-graph");
    },

    calculateMaxGraphElements() {
      const graphContainer = this.$refs.graphRef;
      if (!graphContainer) {
        return;
      }
      this.graphWidth = graphContainer.clientWidth;
      if (this.display.mdAndDown.value) {
        this.maxGraphElements = Math.ceil(graphContainer.clientWidth / 20);
        return;
      }
      this.maxGraphElements = Math.ceil(graphContainer.clientWidth / 10);
    },
  },

  computed: {
    shape() {
      const graphStroke = this.graphStroke;
      const graphWidth = this.graphWidth;
      const graphHeight = this.graphHeight - graphStroke * 2;

      const normalizedGraph = this.normalizedGraph || [];
      const highestPoint = Math.max.apply(null, normalizedGraph);
      const coordinates = [];
      const totalPoints = this.normalizedGraph.length - 1;

      normalizedGraph.forEach((item, n) => {
        const x = (n / totalPoints) * graphWidth + graphStroke;
        const y =
          graphHeight - (item / highestPoint) * graphHeight + graphStroke;

        coordinates.push({ x, y });
      });
      const coordinate = coordinates.at(0);

      if (!coordinate?.x || !coordinate?.y) {
        return (
          "M 0 " +
          this.graphStroke +
          " L 0 " +
          this.graphStroke +
          " L " +
          this.graphWidth +
          " " +
          this.graphStroke
        );
      }

      const path = [];

      coordinates.forEach((point) =>
        path.push(["L", point.x, point.y].join(" "))
      );

      return ["M" + coordinates[0].x, coordinates[0].y, ...path].join(" ");
    },

    fillEndPath() {
      return `V ${this.graphHeight} L 4 ${this.graphHeight} Z`;
    },

    normalizedGraph() {
      const maxValue = Math.max(...this.graph);
      const minValue = Math.min(...this.graph);

      if (maxValue === minValue) {
        return this.graph.map(() => 50);
      }

      return this.graph.map(
        (price) => 5 + ((price - minValue) * 95) / (maxValue - minValue)
      );
    },
  },

  mounted() {
    window.addEventListener("resize", this.calculateMaxGraphElements);
    this.$nextTick().then(this.calculateMaxGraphElements);
  },

  beforeUnmount() {
    window.removeEventListener("resize", this.calculateMaxGraphElements);
  },
};
</script>
