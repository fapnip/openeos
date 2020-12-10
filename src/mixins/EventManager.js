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
        const event = interpreter.createObjectProto(
          eventFunc.properties['prototype']
        )
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

      function addEventListener(type, listener, options) {
        const listeners = getTypeListeners(this, type)
        listeners.set(listener, options || {})
      }

      function removeEventListener(type, listener) {
        const listeners = getTypeListeners(this, type)
        listeners.delete(listener)
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
        const listeners = getTypeListeners(_this, type).entries()

        const callChain = listeners => {
          const listener = listeners.next()
          if (!listener.done && !event._stopImmediatePropagation) {
            const listenerFunc = listener.value[0]
            const listenerOpts = listener.value[1]
            return interpreter
              .callFunction(listenerFunc, _this, event)
              .then(() => {
                if (listenerOpts.once)
                  getTypeListeners(_this, type).delete(listenerFunc)
                return callChain(listeners)
              })
              .catch(error => {
                console.error(error)
                if (listenerOpts.once)
                  getTypeListeners(_this, type).delete(listenerFunc)
                return callChain(listeners)
              })
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
      cancelable = false,
      target = null,
      eventClass = 'Event',
      value,
    }) {
      const interpreter = this.interpreter
      const eventFunc = interpreter.globalObject.properties[eventClass]
      const event = interpreter.createObjectProto(
        eventFunc.properties['prototype']
      )
      if (!(value instanceof this.Interpreter.Object)) {
        value = interpreter.nativeToPseudo(value)
      }
      interpreter.setProperty(event, 'type', type)
      interpreter.setProperty(event, 'cancelable', cancelable)
      interpreter.setProperty(event, 'target', target)
      interpreter.setProperty(event, 'value', value)
      interpreter.setProperty(event, 'timeStamp', timeStamp)
      return event
    },
    handleOeosClick(e, oeosCallbackJs, value, target) {
      console.log('handleOeosClick', e, oeosCallbackJs)
      target = target || this.pagesInstance()
      const rect = e.target.getBoundingClientRect()
      const x = e.clientX - rect.left //x position within the element.
      const y = e.clientY - rect.top //y position within the element.
      const interpreter = this.interpreter
      const oeosCallbackFunc = interpreter.getProperty(
        interpreter.globalObject,
        oeosCallbackJs
      )
      if (!oeosCallbackFunc) {
        console.error(
          'Invalid global oeos-click callback function: ',
          oeosCallbackFunc
        )
        return
      }
      const event = this.buildEventObject({
        target: target,
        type: 'oeos-click',
        value: {
          x: x / e.target.clientWidth, // between 0 and 1, where clicked
          y: y / e.target.clientHeight, // between 0 and 1, where clicked
          value: value,
        },
        timeStamp: e.timeStamp + performance.timing.navigationStart,
      })
      interpreter.queueFunction(oeosCallbackFunc, target, event)
      interpreter.run()
      return this.handleEventResult(event, e)
    },
    dispatchEvent(eventObj, originatingEvent) {
      const interpreter = this.interpreter
      const target = eventObj.target
      if (!interpreter.isa(target, eventTarget)) {
        throw new TypeError('tried to dispatch an event on a non-EventTarget')
      }
      const event = this.buildEventObject(eventObj)
      const dispatchFunc = interpreter.getProperty(target, 'dispatchEvent')
      interpreter.queueFunction(dispatchFunc, target, event)
      interpreter.run()
      return this.handleEventResult(event, originatingEvent)
    },
    handleEventResult(event, originatingEvent) {
      if (originatingEvent) {
        if (event._stopPropagation) {
          originatingEvent.stopPropagation()
        }
        if (event._stopImmediatePropagation) {
          originatingEvent.stopImmediatePropagation()
        }
      }
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
