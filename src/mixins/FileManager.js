export default {
  data: () => ({}),
  mounted() {},
  watch: {},
  methods: {
    installFileManager(interpreter, globalObject) {
      const constructor = () => {
        return interpreter.createThrowable(
          interpreter.ERROR,
          'Cannot construct __FileManager object, use `FileManager` global'
        )
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      interpreter.setProperty(
        manager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      const proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, '__FileManager', manager)

      interpreter.setNativeFunctionPrototype(manager, 'galleries', () => {
        return interpreter.nativeToPseudo(Object.keys(this.galleries()))
      })

      interpreter.setNativeFunctionPrototype(manager, 'files', () => {
        return interpreter.nativeToPseudo(Object.keys(this.files()))
      })

      interpreter.setNativeFunctionPrototype(manager, 'file', file => {
        return interpreter.nativeToPseudo(this.files()[file])
      })

      interpreter.setNativeFunctionPrototype(manager, 'gallery', gallery => {
        return interpreter.nativeToPseudo(this.galleries()[gallery])
      })

      this.fileManagerInstance = interpreter.createObjectProto(proto)
      interpreter.setProperty(
        globalObject,
        'FileManager',
        this.fileManagerInstance
      )
    },
  },
}
