let proto

// Probably should change this to allowed tags, but for now..
const blockedTags = { applet: true, script: true, link: true, iframe: true }

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
          if (blockedTags[el.tagName.toLowerCase()]) {
            return interpreter.createThrowable(
              interpreter.TYPE_ERROR,
              "Sorry.  You can't make " + el.tagName + '.'
            )
          }
          // console.log('Creating...', el)
          // console.dir(el)
          return vue.getHTMLElementPseudo(vue.sanitizeHtml(el))
        })
      })
    },
  },
}
