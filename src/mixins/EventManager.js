import eventsCode from '!!raw-loader!../interpreter/code/events.js'

export default {
  data: () => ({}),
  methods: {
    installEventManager(interpreter, globalObject) {
      interpreter.appendCode(eventsCode)
      interpreter.run()
    },
    buildEventObject({
      type,
      timeStamp = Date.now(),
      eventClass = 'Event',
      value,
    }) {
      const interpreter = this.interpreter
      const eventProto = interpreter.globalObject.properties[eventClass]
      const event = interpreter.createObjectProto(eventProto)
      if (!(value instanceof this.Interpreter.Object)) {
        value = interpreter.nativeToPseudo(value)
      }
      interpreter.setProperty(event, 'type', type)
      interpreter.setProperty(event, 'cancelable', false)
      interpreter.setProperty(event, 'value', value)
      interpreter.setProperty(event, 'timeStamp', timeStamp)
      return event
    },
    dispatchEvent(eventObj) {
      const interpreter = this.interpreter
      const eventTarget = interpreter.globalObject.properties['EventTarget']
      const target = eventObj.target
      if (!interpreter.isa(target, eventTarget)) {
        throw new TypeError('tried to dispatch an event on a non-EventTarget')
      }
      const event = this.buildEventObject(eventObj)
      const dispatchFunc = interpreter.getProperty(target, 'dispatchEvent')
      interpreter.queueFunction(dispatchFunc, target, event)
      interpreter.run()
      return interpreter.value
    },
    doEventCallbackFuncs(funcs, eventObj) {
      const interpreter = this.interpreter
      const event = this.buildEventObject(eventObj)
      const target = eventObj.target || this.pagesInstance
      let func = funcs.shift()
      while (func) {
        interpreter.queueFunction(func, target, event)
        func = funcs.shift()
      }
      interpreter.run()
    },
  },
}
