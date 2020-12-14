const elements = new WeakMap()
let proto

export default {
  data: () => ({}),
  methods: {
    getDOMTokenListProto() {
      return proto
    },
    getDOMTokenListPseudo(native) {
      if (!native) return
      let pseudo = elements.get(native)
      if (!pseudo) {
        pseudo = this.interpreter.createObjectProto(proto)
        pseudo._o_tl = native
        elements.set(native, pseudo)
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

      // Return pseudo val from native function
      ;['toString'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function() {
          return this._o_tl.value
        })
      })

      // Foreach..
      interpreter.setNativeFunctionPrototype(manager, 'forEach', function(
        func,
        funcThis
      ) {
        const pseudoArr = interpreter.nativeToPseudo([])
        const l = this._o_tl.length
        let i
        for (i = 0; i < l; i++) {
          pseudoArr.properties[i] = interpreter.nativeToPseudo(
            this._o_tl.item(i)
          )
          i++
        }
        i = 0
        const _doForEach = () => {
          if (i >= l) return
          return interpreter
            .callFunction(func, funcThis || this, pseudoArr[i], i, pseudoArr)
            .then(() => {
              i++
              return _doForEach()
            })
        }
        return _doForEach()
      })

      // Return pseudo val from native function
      ;['values', 'keys'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function() {
          return interpreter.nativeToPseudo(Array.from(this._o_tl[fnName]()))
        })
      })

      // TODO: entries, add next to JS Interpreter's Array implementation
    },
  },
}
