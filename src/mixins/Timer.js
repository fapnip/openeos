import { parseEosDuration } from '../util'

let idCounter = 0

export default {
  data: () => ({
    timers: [],
  }),
  methods: {
    purgePageTimers() {
      for (let i = this.timers.length - 1; i >= 0; i--) {
        if (!this.timers[i].persist) {
          this.timers.splice(i, 1)
        }
      }
    },
    removeTimer(timerId) {
      if (!timerId) return
      this.timers = this.timers.filter(t => t.id !== timerId)
    },
    getTimerById(timerId) {
      return this.timers.find(t => t.id === timerId)
    },
    installTimer(interpreter, globalObject) {
      const vue = this
      const constructor = function(opt) {
        const optProps = opt.properties
        let timerId = '__timer_' + ++idCounter
        console.log('Creating timer')
        const pseudoItem = interpreter.createObjectProto(proto)
        const timer = {}
        timer.pseudoItem = () => pseudoItem
        pseudoItem._item = timer
        for (var i in optProps) {
          // Copy source props to our new timer
          const pseudoVal = optProps[i]
          if (pseudoVal instanceof vue.Interpreter.Object) {
            // Convert Interpreter objects to native
            timer[i] = interpreter.pseudoToNative(pseudoVal)
          } else if (typeof pseudoVal === 'object') {
            // Copy other objects as-is
            // timer[i] = pseudoVal
          } else {
            // Make other props reactive
            vue.$set(timer, i, pseudoVal)
          }
          // interpreter.setProperty(timer, i, pseudoVal)
        }
        // interpreter.setProperty(timer, 'id', timerId)
        const duration = parseEosDuration(timer.duration)
        timer.duration = duration
        timer.timeLeft = duration
        timer.loop = 0
        timer.id = timerId
        timer.onTimeout = () => {
          if (optProps.onTimeout) {
            // onTimeout callback provided by interperted code
            // (interpreter has been doing other things while our timer was running)
            interpreter.queueFunction(optProps.onTimeout, timer)
            vue.removeTimer(timer.id)
            interpreter.run()
          }
          if (optProps.onContinue) {
            interpreter.queueFunction(optProps.onContinue, timer)
            vue.removeTimer(timer.id)
            interpreter.run()
          }
        }
        timer.onLoop = () => {
          if (optProps.onTimeout) {
            // onTimeout callback provided by interperted code
            // (interpreter has been doing other things while our timer was running)
            interpreter.queueFunction(optProps.onTimeout, timer)
            interpreter.run()
          }
        }
        timer.onUpdate = ({ remaining, loop }) => {
          timer.loop = loop
          timer.remaining = remaining
        }
        timer.ready = el => {
          timer._o_el = el
          if (optProps.ready) {
            interpreter.queueFunction(
              optProps.ready,
              pseudoItem,
              this.getHTMLElementPseudo(el, true)
            )
            interpreter.run()
          }
        }
        console.log('Adding timer', timer)
        vue.timers.push(timer)
        return timer
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      interpreter.setProperty(
        manager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
      const proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'Timer', manager)

      interpreter.setProperty(
        manager,
        'get',
        interpreter.createNativeFunction(id => {
          if (typeof id !== 'string') {
            throw new TypeError('id must be a string')
          }
          return this.getTimerById(id.pseudoItem())
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setNativeFunctionPrototype(manager, 'getElement', function() {
        return vue.getHTMLElementPseudo(this._item._o_el, true)
      })

      interpreter.setProperty(
        manager,
        'getAll',
        interpreter.createNativeFunction(() => {
          return interpreter.arrayNativeToPseudo(Object.keys(this.timers))
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setNativeFunctionPrototype(manager, 'stop', function() {
        vue.removeTimer(this._item.id)
      })

      interpreter.setNativeFunctionPrototype(manager, 'getId', function() {
        return this._item.id
      })

      interpreter.setNativeFunctionPrototype(
        manager,
        'getRemaining',
        function() {
          return this.remaining
        }
      )

      interpreter.setNativeFunctionPrototype(manager, 'getLoop', function() {
        return this._item.loop
      })

      interpreter.setNativeFunctionPrototype(manager, 'getLoops', function() {
        return this._item.loops
      })
    },
  },
}
