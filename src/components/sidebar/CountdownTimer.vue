<template>
  <div
    ref="rootElement"
    v-show="!isHidden"
    class="oeos-countdown"
    :style="cssVars"
  >
    <svg
      v-if="!isHidden"
      :class="{
        'oeos-countdown-bg': showLine,
        spin: isSecret,
      }"
    >
      <circle :r="bgRadius" :cx="size / 2" :cy="size / 2"></circle>
    </svg>
    <svg
      v-if="!isHidden"
      :class="{
        'oeos-countdown-line': showLine,
        spin: isSecret,
      }"
    >
      <circle :r="lineRadius" :cx="size / 2" :cy="size / 2"></circle>
    </svg>
    <div class="oeos-countdown-number">{{ formattedTimeLeft }}</div>
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
      default: 120,
    },
    strokeWidth: {
      type: Number,
      default: 8,
    },
    color: {
      type: String,
      default: 'rgba(255, 0, 0, 0.753)',
    },
    background: {
      type: String,
      default: 'rgba(0, 0, 0, 0.25)',
    },
    loops: {
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
  },
  data() {
    return {
      running: false,
      timePassed: 0,
      startTime: 0,
      timerInterval: null,
      timeout: null,
      loopCount: 0,
      showLine: true,
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
        '--cd-stroke-color': this.color,
        '--cd-bg-color': this.background,
      }
    },
    bgRadius() {
      return Math.floor(this.size / 2 - this.strokeWidth)
    },
    lineRadius() {
      return this.bgRadius * 0.85
    },
    dasharray() {
      return Math.floor(2 * Math.PI * this.lineRadius)
    },
    formattedTimeLeft() {
      if (this.isSecret) return '?'
      const timeLeft = Math.ceil(this.timeLeft / 1000)
      const minutes = Math.floor(timeLeft / 60)
      let seconds = Math.floor(timeLeft % 60)
      if (seconds < 0) seconds = 0
      if (minutes < 1) {
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
    this.$emit('ready', this.$refs.rootElement)
  },

  beforeDestroy() {
    this.clearTimers()
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
        this.running = false
        this.loopCount++
        if (this.loops === 0 || this.loopCount < this.loops) {
          this.startTimer()
          this.showLine = false
          setTimeout(() => {
            this.showLine = true
          }, 1)
          this.$emit('loop')
        } else {
          this.$emit('timeout')
        }
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
      this.$emit('update', {
        remaining: this.duration - this.timePassed,
        loop: this.loopCount,
      })
    },

    startTimer() {
      this.timePassed = 0
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

<style lang="scss">
.oeos-countdown {
  position: relative;
  margin: auto;
  margin-top: 20px;
  margin-right: 20px;
  height: var(--cd-width);
  width: var(--cd-width);
  text-align: center;
}

.oeos-countdown-number {
  color: white;
  display: inline-block;
  line-height: var(--cd-width);
  font-size: 1.2em;
  text-shadow: 0px 0px 4px black, 0px 0px 4px black;
}

.oeos-countdown-bg,
.oeos-countdown-line {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--cd-width);
  height: var(--cd-width);
  transform: rotateY(-180deg) rotateZ(-90deg);
}
.oeos-countdown-bg circle {
  // stroke-dasharray: var(--cd-dasharray);
  // stroke-dashoffset: 0px;
  // stroke-linecap: round;
  // stroke-width: var(--cd-stroke-width);
  fill: var(--cd-bg-color);
}

.oeos-countdown-line.spin {
  animation: oeos-spin 5s linear infinite forwards;
}

.oeos-countdown-line circle {
  stroke-dasharray: var(--cd-dasharray);
  stroke-dashoffset: 0px;
  stroke-linecap: round;
  stroke-width: var(--cd-stroke-width);
  stroke: var(--cd-stroke-color);
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
