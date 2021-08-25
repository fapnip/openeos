<template>
  <div
    ref="rootElement"
    v-show="!isHidden || isDebug"
    :class="{
      'oeos-countdown': true,
      'oeos-paused': paused,
      'oeos-hidden-timer': isHidden,
    }"
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
    <div class="oeos-countdown-skip">
      <v-btn v-if="isDebug" elevation="1" x-small @click="onTimesUp"
        >skip</v-btn
      >
    </div>
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
    pauseColor: {
      type: String,
      default: 'rgba(142, 142, 142, 0.7)',
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
    paused: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      running: false,
      timePassed: 0,
      startTime: 0,
      startPause: 0,
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
        '--cd-stroke-pause-color': this.pauseColor,
        '--cd-bg-color': this.background,
        '--cd-stroke-play-state': this.paused ? 'paused' : 'running',
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
      if (this.paused) return
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

    startTimer(skipInit) {
      if (!skipInit) {
        this.timePassed = 0
        this.startTime = Date.now()
      }
      this.timeout = setTimeout(() => {
        this.onTimesUp()
      }, this.duration - (Date.now() - this.startTime))
      this.timerInterval = setInterval(() => {
        if (!this.running) return
        this.checkTimer()
      }, 250)
      this.checkTimer()
      this.running = true
      if (this.paused) {
        this.startPause = Date.now()
      }
    },
  },
  watch: {
    paused(v, ov) {
      if (v && !ov) {
        // Was just paused
        this.startPause = Date.now()
        this.clearTimers()
      }
      if (!v && ov) {
        // Was just un-paused
        if (this.startPause) {
          var pausedFor = Date.now() - this.startPause
          this.startTime += pausedFor
          this.startPause = 0
        }
        this.startTimer(true)
      }
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
  pointer-events: auto;
}

.oeos-countdown-number {
  color: white;
  display: inline-block;
  line-height: var(--cd-width);
  font-size: 1.2em;
  text-shadow: 0px 0px 4px black, 0px 0px 4px black;
}

.oeos-hidden-timer {
  height: auto;
}

.oeos-hidden-timer .oeos-countdown-number {
  line-height: 100%;
}

.oeos-countdown-skip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 50%);
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
  transition: stroke 1s;
  stroke-dasharray: var(--cd-dasharray);
  stroke-dashoffset: 0px;
  stroke-linecap: round;
  stroke-width: var(--cd-stroke-width);
  stroke: var(--cd-stroke-color);
  fill: none;
}

.oeos-paused .oeos-countdown-line circle {
  stroke: var(--cd-stroke-pause-color);
}

.oeos-countdown-line:not(.spin) circle {
  animation: oeos-countdown var(--cd-stroke-time) linear 1 forwards;
  animation-play-state: var(--cd-stroke-play-state);
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
