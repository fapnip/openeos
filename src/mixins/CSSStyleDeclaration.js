const elements = new WeakMap()
let proto

export default {
  data: () => ({}),
  methods: {
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
      // const vue = this
      const constructor = opt => {
        return interpreter.createObjectProto(proto)
      }
      const manager = interpreter.createNativeFunction(constructor, true)
      proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'CSSStyleDeclaration', manager)

      // length
      ;['length'].forEach(name => {
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
          this._o_sd[name] = this.sanitizeStyle(style)
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
            this._o_sd[fnName](
              propertyName,
              this.sanitizeStyle(value),
              priority
            )
          } catch (e) {
            return interpreter.createThrowable(interpreter.ERROR, e.toString())
          }
        })
      })
    },
  },
}
