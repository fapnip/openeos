const elements = new WeakMap()
let proto

export default {
  data: () => ({}),
  methods: {
    getToneJSPseudo(el, isRoot) {
      if (!el) return
      let pseudo = elements.get(el)
      if (!pseudo) {
        pseudo = this.interpreter.createObjectProto(proto)
        pseudo._o_el = el
        elements.set(el, pseudo)
      }
      return pseudo
    },
    installToneJS(interpreter, globalObject) {
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
      interpreter.setProperty(globalObject, 'Tone', manager)

      // DOMTokenList Using getter
      ;['classList'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)

        proto.getter[name] = interpreter.createNativeFunction(function() {
          return vue.getDOMTokenListPseudo(this._o_el[name])
        })
      })

      // Read only properties abstraction
      ;['disposed', 'version'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function() {
          // read only
        })
      })

      // properties abstraction
      ;['debug'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
        proto.setter[name] = interpreter.createNativeFunction(function(val) {
          this._o_el[name] = val
        })
      })

      // nativeToPseudo result method abstraction
      ;['dispose', 'getDefaults', 'toString'].forEach(name => {
        interpreter.setNativeFunctionPrototype(manager, name, function(
          ...attr
        ) {
          return interpreter.nativeToPseudo(this._o_el[name](...attr))
        })
      })
    },
  },
}
