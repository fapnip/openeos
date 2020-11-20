export default {
  data: () => ({}),
  methods: {
    installConsole(interpreter, globalObject) {
      const vmConsole = interpreter.createObject(interpreter.OBJECT)
      interpreter.setProperty(globalObject, 'console', vmConsole)
      ;['log', 'info', 'warn', 'error', 'dir'].forEach(method => {
        let raw = method === 'dir'
        interpreter.setProperty(
          vmConsole,
          method,
          interpreter.createNativeFunction((message, ...args) => {
            console[raw ? 'log' : method](
              'vm:',
              interpreter.pseudoToNative(message),
              ...args.map(arg => (raw ? arg : interpreter.pseudoToNative(arg)))
            )
          }),
          this.Interpreter.NONENUMERABLE_DESCRIPTOR
        )
      })
    },
  },
}
