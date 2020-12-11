const timeouts = {}
let timeoutCounter = 0

const intervals = {}
let intervalCounter = 0

const frames = {}
let frameCounter = 0

function cancelAll(timers, fn) {
  const keys = Object.keys(timers)
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i]
    fn(timers[key])
    delete timers[key]
  }
}

export default {
  data: () => ({}),

  beforeDestroy() {
    cancelAll(timeouts, t => {
      clearTimeout(t)
    })
    cancelAll(intervals, t => {
      clearInterval(t)
    })
    cancelAll(frames, t => {
      cancelAnimationFrame(t)
    })
  },

  methods: {
    installNativeTimers(interpreter, globalObject) {
      const runFunction = (fn, _this) => {
        interpreter.queueFunction(fn, _this)
        interpreter.run()
      }
      interpreter.setProperty(
        globalObject,
        'setTimeout',
        interpreter.createNativeFunction(function(fn, time) {
          const tid = ++timeoutCounter
          const _this = this
          timeouts[tid] = setTimeout(function() {
            if (timeouts[tid]) {
              delete timeouts[tid]
              runFunction(fn, _this)
            }
          }, time)
          return tid
        })
      )
      interpreter.setProperty(
        globalObject,
        'clearTimeout',
        interpreter.createNativeFunction(tid => {
          clearTimeout(timeouts[tid])
          delete timeouts[tid]
          interpreter.run()
        })
      )

      interpreter.setProperty(
        globalObject,
        'setInterval',
        interpreter.createNativeFunction(function(fn, time) {
          const tid = ++intervalCounter
          const _this = this
          intervals[tid] = setInterval(function() {
            runFunction(fn, _this)
          }, time)
          return tid
        })
      )
      interpreter.setProperty(
        globalObject,
        'clearInterval',
        interpreter.createNativeFunction(tid => {
          clearInterval(intervals[tid])
          delete intervals[tid]
          interpreter.run()
        })
      )

      interpreter.setProperty(
        globalObject,
        'requestAnimationFrame',
        interpreter.createNativeFunction(function(fn, time) {
          const tid = ++frameCounter
          const _this = this
          frames[tid] = requestAnimationFrame(function() {
            if (frames[tid]) {
              delete frames[tid]
              runFunction(fn, _this)
            }
          }, time)
          return tid
        })
      )
      interpreter.setProperty(
        globalObject,
        'cancelAnimationFrame',
        interpreter.createNativeFunction(tid => {
          cancelAnimationFrame(frames[tid])
          delete frames[tid]
        })
      )
    },
  },
}
