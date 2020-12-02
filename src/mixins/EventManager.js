import eventsCode from '!!raw-loader!../interpreter/code/events.js'

export default {
  data: () => ({}),
  methods: {
    installEventManager(interpreter, globalObject) {
      interpreter.appendCode(eventsCode)
      interpreter.run()
    },
    dispatchEvent({
      target,
      type,
      timeStamp = Date.now(),
      eventClass = 'Event',
      value,
    }) {
      const interpreter = this.interpreter
      const eventTarget = interpreter.globalObject.properties['EventTarget']
      if (!interpreter.isa(target, eventTarget)) {
        throw new TypeError('tried to dispatch an event on a non-EventTarget')
      }
      const eventProto = interpreter.globalObject.properties[eventClass]
      if (!(value instanceof this.Interpreter.Object)) {
        value = interpreter.nativeToPseudo(value)
      }
      const dispatchFunc = interpreter.getProperty(target, 'dispatchEvent')
      const event = interpreter.createObjectProto(eventProto)
      interpreter.setProperty(event, 'type', type)
      interpreter.setProperty(event, 'cancelable', false)
      interpreter.setProperty(event, 'value', value)
      interpreter.setProperty(event, 'timeStamp', timeStamp)
      interpreter.queueFunction(dispatchFunc, target, event)
      interpreter.run()
      return interpreter.value
    },
  },
}
