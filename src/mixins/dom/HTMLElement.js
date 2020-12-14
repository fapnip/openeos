const elements = new WeakMap()
let proto

export default {
  data: () => ({}),
  methods: {
    getHTMLElementPseudo(el, isRoot) {
      if (!el) return
      let pseudo = elements.get(el)
      if (!pseudo) {
        pseudo = this.interpreter.createObjectProto(proto)
        pseudo._o_el = el
        elements.set(el, pseudo)
        pseudo._isRoot = isRoot
        pseudo._hookNative = true
      }
      return pseudo
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

      // DOMTokenList Using getter
      ;['classList'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)

        proto.getter[name] = interpreter.createNativeFunction(function() {
          return vue.getDOMTokenListPseudo(this._o_el[name])
        })
      })

      // HTMLCollection Using getter
      ;['children', 'childNodes'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)

        proto.getter[name] = interpreter.createNativeFunction(function() {
          return vue.getHTMLCollectionPseudo(this._o_el[name])
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
        if (this._isRoot && name.match(/(^parent|Sibling$)/)) {
          return null
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
          this._o_el[name] = vue.sanitizeSrc(href)
        })
      })

      // html
      ;['innerHTML', 'innerText', 'outerHTML', 'textContent'].forEach(name => {
        if (this._isRoot && name.match(/^outer/)) {
          console.error(`Cannot perform ${name} on root node.`)
          return
        }
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(html) {
          if (this._o_el.tagName === 'SCRIPT') {
            console.error('Modification of SCRIPT node blocked.')
            return
          }
          if (this._o_el.tagName === 'STYLE') {
            html = vue.sanitizeStyle(html)
          }
          this._o_el[name] = vue.sanitizeHtml(html)
          console.log('Set', name, this._o_el[name])
        })
      })

      // URL
      ;['src'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(src) {
          this._o_el[name] = vue.sanitizeSrc(src)
        })
      })

      // Style
      ;['style'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return vue.getCSSStyleDeclarationPseudo(this._o_el[name])
        })
        proto.setter[name] = interpreter.createNativeFunction(function(style) {
          this._o_el[name] = vue.sanitizeStyle(style)
        })
      })

      // native getter abstraction
      ;[
        'childElementCount',
        'scrollHeight',
        'scrollWidth ',
        'tagName',
        'clientHeight',
        'clientLeft',
        'clientTop',
        'clientWidth ',
      ].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function() {
          // read only
        })
      })

      // native getter & setter abstraction
      ;['className', 'id', 'scrollLeft', 'scrollTop'].forEach(name => {
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
          return vue.getDOMTokenListPseudo(this._o_el[name])
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
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          ...attr
        ) {
          return vue.getHTMLCollectionPseudo(this._o_el[fnName](...attr))
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
        'matches',
        'scroll',
        'scrollBy',
        'scrollTo',
        'getAttribute',
        'hasAttribute',
      ].forEach(name => {
        interpreter.setNativeFunctionPrototype(manager, name, function(
          ...attr
        ) {
          return interpreter.nativeToPseudo(this._o_el[name](...attr))
        })
      })

      // Act with element passed
      ;[
        'appendChild',
        'remove',
        'removeChild',
        'replaceChild',
        'insertBefore',
      ].forEach(fnName => {
        if (this._isRoot && fnName.match(/^(insertBefore|remove)/)) {
          console.error(`Cannot perform ${fnName} on root node.`)
          return
        }
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          pseudoEl
        ) {
          console.log('Doing:', fnName, this)
          if (pseudoEl)
            return vue.getHTMLElementPseudo(this._o_el[fnName](pseudoEl._o_el))
          return vue.getHTMLElementPseudo(this._o_el[fnName]())
        })
      })

      // Act with element passed
      ;['contains'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          pseudoEl
        ) {
          return this._o_el[fnName](pseudoEl._o_el)
        })
      })

      // Act with value and element passed
      ;['setAttribute'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          attributeName,
          value
        ) {
          attributeName = attributeName.trim().toLowerCase()
          if (attributeName.match(/^(src|background)$/) === 'src') {
            value = vue.sanitizeSrc(value)
          }
          if (attributeName === 'srcset') {
            value = vue.sanitizeSrcSet(value)
          }
          if (attributeName === 'style') {
            value = vue.sanitizeStyle(value)
          }
          if (
            attributeName.match(
              /^(href|action|data|cite|profile|classid|codebase|formaction|manifest|poster|archive|longdesc|usemap)$/
            )
          ) {
            value = vue.sanitizeHref(value)
          }
          if (attributeName.match(/^on/)) {
            return
          }
          const result = this._o_el[fnName](interpreter.pseudoToNative(value))
          vue.sanitizeHtml(this._o_el)
          return interpreter.nativeToPseudo(result)
        })
      })

      // Act with value and element passed
      ;['insertAdjacentElement'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          val,
          pseudoEl
        ) {
          this._o_el[fnName](val, pseudoEl && pseudoEl._o_el)
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
        'touchcancel',
        'touchend',
        'touchmove',
        'touchstart',
        'scroll',
        'select',
        'transitioncancel',
        'transitionend',
        'transitionstart',
        'transitionrun',
        'blur',
        'focus',
      ].forEach(name => {
        // console.log('Adding event hook', name)
        interpreter.setProperty(proto, 'on' + name, undefined)
        proto.getter['on' + name] = interpreter.createNativeFunction(
          function() {
            return this['__evt_on' + name]
          }
        )
        proto.setter['on' + name] = interpreter.createNativeFunction(function(
          func
        ) {
          if (!func || !func.class === 'Function') {
            this['__evt_on' + name] = undefined
          } else {
            this['__evt_on' + name] = { value: [func, {}] }
          }
          const addEventListenerFunc = interpreter.getProperty(
            this,
            'addEventListener'
          )
          return interpreter.callFunction(addEventListenerFunc, this, name)
        })
      })
    },
  },
}