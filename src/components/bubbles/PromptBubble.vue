<template>
  <v-row
    ref="rootElement"
    :align="align"
    class="oeos-clickable text-center ma-0"
  >
    <v-text-field
      v-if="active"
      v-model="inputValue"
      ref="input"
      class="oeos-clickable"
      autofocus
      solo
      dense
      style="min-width: 250px"
      hide-details="auto"
      append-icon="mdi-arrow-right-drop-circle"
      @click:append="onInput"
      @keydown.enter="onInput"
    ></v-text-field>
    <v-row v-else-if="enteredValue" align="center">
      <v-btn class="custom-transform-class text-none" disabled>
        <span>{{ enteredValue }}</span></v-btn
      >
    </v-row>
    <v-row v-else align="center">
      <v-btn class="oeos-clickable custom-transform-class text-none" disabled>
        <span> ... </span></v-btn
      >
    </v-row>
  </v-row>
</template>

<script>
export default {
  props: {
    value: {
      type: Object,
      default: () => ({}),
    },
    isDebug: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      inputValue: null,
    }
  },

  watch: {
    // enteredValue(newVal) {
    //   if (!this.inputValue && this.inputValue !== newVal) {
    //     this.inputValue = newVal
    //   }
    // },
  },

  mounted() {
    // this.inputValue = this.enteredValue
    this.$emit('ready', this.$refs.rootElement)
  },

  computed: {
    enteredValue() {
      return this.value.value
    },
    showButton() {
      return this.active && !this.noPause && this.allowSkip
    },
    onInputMethod() {
      return typeof this.value.onInput === 'function'
        ? this.value.onInput
        : () => {
            console.warn('No onInput method supplied')
          }
    },
    align() {
      return this.value.align || 'center'
    },
  },

  methods: {
    onInput() {
      if (!this.active) return
      this.onInputMethod(
        this.inputValue === undefined || this.inputValue === null
          ? ''
          : this.inputValue
      )
    },
  },
}
</script>

<style scoped></style>
