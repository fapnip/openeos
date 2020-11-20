<template>
  <v-row :align="align" @click="onClick"
    ><div v-html="filteredLabel"></div>
    <v-btn v-if="showButton" icon
      ><v-icon dark class="blinkButton"
        >mdi-arrow-right-drop-circle</v-icon
      ></v-btn
    >
  </v-row>
</template>

<script>
import markupFilter from '../../util/markupFilter'

let timeout = false

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
    }
  },

  computed: {
    showButton() {
      return this.active && !this.noPause && this.allowSkip
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
      return markupFilter(this.value.label)
    },
    duration() {
      const mode = this.mode
      if (mode === 'auto') {
        return 10000
      } else {
        return this.value.duration
      }
    },
  },

  mounted() {
    if (this.noPause) {
      this.continue()
    } else {
      const duration = this.duration || 0
      timeout = setTimeout(() => {
        this.continue()
      }, duration)
    }
  },

  beforeUnmount() {
    clearTimeout(timeout)
  },

  methods: {
    continue() {
      if (!this.active) return
      clearTimeout(timeout)
      this.onContinue()
    },
    onClick(option) {
      if (this.allowSkip) {
        this.onContinue()
      }
    },
  },
}
</script>

<style scoped>
/* Basic button styling */
.blinkButton {
  animation: fadeinout 1.5s linear forwards;
  animation-iteration-count: infinite;
}

@keyframes fadeinout {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
