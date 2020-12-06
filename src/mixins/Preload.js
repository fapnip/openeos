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
    doAfterPreload(wait, isError) {
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
    addPreload(file, asType, wait, onLoad, onError) {
      const _this = this
      if (asType === 'audio') {
        return // audio preloading done elsewhere
      }
      function _onPreload() {
        delete preloadedImages[file.href]
        _this.doAfterPreload(wait)
      }
      if (file && !file.error && file.href) {
        preloaded[file.href] = true
        const preload = new Image()
        preloadedImages[file.href] = preload
        preload.crossOrigin = 'anonymous'
        preload.onload = () => {
          _onPreload()
          if (typeof onLoad === 'function')
            onLoad(file.href.match(/^data:/) ? 'data-url' : file.href)
        }
        preload.onerror = e => {
          _onPreload()
          if (typeof onError === 'function') onError(e)
        }
        preload.src = file.href
        // if (file.noReferrer) preload.referrerPolicy = 'no-referrer'
        if (wait) this.incrementPreload()
        // console.log('Preloading', file)
      } else {
        onError((file && file.error) || 'Invalid locator')
      }
    },
    preloadImage(locator, wait, onLoad, onError) {
      const file = this.locatorLookup(locator, true)
      this.addPreload(
        file,
        'image',
        wait && !this.hasInPreloadPool(locator),
        onLoad,
        onError
      )
    },
    preloadPageScriptsAndSounds() {
      const pageKeys = Object.keys(this.pages())
      for (const pageId of pageKeys) {
        this.preloadPage(pageId, '_preload', false, true)
      }
    },
    preloadPage(patten, parentPageId, wait, noImagePreload) {
      let pageId
      try {
        if (this.getPage(patten, true)) {
          pageId = this.lastGetPageId()
        }
      } catch (e) {
        console.warn(`Linked pageId "${patten}" in ${parentPageId} not found.`)
        return
      }
      console.log('Preloading Page:', pageId)
      const pageScript = this.getPageScript(pageId)
      if (!noImagePreload) {
        for (const locator of Object.keys(pageScript.images)) {
          this.preloadImage(locator, wait)
        }
      } else {
        console.log('Skipping image preload on:', pageId)
      }
      // Preload all sounds on tease start
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