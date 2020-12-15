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
    incrementPreload(href) {
      this.debug('Queuing preload:', href)
      waitingPreloads++
    },
    doAfterPreload(wait, isError) {
      if (!wait) return
      waitingPreloads--
      if (waitingPreloads > 0) {
        this.debug('Waiting for preload...', waitingPreloads)
        return
      }
      if (waitingPreloads === 0) {
        this.debug('Finished preload')
      }
      waitingPreloads = 0
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
          if (typeof onError === 'function') {
            onError(e)
          } else {
            console.error('Preload error:', file && file.error, e)
          }
        }
        preload.src = file.href
        // if (file.noReferrer) preload.referrerPolicy = 'no-referrer'
        if (wait) this.incrementPreload(file.href)
        // console.log('Preloading', file)
      } else {
        if (typeof onError === 'function') {
          onError((file && file.error) || 'Invalid locator')
        } else {
          console.error('Preload error:', file && file.error)
        }
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
      this.debug('Preloading Page:', pageId)
      const pageScript = this.getPageScript(pageId)
      if (!noImagePreload) {
        for (const locator of Object.keys(pageScript.images)) {
          this.preloadImage(locator, wait)
        }
      } else {
        this.debug('Skipping image preload on:', pageId)
      }
      // Preload all sounds on tease start
      if (!this.started) startupSounds.push(...pageScript.sounds)
    },
    addAfterPreload(fn) {
      afterPreload.push(fn)
    },
  },
}
