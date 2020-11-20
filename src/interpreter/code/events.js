function EventTarget() {}

Object.defineProperties(EventTarget.prototype, {
  listeners: {
    get: function() {
      return this._listeners || []
    },
  },
})

EventTarget.prototype.addEventListener = function(type, newListener) {
  var listeners
  var listener

  if (!type || !newListener) return

  if (this._listeners === undefined) {
    this._listeners = {}
  }

  listeners = this._listeners[type]

  if (listeners === undefined) {
    this._listeners[type] = listeners = []
  }

  // eslint-disable-next-line no-extra-boolean-cast
  for (var i = 0; !!(listener = listeners[i]); i++) {
    if (listener === newListener) return
  }

  listeners.push(newListener)
}

EventTarget.prototype.removeEventListener = function(type, oldListener) {
  var listeners
  var listener

  if (!type || !oldListener) {
    return
  }

  if (this._listeners === undefined) return

  listeners = this._listeners[type]

  if (listeners === undefined) return

  // eslint-disable-next-line no-extra-boolean-cast
  for (var i = 0; !!(listener = listeners[i]); i++) {
    if (listener === oldListener) {
      listeners.splice(i, 1)
    }
  }

  if (listeners.length === 0) {
    delete this._listeners[type]
  }
}

EventTarget.prototype.dispatchEvent = function(event) {
  var listeners
  var stopImmediatePropagation = false
  var listener

  if (!event) {
    throw new TypeError('parameter 1 is not of type "Event"')
  }

  event.stopImmediatePropagation = function() {
    stopImmediatePropagation = true
  }

  listeners = (this._listeners || {})[event.type] || []

  // eslint-disable-next-line no-extra-boolean-cast
  for (var i = 0; !!(listener = listeners[i]); i++) {
    if (stopImmediatePropagation) break

    try {
      listener.call(this, event)
    } catch (error) {
      console.error(error)
    }
  }

  return !event.defaultPrevented
}

// eslint-disable-next-line no-unused-vars
function Event(type, value) {
  this.type = type
  this.value = value
  this.timeStamp = Date.now()
  this.cancelable = false
}
