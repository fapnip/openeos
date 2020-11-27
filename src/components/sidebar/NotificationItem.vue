<template>
  <div class="oeos-nt">
    <div v-if="title" class="oeos-nt-title">
      {{ filteredTitle }}
    </div>
    <div v-if="buttonLabel" class="oeos-nt-button">
      <v-btn
        small
        class="custom-transform-class text-none"
        @click.stop="onClick"
        >{{ filteredButtonLabel }}</v-btn
      >
    </div>
    <div v-if="duration" class="oeos-nt-countdown" :style="cssVars">
      <!-- <div class="countdown-number">{{ formattedTimeLeft }}</div> -->
      <div class="oeos-nt-countdown-line">
        <div></div>
      </div>
    </div>
  </div>
</template>

<script>
import markupFilter from '../../util/markupFilter'

export default {
  props: {
    duration: {
      type: Number,
      default: 0,
    },
    size: {
      type: Number,
      default: 100,
    },
    strokeWidth: {
      type: Number,
      default: 1,
    },
    isDebug: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'normal',
    },
    title: {
      type: String,
      default: null,
    },
    buttonLabel: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      running: false,
      timePassed: 0,
      startTime: 0,
      timerInterval: null,
      timeout: null,
    }
  },

  computed: {
    cssVars() {
      return {
        '--cd-dasharray': this.dasharray + 'px',
        '--cd-width': this.size + 'px',
        '--cd-stroke-width': this.strokeWidth + 'px',
        '--cd-stroke-time': this.duration + 'ms',
        '--cd-line-length': this.size + 'px',
      }
    },
    lineRadius() {
      return Math.floor(this.size / 2 - this.strokeWidth)
    },
    dasharray() {
      return Math.floor(2 * Math.PI * this.lineRadius)
    },
    filteredButtonLabel() {
      return markupFilter(this.buttonLabel)
    },
    filteredTitle() {
      return markupFilter(this.title)
    },
    formattedTimeLeft() {
      const timeLeft = this.timeLeft / 1000
      const minutes = Math.floor(timeLeft / 60)
      let seconds = Math.ceil(timeLeft % 60)
      if (seconds < 0) seconds = 0
      if (this.duration / 1000 < 60) {
        return seconds
      }

      if (seconds < 10) {
        seconds = `0${seconds}`
      }

      return `${minutes}:${seconds}`
    },
    timeLeft() {
      return this.duration - this.timePassed
    },
  },

  mounted() {
    this.startTimer()
  },

  beforeUnmount() {
    this.clearTimers()
  },

  methods: {
    clearTimers() {
      clearInterval(this.timerInterval)
      clearTimeout(this.timeout)
    },

    onTimesUp() {
      this.clearTimers()
      if (this.running) {
        this.$emit('timeout')
        this.running = false
      }
    },

    onClick() {
      this.clearTimers()
      if (this.running) {
        this.$emit('button-click')
        this.running = false
      }
    },

    checkTimer() {
      let t = Date.now() - this.startTime
      if (t >= this.duration) {
        t = this.duration
        clearInterval(this.timerInterval)
      }
      if (t !== this.timePassed) {
        this.timePassed = t
      }
    },

    startTimer() {
      if (this.duration) {
        this.startTime = Date.now()
        this.timeout = setTimeout(() => {
          this.onTimesUp()
        }, this.duration)
        this.timerInterval = setInterval(() => {
          if (!this.running) return
          this.checkTimer()
        }, 250)
        this.checkTimer()
      }
      this.running = true
    },
  },
}
</script>

<style scoped lang="scss">
.oeos-nt-countdown {
  position: relative;
  margin: auto;
  margin-top: 10px;
  height: var(--cd-width);
  height: var(--cd-stroke-width);
  text-align: center;
}

.oeos-nt-countdown-number {
  color: white;
  display: inline-block;
  line-height: var(--cd-width);
}

.oeos-nt-countdown-line {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--cd-width);
  height: var(--cd-stroke-width);
}

.oeos-nt-countdown-line div {
  // position: absolute;
  // top: 0;
  // left: 0;
  height: var(--cd-stroke-width);
  background: red;
  transform-origin: left;
  animation: oeos-nt-countdown var(--cd-stroke-time) linear 1 forwards;
}

@keyframes oeos-nt-countdown {
  from {
    width: 0px;
  }
  to {
    width: var(--cd-line-length);
  }
}
</style>
