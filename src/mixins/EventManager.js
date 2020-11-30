import eventsCode from '!!raw-loader!../interpreter/code/events.js'

export default {
  data: () => ({}),
  methods: {
    installEventManager(interpreter, globalObject) {
      interpreter.appendCode(eventsCode)
      interpreter.run()
    },
    dispatchEvent({ target, type, eventClass = 'Event', value }) {
      const interpreter = this.interpreter
      const eventTarget = interpreter.globalObject.properties['EventTarget']
      if (!interpreter.isa(target, eventTarget)) {
        throw new TypeError('tried to dispatch an event on a non-EventTarget')
      }
      const eventProto = interpreter.globalObject.properties[eventClass]
      if (!(value instanceof this.Interpreter.Object)) {
        value = interpreter.nativeToPseudo(value)
      }
      // this.type = type
      // this.value = value
      // this.timeStamp = Date.now()
      // this.cancelable = false
      const dispatchFn = interpreter.getProperty(
        target,
        'dispatchEventFromNative'
      )
      const event = interpreter.createObjectProto(eventProto)
      interpreter.setProperty(event, 'type', type)
      interpreter.setProperty(event, 'cancelable', false)
      interpreter.setProperty(event, 'value', value)
      interpreter.queueFunction(dispatchFn, target, event)
      // interpreter.setProperty(eventTarget, 'currentTarget', target)
      // interpreter.appendCode(
      //   `EventTarget.currentTarget.dispatchEvent(new ${eventClass}('${type}'))`
      // )
      interpreter.run()
      return interpreter.value
    },
  },
}
