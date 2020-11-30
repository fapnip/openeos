export default {
  data: () => ({}),
  methods: {
    imageClick(e) {
      const rect = e.target.getBoundingClientRect()
      const x = e.clientX - rect.left //x position within the element.
      const y = e.clientY - rect.top //y position within the element.
      const xPerc = x / e.target.clientWidth
      const yPerc = y / e.target.clientHeight
      console.log('Image clicked', xPerc, yPerc, e)
      console.log('Left? : ' + x + ' ; Top? : ' + y + '.')
    },
    // installConsole(interpreter, globalObject) {
    //   const vmConsole = interpreter.createObject(interpreter.OBJECT)
    //   interpreter.setProperty(globalObject, 'console', vmConsole)
    //   ;['log', 'info', 'warn', 'error', 'dir'].forEach(method => {
    //     let raw = method === 'dir'
    //     interpreter.setProperty(
    //       vmConsole,
    //       method,
    //       interpreter.createNativeFunction((message, ...args) => {
    //         console[raw ? 'log' : method](
    //           'vm:',
    //           interpreter.pseudoToNative(message),
    //           ...args.map(arg => (raw ? arg : interpreter.pseudoToNative(arg)))
    //         )
    //       }),
    //       this.Interpreter.NONENUMERABLE_DESCRIPTOR
    //     )
    //   })
    // },
  },
}
