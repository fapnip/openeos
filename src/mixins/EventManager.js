import eventsCode from '!!raw-loader!../interpreter/code/events.js'

export default {
  data: () => ({}),
  methods: {
    installEventManager(interpreter, globalObject) {
      interpreter.appendCode(eventsCode)
      interpreter.run()
    },
    dispatchEvent({ target, type, eventClass = 'Event' }) {
      const interpreter = this.interpreter
      const eventTarget = interpreter.globalObject.properties['EventTarget']
      if (!interpreter.isa(target, eventTarget)) {
        return interpreter.throwException(
          interpreter.TYPE_ERROR,
          'tried to dispatch an event on a non-EventTarget'
        )
      }
      interpreter.setProperty(eventTarget, 'currentTarget', target)
      interpreter.appendCode(
        `EventTarget.currentTarget.dispatchEvent(new ${eventClass}('${type}'))`
      )
      interpreter.run()
      return interpreter.value
    },
    // throwVmException(message) {
    //   const interpreter = this.interpreter
    //   console.log('interpreter.stateStack', interpreter.stateStack)
    //   if (interpreter) throw new TypeError('Die here')
    //   const error = interpreter.createObject(interpreter.ERROR)
    //   interpreter.unwind(this.Interpreter.Completion.THROW, error, undefined)
    //   interpreter.paused_ = false
    //   interpreter.run()
    // },
  },
}
