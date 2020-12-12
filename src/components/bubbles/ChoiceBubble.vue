<template>
  <v-row
    v-if="options[0] && selectedOption === null"
    ref="rootElement"
    align="center"
    class="oeos-choices text-center"
  >
    <template v-for="(option, i) in options">
      <v-expand-x-transition :key="option.label + ':' + i">
        <v-btn
          v-show="optionVisible(option)"
          :key="option.label + ':' + i"
          :color="option.color"
          class="custom-transform-class text-none mx-1"
          @click.stop="optionSelect(option)"
        >
          <span v-html="option.label"></span
        ></v-btn>
      </v-expand-x-transition>
    </template>
  </v-row>
  <v-row
    v-else-if="selectedOption"
    ref="rootElement"
    align="center"
    class="oeos-choices text-center"
  >
    <v-btn class="custom-transform-class text-none" disabled>
      <span v-html="selectedOption.label"></span
    ></v-btn>
  </v-row>
  <v-row
    v-else
    ref="rootElement"
    align="center"
    class="oeos-choices text-center"
  >
    <v-btn disabled> <span> ... </span></v-btn>
  </v-row>
</template>

<script>
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
  data: () => ({
    transition: null,
  }),

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
    this.transition = 'expand-x-transition'
    this.$emit('ready', this.$refs.rootElement)
  },

  methods: {
    optionSelect(option) {
      if (!this.optionVisible(option)) return
      option.onSelect()
    },
    optionVisible(option) {
      return !('visible' in option) || option.visible
    },
  },
}
</script>

<style scoped>
.oeos-choices {
  display: block;
}
.oeos-choices .v-btn {
  transition: background-color 0.25s ease;
  min-width: 20px;
}
</style>
