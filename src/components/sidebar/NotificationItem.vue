<template>
  <v-card
    ref="rootElement"
    style="background-color: rgba(30,30,30,0.50); min-width: 100px;  text-align: center; margin-bottom: 5px"
  >
    <v-card-text
      ref="labelHtml"
      class="oeos-clickable oeos-text-standard oeos-nt pa-1 ma-0"
    >
      <div v-if="title" class="oeos-nt-title" v-html="filteredTitle"></div>
      <div v-if="buttonLabel" class="oeos-nt-button">
        <v-btn
          class="custom-transform-class text-none px-2"
          @click.stop="onClick"
          small
          v-html="filteredButtonLabel"
        ></v-btn>
      </div>
      <div
        v-if="duration"
        ref="countdown"
        class="oeos-nt-countdown"
        :style="cssVars"
        v-resize="countdownResize"
      >
        <!-- <div class="countdown-number">{{ formattedTimeLeft }}</div> -->
        <div class="oeos-nt-countdown-line">
          <div></div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
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
      countdownSize: 100,
    }
  },

  computed: {
    cssVars() {
      return {
        '--cd-dasharray': this.dasharray + 'px',
        '--cd-width': this.countdownSize + 'px',
        '--cd-stroke-width': this.strokeWidth + 'px',
        '--cd-stroke-time': this.duration + 'ms',
        '--cd-line-length': this.countdownSize + 'px',
        width: '100%',
        'min-width': this.size + 'px',
      }
    },
    lineRadius() {
      return Math.floor(this.size / 2 - this.strokeWidth)
    },
    dasharray() {
      return Math.floor(2 * Math.PI * this.lineRadius)
    },
    filteredButtonLabel() {
      return this.buttonLabel
    },
    filteredTitle() {
      return this.title
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
    this.countdownResize()
    this.startTimer()
    this.$emit('ready', this.$refs.rootElement.$el)
  },

  beforeDestroy() {
    this.clearTimers()
  },

  beforeUnmount() {
    this.clearTimers()
  },

  methods: {
    countdownResize() {
      if (this.$refs.countdown) {
        this.countdownSize = this.$refs.countdown.clientWidth
      }
    },
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

.oeos-nt-title,
.oeos-nt-button {
  margin-left: auto;
  margin-right: auto;
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
