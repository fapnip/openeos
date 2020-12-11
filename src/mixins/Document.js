let proto

export default {
  data: () => ({}),
  methods: {
    installDocument(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        return interpreter.createObjectProto(proto)
      }
      const manager = interpreter.createNativeFunction(constructor, true)
      proto = manager.properties['prototype']
      // interpreter.setProperty(globalObject, 'Document', manager)
      interpreter.setProperty(
        globalObject,
        'document',
        interpreter.createObjectProto(proto)
      )

      //
      ;['createElement', 'createTextNode'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          ...attr
        ) {
          const el = document[fnName](...attr)
          return vue.getHTMLElementPseudo(el)
        })
      })
    },
  },
}
