const preloaded = {}
const afterPreload = []
const preloadedImages = {}
let waitingPreloads = 0
let startupSounds = []

export default {
  data: () => ({}),
  methods: {
    popStartupSounds() {
      const result = startupSounds
      startupSounds = []
      return result
    },
    hasWaitingPreloads() {
      return !!waitingPreloads
    },
    incrementPreload() {
      waitingPreloads++
    },
    doAfterPreload(wait) {
      if (!wait) return
      waitingPreloads--
      if (waitingPreloads) {
        // console.warn('Waiting for preload...', waitingPreloads)
        return
      }
      // console.log('Finished preload.')
      let fn = afterPreload.shift()
      while (fn) {
        fn()
        fn = afterPreload.shift()
      }
    },
    addPreload(file, asType, wait) {
      const _this = this
      if (asType === 'audio') {
        return // audio preloading done elsewhere
      }
      function _onPreload() {
        if (this._preloaded) return
        this._preloaded = true
        // console.log('Preloaded', preload, waitingPreloads)
        delete preloadedImages[file.href]
        _this.doAfterPreload(wait)
      }
      if (file && !file.error && file.href && !file.href.match(/^data:/)) {
        preloaded[file.href] = true
        const preload = new Image()
        preloadedImages[file.href] = preload
        preload.crossOrigin = 'anonymous'
        preload.onload = _onPreload
        preload.onerror = _onPreload
        preload.src = file.href
        // if (file.noReferrer) preload.referrerPolicy = 'no-referrer'
        if (wait) this.incrementPreload()
        // console.log('Preloading', file)
      }
    },
    preloadImage(locator, wait) {
      const file = this.locatorLookup(locator, true)
      this.addPreload(file, 'image', wait && !this.hasInPreloadPool(locator))
    },
    preloadPage(patten, parentPageId, wait) {
      let pageId
      try {
        if (this.getPage(patten, true)) {
          pageId = this.lastGetPageId()
        }
      } catch (e) {
        console.warn(`Linked pageId "${patten}" in ${parentPageId} not found.`)
        return
      }
      const pageScript = this.getPageScript(pageId)
      for (const locator of Object.keys(pageScript.images)) {
        this.preloadImage(locator, wait)
      }
      if (!this.started) startupSounds.push(...pageScript.sounds)
    },
    addAfterPreload(fn) {
      afterPreload.push(fn)
    },
    shiftAfterPreload(fn) {
      afterPreload.unshift(fn)
    },
  },
}
