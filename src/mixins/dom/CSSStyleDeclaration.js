const elements = new WeakMap()
let proto
const cssProperties = {}

export default {
  data: () => ({
    hasBackdropFilter: false,
  }),
  methods: {
    hasCssProperty(prop) {
      return cssProperties[prop]
    },
    getCSSStyleDeclarationProto() {
      return proto
    },
    getCSSStyleDeclarationPseudo(native) {
      if (!native) return
      let pseudo = elements.get(native)
      if (!pseudo) {
        pseudo = this.interpreter.createObjectProto(proto)
        pseudo._o_sd = native
        elements.set(native, pseudo)
      }
      return pseudo
    },
    installCSSStyleDeclaration(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        return interpreter.createObjectProto(proto)
      }
      const manager = interpreter.createNativeFunction(constructor, true)
      proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'CSSStyleDeclaration', manager)

      // length/value
      ;['length', 'value'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_sd[name]
        })
      })

      // Style
      ;['cssText'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_sd[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(style) {
          this._o_sd[name] = vue.sanitizeStyle(style)
        })
      })

      // Return pseudo val from native function
      ;['toString'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function() {
          return this._o_sd.cssText
        })
      })

      // Return pseudo val from native function
      ;[
        'getPropertyPriority',
        'getPropertyValue',
        'item',
        'removeProperty',
      ].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          ...attr
        ) {
          return interpreter.nativeToPseudo(this._o_sd[fnName](...attr))
        })
      })
      // Set value
      ;['setProperty'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          propertyName,
          value,
          priority
        ) {
          try {
            this._o_sd[fnName](propertyName, vue.sanitizeStyle(value), priority)
          } catch (e) {
            return interpreter.createThrowable(interpreter.ERROR, e.toString())
          }
        })
      })

      // Since interpreter doesn't support Proxies, we'll need to create a getter/setter for every style name
      const allStyles = window.getComputedStyle(
        document.getElementsByTagName('body')[0],
        null
      )

      // Override hasOwnProperty
      interpreter.setNativeFunctionPrototype(
        manager,
        'hasOwnProperty',
        function(prop) {
          return allStyles[prop]
            ? Object.hasOwnProperty.call(this._o_sd, prop)
            : Object.hasOwnProperty.call(this.properties, prop)
        }
      )

      // console.log('Style hooks', Object.keys(allStyles), allStyles)

      // Implement getters/setters from all styles
      for (const name in allStyles) {
        if (
          name.match(/^[a-z]/) &&
          name.match(/^[a-z]+$/i) &&
          !Object.hasOwnProperty.call(proto.properties, name) &&
          typeof allStyles[name] === 'string'
        ) {
          // console.log('Adding style hook for', name)
          if (name.match(/backdropFilter$/i)) {
            // console.log('Adding backdropFilter hook for', name)
            vue.hasBackdropFilter = true
          }
          cssProperties[name] = true
          interpreter.setProperty(proto, name, undefined)
          proto.getter[name] = interpreter.createNativeFunction(function() {
            return this._o_sd[name]
          })
          proto.setter[name] = interpreter.createNativeFunction(function(
            style
          ) {
            this._o_sd[name] = vue.sanitizeStyle(style)
          })
        }
      }
    },
  },
}
