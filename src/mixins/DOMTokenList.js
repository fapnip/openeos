const elements = new WeakMap()
let proto

export default {
  data: () => ({}),
  methods: {
    getDOMTokenListProto() {
      return proto
    },
    getDOMTokenListPseudo(tl) {
      if (!tl) return
      let pseudo = elements.get(tl)
      if (!pseudo) {
        pseudo = this.interpreter.createObjectProto(proto)
        pseudo._o_tl = tl
        elements.set(tl, pseudo)
      }
      return pseudo
    },
    installDOMTokenList(interpreter, globalObject) {
      // const vue = this
      const constructor = opt => {
        return interpreter.createObjectProto(proto)
      }
      const manager = interpreter.createNativeFunction(constructor, true)
      proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'DOMTokenList', manager)

      // Values Using getter
      ;['length', 'value'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_tl[name]
        })
      })

      // Return pseudo val from native function
      ;[
        'item',
        'contains',
        'add',
        'remove',
        'replace',
        'supports',
        'toggle',
      ].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          ...attr
        ) {
          return interpreter.nativeToPseudo(this._o_tl[fnName](...attr))
        })
      })

      // TODO: implement iterable for entries, values, keys, etc.
    },
  },
}
