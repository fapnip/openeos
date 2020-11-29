<template>
  <v-row
    v-if="options[0] && selectedOption === null"
    align="center"
    class="oeos-choices"
  >
    <template v-for="(option, i) in options">
      <v-btn
        v-if="optionVisible(option)"
        :key="option.label + ':' + i"
        small
        :color="option.color"
        class="custom-transform-class text-none mx-1"
        @click.stop="optionSelect(option)"
      >
        <span v-html="markupFilter(option.label)"></span
      ></v-btn>
    </template>
  </v-row>
  <v-row v-else-if="selectedOption" align="center">
    <v-btn class="custom-transform-class text-none" small disabled>
      <span v-html="selectedOption.label"></span
    ></v-btn>
  </v-row>
  <v-row v-else align="center">
    <v-btn small disabled> <span> ... </span></v-btn>
  </v-row>
</template>

<script>
import markupFilter from '../../util/markupFilter'

export default {
  props: {
    value: {
      type: Object,
      default: () => {},
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
  data: () => ({}),

  computed: {
    hasVisibleOptions() {
      return !!this.options.find(o => this.optionVisible(o))
    },
    options() {
      return this.value.options || []
    },
    selectedOption() {
      return this.value && this.value.selectedOption
    },
  },

  mounted() {
    if (
      !this.hasVisibleOptions &&
      typeof this.value.onContinue === 'function'
    ) {
      this.value.onContinue()
    }
  },

  methods: {
    markupFilter: markupFilter,
    optionSelect(option) {
      option.onSelect()
    },
    optionVisible(option) {
      return !('visible' in option) || option.visible
    },
  },
}
</script>

<style scoped>
.oeos-choices .v-btn {
  min-width: 30px;
}
</style>
