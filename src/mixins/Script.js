import {
  validateHTMLColorHex,
  validateHTMLColorRgb,
  validateHTMLColorName,
} from 'validate-color'
import pageCompiler from '../util/pageCompiler'

let pageScripts = {}
let SCRIPT = {}

export default {
  data: () => ({}),
  computed: {},
  mounted() {
    pageScripts = {}
  },
  methods: {
    hasStorageModule() {
      return SCRIPT && SCRIPT.modules && SCRIPT.modules.storage
    },
    getInitScript() {
      return (SCRIPT && SCRIPT.init) || ''
    },
    galleries() {
      return (SCRIPT && SCRIPT.galleries) || {}
    },
    files() {
      return (SCRIPT && SCRIPT.files) || {}
    },
    pages() {
      return (SCRIPT && SCRIPT.pages) || {}
    },
    setScript(script) {
      SCRIPT = script
      this.updateGalleryLookup()
      this.loadStorage()
    },
    getPageScript(pageId) {
      const page = this.getPage(pageId)
      let pageScript = pageScripts[pageId]
      if (!pageScript) {
        console.log('Compiling Page Script:', pageId)
        pageScript = pageCompiler(page)
        pageScripts[pageId] = pageScript
        console.log(`/* Page Script: ${pageId} */`, pageScript.script)
        this.addStyles(Object.keys(pageScript.styles))
      }
      return pageScript
    },
    setReactive(object, properties) {
      for (const i of properties || []) {
        let value = object[i]
        if (value === undefined) {
          value = null
        }
        this.$set(object, i, value)
      }
    },
    validateHTMLColor(color) {
      if (!color) return null
      const interpreter = this.interpreter
      if (
        !validateHTMLColorHex(color) &&
        !validateHTMLColorRgb(color) &&
        !validateHTMLColorName(color)
      ) {
        return interpreter.createThrowable(
          interpreter.TYPE_ERROR,
          `Invalid HTML color: ${color}`
        )
      }
      return color
    },
  },
}
