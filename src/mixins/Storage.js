let STORAGE = {}

export default {
  data: () => ({
    // vmStorage: {},
  }),
  methods: {
    saveStorage() {
      //
    },
    loadStorage() {
      //
    },
    installStorage(interpreter, globalObject) {
      const manager = interpreter.createObject(interpreter.OBJECT)
      interpreter.setProperty(manager, 'length', Object.keys(STORAGE).length)
      interpreter.setProperty(
        manager,
        'key',
        interpreter.createNativeFunction(index => {
          if (typeof index !== 'number') {
            throw new TypeError('Index must be a number')
          }

          return Object.keys(STORAGE)[index]
        })
      )
      interpreter.setProperty(
        manager,
        'getItem',
        interpreter.createNativeFunction(keyName => {
          if (typeof keyName !== 'string') {
            throw new TypeError('Key must be a string')
          }

          if (Object.keys(STORAGE).indexOf(keyName) !== -1) {
            return interpreter.nativeToPseudo(STORAGE[keyName])
          } else {
            return undefined
          }
        })
      )
      interpreter.setProperty(
        manager,
        'setItem',
        interpreter.createNativeFunction((keyName, value) => {
          if (typeof keyName !== 'string') {
            throw new TypeError('Key must be a string')
          }

          // Sanitize value a bit by using JSON
          STORAGE[keyName] = JSON.parse(
            JSON.stringify(interpreter.pseudoToNative(value))
          )

          this.saveStorage()
        })
      )
      interpreter.setProperty(
        manager,
        'removeItem',
        interpreter.createNativeFunction(keyName => {
          if (typeof keyName !== 'string') {
            throw new TypeError('Key must be a string')
          }

          delete STORAGE[keyName]

          this.saveStorage()
        })
      )
      interpreter.setProperty(
        manager,
        'clear',
        interpreter.createNativeFunction(() => {
          STORAGE = {}
          this.saveStorage()
        })
      )
      interpreter.setProperty(globalObject, 'teaseStorage', manager)
    },
  },
}
