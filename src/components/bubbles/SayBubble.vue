<template>
  <v-card
    ref="rootElement"
    :color="value.color || 'black'"
    @click.once="onClick"
    class="oeos-say-bubble oeos-clickable"
  >
    <global-events
      v-if="active && (allowSkip || (isDebug && !noPause))"
      @keydown.space.stop="onClick"
      @keydown.enter.stop="onClick"
    />
    <v-card-text ref="labelHtml" :class="textClass" v-html="filteredLabel">
    </v-card-text>
    <div
      :class="{
        'oeos-blink-button': true,
        'no-blink': !showButton && isDebug && !noPause,
      }"
    >
      <v-btn
        v-if="active && (showButton || (isDebug && !noPause))"
        icon
        x-small
        :color="!showButton && isDebug && !noPause ? 'rgb(250, 157, 157)' : ''"
        ><v-icon dark>mdi-arrow-right-drop-circle</v-icon></v-btn
      >
    </div>
  </v-card>
</template>

<script>
import stripHtml from 'string-strip-html'
import wordsCounter from 'word-counting'

const DELAY_BASE = 1500
const DELAY_PER_CHAR = 30
const DELAY_PER_CHAR_MAX = 8000
const DELAY_PER_WORD = 300

const estimateDuration = text => {
  text = stripHtml(text).result
  return (
    DELAY_BASE +
    Math.max(
      Math.min(text.length * DELAY_PER_CHAR, DELAY_PER_CHAR_MAX),
      wordsCounter(text).wordsCount * DELAY_PER_WORD
    )
  )
}

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
      selectedOption: null,
      continued: false,
      timeout: false,
    }
  },

  computed: {
    textClass() {
      const result = {
        'px-7': true,
        'py-1': true,
        'oeos-text-standard': true,
      }
      result[`text-${this.align}`] = true
      return result
    },
    showButton() {
      return this.active && (this.isPause || (!this.noPause && this.allowSkip))
    },
    isPause() {
      return this.mode === 'pause'
    },
    mode() {
      return (this.value && this.value.mode) || 'instant'
    },
    noPause() {
      return this.mode === 'instant'
    },
    allowSkip() {
      return this.value.allowSkip || this.noPause || this.value.isAuto
    },
    onContinue() {
      return typeof this.value.onContinue === 'function'
        ? this.value.onContinue
        : () => {}
    },
    align() {
      return this.value.align || 'center'
    },
    filteredLabel() {
      return this.value.label
    },
    duration() {
      const mode = this.mode
      if (mode === 'autoplay') {
        return estimateDuration(this.filteredLabel)
      } else {
        return this.value.duration
      }
    },
  },

  mounted() {
    if (this.noPause) {
      this.continue()
    } else {
      if (this.mode !== 'pause') {
        const duration = this.duration || 0
        this.timeout = setTimeout(() => {
          this.continue()
        }, duration)
      }
    }
    this.$emit('ready', this.$refs.rootElement.$el)
  },

  beforeUnmount() {
    this.stopTimeout()
  },

  methods: {
    continue() {
      if (!this.active) return
      this.stopTimeout()
      this.onContinue()
    },
    onClick(event) {
      if (
        this.active &&
        (this.allowSkip || this.isPause || (this.isDebug && !this.noPause))
      ) {
        if (event && event.stopPropagation) event.stopPropagation()
        this.onContinue()
      }
    },
    stopTimeout() {
      clearTimeout(this.timeout)
    },
  },
}
</script>

<style>
.oeos-say-bubble {
  transition: background-color 0.25s ease;
  font-family: 'Noto Sans', sans-serif;
  border-radius: 12px !important;
}
</style>
