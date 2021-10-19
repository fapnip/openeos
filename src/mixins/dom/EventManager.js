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

const cloneableProperties = {
  isTrusted: true,
  eventPhase: true,
  altKey: true,
  button: true,
  buttons: true,
  clientX: true,
  clientY: true,
  ctrlKey: true,
  metaKey: true,
  movementX: true,
  movementY: true,
  offsetX: true,
  pageX: true,
  pageY: true,
  screenX: true,
  screenY: true,
  shiftKey: true,
  animationName: true,
  elapsedTime: true,
  pseudoElement: true,
  code: true,
  isComposing: true,
  key: true,
  location: true,
  repeat: true,
}

export default {
  data: () => ({}),
  methods: {
    hasEventListeners(target, type) {
      return (
        getTypeListeners(target, type).size > 0 || target['__evt_on' + type]
      )
    },
    installEventManager(interpreter, globalObject) {
      const NONENUMERABLE_DESCRIPTOR = this.Interpreter.NONENUMERABLE_DESCRIPTOR
      const vue = this
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
          this._defaultPrevented = true
          interpreter.setProperty(this, 'defaultPrevented ', true)
        }
      )

      function addEventListener(type, listener, options) {
        const listeners = getTypeListeners(this, type)
        const _this = this
        if (listener) listeners.set(listener, options || {})
        if (this._hookNative && this._o_el) {
          const nativeFnType = '_hookNativeFn_' + type
          if (!this[nativeFnType]) {
            this[nativeFnType] = e => {
              const pseudoEvent = vue.buildElementEvent(_this, e)
              if (vue.hasEventListeners(_this, e.type)) {
                // Dispatch pseudo events, if any
                // console.log('Dispatching event', pseudoEvent, e)
                vue.dispatchPseudoEvent(pseudoEvent, _this, e)
              }
            }
          }
          if (vue.hasEventListeners(this, type)) {
            this._o_el.addEventListener(type, this[nativeFnType])
          } else {
            this._o_el.removeEventListener(type, this[nativeFnType])
          }
        }
      }

      function removeEventListener(type, listener) {
        const listeners = getTypeListeners(this, type)
        listeners.delete(listener)
        if (this._hookNative && this._o_el) {
          const nativeFnType = '_hookNativeFn_' + type
          if (this[nativeFnType] && !vue.hasEventListeners(this, type)) {
            this._o_el.removeEventListener(type, this[nativeFnType])
          }
        }
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

        const onFunc = _this['__evt_on' + type]
        let didOn = !onFunc

        const callChain = listeners => {
          let listener
          if (!didOn) {
            listener = onFunc
            didOn = true
          } else {
            listener = listeners.next()
          }
          if (listener && !listener.done && !event._stopImmediatePropagation) {
            const listenerFunc = listener.value[0]
            const listenerOpts = listener.value[1]
            // console.log('Calling', listenerFunc)
            return interpreter
              .callFunction(listenerFunc, _this, event)
              .then(() => {
                if (listenerOpts.once)
                  getTypeListeners(_this, type).delete(listenerFunc)
                return callChain(listeners)
              })
              .catch(error => {
                if (error && error.properties && error.properties.stack) {
                  console.error(error.properties.stack)
                } else {
                  console.error(error)
                }
                if (listenerOpts.once)
                  getTypeListeners(_this, type).delete(listenerFunc)
                return callChain(listeners)
              })
          }
          return !event._defaultPrevented
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
    buildElementEvent(target, e) {
      const rect = e.target.getBoundingClientRect()
      const x = e.clientX - rect.left //x position within the element.
      const y = e.clientY - rect.top //y position within the element.
      const interpreter = this.interpreter
      const eventFunc = interpreter.globalObject.properties['Event'] // TODO: build real event classes
      const event = interpreter.createObjectProto(
        eventFunc.properties['prototype']
      )
      for (const [key, value] of Object.entries(e)) {
        const cloneMode = cloneableProperties[key]
        if (cloneMode === true) {
          interpreter.setProperty(event, key, value)
        } else if (cloneMode === 1) {
          interpreter.setProperty(event, key, interpreter.nativeToPseudo(value))
        }
      }
      interpreter.setProperty(event, 'type', e.type)
      interpreter.setProperty(event, 'cancelable', false)
      interpreter.setProperty(event, 'target', target)
      interpreter.setProperty(
        event,
        'value',
        interpreter.nativeToPseudo({
          x: x / e.target.clientWidth, // between 0 and 1, where clicked
          y: y / e.target.clientHeight, // between 0 and 1, where clicked
        })
      )
      interpreter.setProperty(
        event,
        'timeStamp',
        e.timeStamp + performance.timing.navigationStart
      )
      return event
    },
    dispatchEvent(eventObj, originatingEvent) {
      const interpreter = this.interpreter
      const target = eventObj.target
      if (!interpreter.isa(target, eventTarget)) {
        console.warn('Bad Target', target, eventObj)
        throw new TypeError('tried to dispatch an event on a non-EventTarget')
      }
      const event = this.buildEventObject(eventObj)
      return this.dispatchPseudoEvent(event, target, originatingEvent)
    },
    dispatchPseudoEvent(pseudoEvent, target, originatingEvent) {
      const interpreter = this.interpreter
      const dispatchFunc = interpreter.getProperty(target, 'dispatchEvent')
      interpreter.queueFunction(dispatchFunc, target, pseudoEvent)
      interpreter.run()
      return this.handleEventResult(pseudoEvent, originatingEvent)
    },
    handleEventResult(event, originatingEvent) {
      if (originatingEvent) {
        if (event._stopPropagation) {
          originatingEvent.stopPropagation()
        }
        if (event._stopImmediatePropagation) {
          originatingEvent.stopImmediatePropagation()
        }
        if (event._defaultPrevented) {
          originatingEvent.preventDefault()
        }
      }
      return event
    },
    doEventCallbackFuncs(funcs, eventObj) {
      const interpreter = this.interpreter
      const event = this.buildEventObject(eventObj)
      const target = eventObj.target || this.pagesInstance()
      let func = funcs.shift()
      while (func) {
        interpreter.queueFunction(func, target, event)
        func = funcs.shift()
      }
      interpreter.run()
    },
  },
}
