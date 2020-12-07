let eventTarget

function getTypeListeners(target, type) {
  let listeners = target.listeners
  if (!listeners) {
    listeners = {}
    target.listeners = listeners
  }
  let typeListeners = listeners[type]
  if (!typeListeners) {
    typeListeners = new Map()
    listeners[type] = typeListeners
  }
  return typeListeners
}

export default {
  data: () => ({}),
  methods: {
    hasEventListeners(target, type) {
      return getTypeListeners(target, type).size > 0
    },
    installEventManager(interpreter, globalObject) {
      const NONENUMERABLE_DESCRIPTOR = this.Interpreter.NONENUMERABLE_DESCRIPTOR

      eventTarget = interpreter.createNativeFunction(() => {}, true)
      const eventTargetProto = interpreter.getProperty(eventTarget, 'prototype')
      interpreter.setProperty(globalObject, 'EventTarget', eventTarget)

      const eventFunc = interpreter.createNativeFunction(function(type, value) {
        const event = interpreter.createObjectProto(eventFunc)
        interpreter.setProperty(event, 'type', type)
        interpreter.setProperty(event, 'cancelable', false)
        interpreter.setProperty(event, 'value', value)
        interpreter.setProperty(event, 'timeStamp', Date.now())
        return event
      }, true)
      interpreter.setProperty(globalObject, 'Event', eventFunc)

      interpreter.setNativeFunctionPrototype(
        eventFunc,
        'stopImmediatePropagation',
        function() {
          this._stopImmediatePropagation = true
        }
      )

      interpreter.setNativeFunctionPrototype(
        eventFunc,
        'stopPropagation',
        function() {
          this._stopPropagation = true
        }
      )

      interpreter.setNativeFunctionPrototype(
        eventFunc,
        'preventDefault',
        function() {
          interpreter.setProperty(this, 'defaultPrevented ', true)
        }
      )

      function addEventListener(type, listener) {
        const listeners = getTypeListeners(this, type)
        listeners.set(listener, true)
        console.log('addEventListener', listeners, this)
      }

      function removeEventListener(type, listener) {
        const listeners = getTypeListeners(this, type)
        listeners.delete(listener)
        console.log('removeEventListener', listeners)
      }

      function dispatchEvent(event) {
        if (!event) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'parameter 1 is not of type "Event"'
          )
        }
        const _this = this
        const type = interpreter.getProperty(event, 'type')
        const listeners = getTypeListeners(_this, type).keys()

        const callChain = listeners => {
          const listener = listeners.next()
          if (!listener.done && !event._stopImmediatePropagation) {
            return interpreter
              .callFunction(listener.value, _this, event)
              .then(() => callChain(listeners))
          }
          return !interpreter.getProperty(event, 'defaultPrevented')
        }
        return callChain(listeners)
      }

      interpreter.setProperty(
        eventTargetProto,
        'addEventListener',
        interpreter.createNativeFunction(addEventListener),
        NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        eventTargetProto,
        'removeEventListener',
        interpreter.createNativeFunction(removeEventListener),
        NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        eventTargetProto,
        'dispatchEvent',
        interpreter.createNativeFunction(dispatchEvent),
        NONENUMERABLE_DESCRIPTOR
      )
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
      const target = eventObj.target
      if (!interpreter.isa(target, eventTarget)) {
        throw new TypeError('tried to dispatch an event on a non-EventTarget')
      }
      const event = this.buildEventObject(eventObj)
      const dispatchFunc = interpreter.getProperty(target, 'dispatchEvent')
      interpreter.queueFunction(dispatchFunc, target, event)
      interpreter.run()
      return event
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
