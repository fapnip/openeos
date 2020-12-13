const elements = new WeakMap()
let proto

export default {
  data: () => ({}),
  methods: {
    getHTMLCollectionProto() {
      return proto
    },
    getHTMLCollectionPseudo(native) {
      if (!native) return
      let pseudo = elements.get(native)
      if (!pseudo) {
        pseudo = this.interpreter.createObjectProto(proto)
        pseudo._o_el = native
        elements.set(native, pseudo)
      }
      return pseudo
    },
    installHTMLCollection(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        return interpreter.createObjectProto(proto)
      }
      const manager = interpreter.createNativeFunction(constructor, true)
      proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'HTMLCollection', manager)

      // length
      ;['length'].forEach(name => {
        interpreter.setProperty(proto, name, undefined)
        proto.getter[name] = interpreter.createNativeFunction(function() {
          return this._o_el[name]
        })
      })

      // Return pseudo val from native function
      ;['item', 'namedItem'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          ...attr
        ) {
          return vue.getHTMLElementPseudo(this._o_el[fnName](...attr))
        })
      })

      // Foreach..
      interpreter.setNativeFunctionPrototype(manager, 'forEach', function(
        func,
        funcThis
      ) {
        const pseudoArr = interpreter.nativeToPseudo([])
        const l = this._o_el.length
        let i
        for (i = 0; i < l; i++) {
          pseudoArr.properties[i] = vue.getHTMLElementPseudo(this._o_el.item(i))
          i++
        }
        i = 0
        const _doForEach = () => {
          if (i >= l) return
          return interpreter
            .callFunction(
              func,
              funcThis || this,
              pseudoArr.properties[i],
              i,
              pseudoArr
            )
            .then(() => {
              i++
              return _doForEach()
            })
        }
        return _doForEach()
      })

      // Hack to get item via brackets.  Limited to 1000 elements.  Work-around due to interpreter's lack of Proxy
      for (let i = 0; i < 1000; i++) {
        interpreter.setProperty(proto, i, undefined)
        proto.getter[i] = interpreter.createNativeFunction(function() {
          return vue.getHTMLElementPseudo(this._o_el[i])
        })
      }
    },
  },
}
