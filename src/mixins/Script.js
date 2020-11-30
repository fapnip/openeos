let SCRIPT = {}

export default {
  data: () => ({}),
  computed: {},
  methods: {
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
    },
  },
}
