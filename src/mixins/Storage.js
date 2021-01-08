let STORAGE = {}
let MAX_STORAGE = 1024

export default {
  props: {
    teaseStorage: {
      type: String,
      default: null,
    },
  },
  data: () => ({}),
  mounted() {
    this.loadStorage()
  },
  watch: {
    teaseStorage(v) {
      const key = this.getStorageKey()
      if (v && v !== localStorage.getItem(key)) {
        try {
          const decoded = JSON.parse(v)
          STORAGE = decoded
          console.warn('Restored tease storage', STORAGE)
          this.saveStorage()
          return
        } catch (e) {
          console.error('Invalid storage data', v)
        }
      }
    },
  },
  methods: {
    getStorageKey() {
      return 'oeosTeaseStorage-' + this.teaseId
    },
    saveStorage() {
      if (!this.teaseId) return
      const data = JSON.stringify(STORAGE)
      if (data.length > MAX_STORAGE) {
        console.error(
          `Unable to save Tease Storage.  Over ${MAX_STORAGE} bytes.`
        )
        this.$emit('save-storage', data) // Allow parent handlers to decide if it's too big for them.
        return data.length - MAX_STORAGE
      }
      const key = this.getStorageKey()
      if (data !== localStorage.getItem(key)) {
        localStorage.setItem(key, data)
        this.$emit('save-storage', data)
      }
    },
    loadStorage() {
      if (!this.teaseId) return
      const data = localStorage.getItem(this.getStorageKey())
      if (data) {
        try {
          const decoded = JSON.parse(data)
          STORAGE = decoded
          this.$emit('load-storage', data)
          return
        } catch (e) {
          console.error('Invalid storage data', data)
        }
      }
      STORAGE = {}
    },
    installStorage(interpreter, globalObject) {
      const manager = interpreter.createObject(interpreter.OBJECT)
      interpreter.setProperty(manager, 'length', Object.keys(STORAGE).length)
      interpreter.setProperty(
        manager,
        'key',
        interpreter.createNativeFunction(index => {
          if (typeof index !== 'number') {
            return interpreter.createThrowable(
              interpreter.TYPE_ERROR,
              'Index must be a number'
            )
          }
          return Object.keys(STORAGE)[index]
        })
      )
      interpreter.setProperty(
        manager,
        'getItem',
        interpreter.createNativeFunction(keyName => {
          if (typeof keyName !== 'string') {
            return interpreter.createThrowable(
              interpreter.TYPE_ERROR,
              'Key must be a string'
            )
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
            return interpreter.createThrowable(
              interpreter.TYPE_ERROR,
              'Key must be a string'
            )
          }
          // Sanitize value
          STORAGE[keyName] = JSON.parse(
            JSON.stringify(interpreter.pseudoToNative(value))
          )

          return this.saveStorage()
        })
      )
      interpreter.setProperty(
        manager,
        'removeItem',
        interpreter.createNativeFunction(keyName => {
          if (typeof keyName !== 'string') {
            return interpreter.createThrowable(
              interpreter.TYPE_ERROR,
              'Key must be a string'
            )
          }

          delete STORAGE[keyName]

          return this.saveStorage()
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
