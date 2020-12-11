const elements = new WeakMap()
let proto

export default {
  data: () => ({}),
  methods: {
    getHTMLElementPseudo(el, isRoot) {
      if (!el) return
      let oeoselement = elements.get(el)
      if (!oeoselement) {
        oeoselement = this.interpreter.createObjectProto(proto)
        oeoselement._o_el = el
        elements.set(el, oeoselement)
        oeoselement._isRoot = isRoot
        // Hook event dispatch
        el.__o_dispatchEvent = el.__o_dispatchEvent || el.dispatchEvent
        el.dispatchEvent = function(e) {
          if (this.hasEventListeners(oeoselement, e.type)) {
            // Dispatch pseudo events, if any
            const pseudoEvent = this.buildElementEvent(oeoselement, e)
            this.dispatchEvent(pseudoEvent, e)
            if (pseudoEvent._stopImmediatePropagation) {
              // Stop Immediate?
              return !pseudoEvent._defaultPrevented
            }
          }
          // Continue on with original native dispatch
          return el.__o_dispatchEvent.call(this, e)
        }
      }
      return oeoselement
    },
    installHTMLElement(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        return interpreter.createObjectProto(proto)
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      interpreter.setProperty(
        manager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
      proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'HTMLElement', manager)

      const _getHTMLElementPseudo = els => {
        const result = []
        for (const el of els) {
          result.push(this.getHTMLElementPseudo(el))
        }
        return result
      }

      // DOMTokenList Using getter
      ;['classList '].forEach(name => {
        interpreter.setProperty(proto, name, undefined)

        proto.getter[name] = interpreter.createNativeFunction(function() {
          return vue.getDOMTokenListPseudo(this._o_el[name])
        })
      })

      // HTMLCollection Using getter
      ;['children', 'childNodes'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)

        proto.getter[name] = interpreter.createNativeFunction(function() {
          return _getHTMLElementPseudo(this._o_el[name])
        })
      })

      // Element Using getter
      ;[
        'firstElementChild',
        'lastElementChild',
        'previousSibling',
        'nextSibling',
        'lastChild',
        'firstChild',
        'parentElement',
        'parentNode',
      ].forEach(name => {
        if (this._isRoot && name.match(/^parent/)) {
          console.error(`Cannot perform ${name} on root node.`)
          return
        }
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return vue.getHTMLElementPseudo(this._o_el[name])
        })
      })

      // href
      ;['href'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(href) {
          this._o_el[name] = this.sanitizeSrc(href)
        })
      })

      // html
      ;['innerHtml', 'innerText', 'outerHtml', 'textContent'].forEach(name => {
        if (this._isRoot && name.match(/^outerHtml/)) {
          console.error(`Cannot perform ${name} on root node.`)
          return
        }
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(html) {
          if (this._o_el.nodeType === 'STYLE') {
            html = this.sanitizeStyle(html)
          }
          this._o_el[name] = this.sanitizeHtml(html)
        })
      })

      // URL
      ;['src'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(src) {
          this._o_el[name] = this.sanitizeSrc(src)
        })
      })

      // Style
      ;['style'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(style) {
          this._o_el[name] = this.sanitizeStyle(style)
        })
      })

      // native getter abstraction
      ;[
        'childElementCount',
        'scrollHeight',
        'scrollLeft',
        'scrollTop',
        'scrollWidth ',
        'tagName',
        'id',
        'className',
        'clientHeight',
        'clientLeft',
        'clientTop',
        'clientWidth ',
      ].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
      })

      // native getter & setter abstraction
      ;['className'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(val) {
          this._o_el[name] = val
        })
      })

      // pseudo getter
      ;['classList'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return interpreter.nativeToPseudo(this._o_el[name])
        })
      })

      // By HTMLCollection
      ;[
        'getElementsByClassName',
        'getElementsByClassName',
        'getElementsByTagName',
        'getElementsByTagNameNS',
        'querySelectorAll',
      ].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(opt) {
          return _getHTMLElementPseudo(this._o_el[fnName](opt))
        })
      })

      // By Element
      ;['querySelector', 'closest', 'cloneNode'].forEach(fnName => {
        if (this._isRoot && name.match(/^cloneNode/)) {
          console.error(`Cannot perform ${name} on root node.`)
          return
        }
        interpreter.setNativeFunctionPrototype(manager, fnName, function(opt) {
          return vue.getHTMLElementPseudo(this._o_el[fnName](opt))
        })
      })

      // Return pseudo val from native function
      ;[
        'getBoundingClientRect',
        'getClientRects',
        'remove',
        'matches',
        'scroll',
        'scrollBy',
        'scrollTo',
      ].forEach(name => {
        interpreter.setNativeFunctionPrototype(manager, name, function(
          ...attr
        ) {
          if (this._isRoot && name.match(/^remove/)) {
            console.error(`Cannot perform ${name} on root node.`)
            return
          }
          return interpreter.nativeToPseudo(this._o_el[name](...attr))
        })
      })

      // Act with element passed
      ;[
        'appendChild',
        'removeChild',
        'replaceChild',
        'insertBefore',
        'contains',
      ].forEach(fnName => {
        if (this._isRoot && name.match(/^insertBefore/)) {
          console.error(`Cannot perform ${name} on root node.`)
          return
        }
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          oeoselement
        ) {
          return interpreter.nativeToPseudo(
            this._el[fnName](oeoselement && oeoselement._o_el)
          )
        })
      })

      // Act with value and element passed
      ;['insertAdjacentElement'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          val,
          oeoselement
        ) {
          return interpreter.nativeToPseudo(
            this._o_el[fnName](val, oeoselement && oeoselement._o_el)
          )
        })
      })

      // in-line event listener setter/getters
      ;[
        'click',
        'keydown',
        'keypress',
        'keyup',
        'mousedown',
        'mouseup',
        'mouseenter',
        'mouseleave',
        'mousemove',
        'mouseout',
        'mouseover',
        'mouseup',
        'scroll',
        'select',
        'transitioncancel',
        'transitionend',
        'transitionstart',
        'transitionrun',
        'blur',
        'focus',
      ].forEach(name => {
        interpreter.setProperty(proto, 'on' + name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this['__evt_on' + name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(func) {
          if (!func || !func.class === 'Function') {
            this['__evt_on' + name] = undefined
            return
          }
          this['__evt_on' + name] = func
        })
      })
    },
  },
}
