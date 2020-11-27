<template>
  <div v-if="!isHidden" class="oeos-countdown" :style="cssVars">
    <div class="oeos-countdown-number">{{ formattedTimeLeft }}</div>
    <svg
      :class="{
        'oeos-countdown-line': true,
        spin: isSecret,
      }"
    >
      <circle :r="lineRadius" :cx="size / 2" :cy="size / 2"></circle>
    </svg>
  </div>
</template>

<script>
export default {
  props: {
    duration: {
      type: Number,
      default: 30000,
    },
    size: {
      type: Number,
      default: 100,
    },
    strokeWidth: {
      type: Number,
      default: 6,
    },
    isDebug: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'normal',
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
    isSecret() {
      return this.type === 'secret'
    },
    isHidden() {
      return this.type === 'hidden'
    },
    cssVars() {
      return {
        '--cd-dasharray': this.dasharray + 'px',
        '--cd-spinnersize': this.dasharray - this.dasharray / 4 + 'px',
        '--cd-width': this.size + 'px',
        '--cd-stroke-width': this.strokeWidth + 'px',
        '--cd-stroke-time': this.duration + 'ms',
      }
    },
    lineRadius() {
      return Math.floor(this.size / 2 - this.strokeWidth)
    },
    dasharray() {
      return Math.floor(2 * Math.PI * this.lineRadius)
    },
    formattedTimeLeft() {
      if (this.isSecret) return '?'
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
      this.startTime = Date.now()
      this.timeout = setTimeout(() => {
        this.onTimesUp()
      }, this.duration)
      this.timerInterval = setInterval(() => {
        if (!this.running) return
        this.checkTimer()
      }, 250)
      this.checkTimer()
      this.running = true
    },
  },
}
</script>

<style scoped lang="scss">
.oeos-countdown {
  position: relative;
  margin: auto;
  margin-top: 10px;
  height: var(--cd-width);
  width: var(--cd-width);
  text-align: center;
}

.oeos-countdown-number {
  color: white;
  display: inline-block;
  line-height: var(--cd-width);
}

.oeos-countdown-line {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--cd-width);
  height: var(--cd-width);
  transform: rotateY(-180deg) rotateZ(-90deg);
}

.oeos-countdown-line.spin {
  animation: oeos-spin 3s linear infinite forwards;
}

.oeos-countdown-line circle {
  stroke-dasharray: var(--cd-dasharray);
  stroke-dashoffset: 0px;
  stroke-linecap: round;
  stroke-width: var(--cd-stroke-width);
  stroke: red;
  fill: none;
}

.oeos-countdown-line:not(.spin) circle {
  animation: oeos-countdown var(--cd-stroke-time) linear 1 forwards;
}

.oeos-countdown-line.spin circle {
  stroke-dashoffset: var(--cd-spinnersize);
}

@keyframes oeos-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes oeos-countdown {
  from {
    stroke-dashoffset: 0px;
  }
  to {
    stroke-dashoffset: var(--cd-dasharray);
  }
}
</style>