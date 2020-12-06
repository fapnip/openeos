const onNextImageLoad = []
const onNextImageError = []

// let PROTO

let supportsWebpAnimation = false

// from: https://developers.google.com/speed/webp/faq#how_can_i_detect_browser_support_for_webp
// checkWebpFeature:
//   'feature' can be one of 'lossy', 'lossless', 'alpha' or 'animation'.
//   'callback(feature, isSupported)' will be passed back the detection result (in an asynchronous way!)
function checkWebpFeature(feature, callback) {
  var kTestImages = {
    lossy: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
    lossless: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
    alpha:
      'UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==',
    animation:
      'UklGRlIAAABXRUJQVlA4WAoAAAASAAAAAAAAAAAAQU5JTQYAAAD/////AABBTk1GJgAAAAAAAAAAAAAAAAAAAGQAAABWUDhMDQAAAC8AAAAQBxAREYiI/gcA',
  }
  var img = new Image()
  img.onload = function() {
    var result = img.width > 0 && img.height > 0
    callback(feature, result)
  }
  img.onerror = function() {
    callback(feature, false)
  }
  img.src = 'data:image/webp;base64,' + kTestImages[feature]
}

export default {
  data: () => ({
    fullScreenImage: false,
    hideImage: false,
    image: null,
  }),
  beforeMount() {
    checkWebpFeature('animation', r => {
      supportsWebpAnimation = !!r
    })
  },
  methods: {
    addImageOnLoad(func) {
      // TODO: validate that func is actually a pseudo function
      if (func) onNextImageLoad.push(func)
    },
    addImageOnError(func) {
      // TODO: validate that func is actually a pseudo function
      if (func) onNextImageError.push(func)
    },
    imageError(e) {
      // if (!this.captureImageLoads() && !onNextImageError.length) return
      const payload = {
        target: this.pagesInstance,
        type: 'image-error',
        value: this.image,
        timeStamp: e.timeStamp + performance.timing.navigationStart,
      }
      this.doEventCallbackFuncs(onNextImageError, payload)
      onNextImageLoad.length = 0
      // if (this.captureImageLoads())
      this.dispatchEvent(payload)
    },
    imageLoad(e) {
      // if (!this.captureImageLoads() && !onNextImageLoad.length) return
      const payload = {
        target: this.pagesInstance,
        type: 'image-load',
        value: this.image,
        timeStamp: e.timeStamp + performance.timing.navigationStart,
      }
      this.doEventCallbackFuncs(onNextImageLoad, payload)
      onNextImageError.length = 0
      // if (this.captureImageLoads())
      this.dispatchEvent(payload)
    },
    setImage(locator) {
      this.hideImage = false
      this.image = this.locatorLookup(locator)
    },
    imageClick(e) {
      console.log(
        'image-click-event',
        e.timeStamp,
        performance.timing.navigationStart,
        Number.isInteger(e.timeStamp)
      )
      if (!this.captureImageClicks()) return
      e.stopPropagation()
      const rect = e.target.getBoundingClientRect()
      const x = e.clientX - rect.left //x position within the element.
      const y = e.clientY - rect.top //y position within the element.
      this.dispatchEvent({
        target: this.pagesInstance,
        type: 'image-click',
        value: {
          x: x / e.target.clientWidth, // between 0 and 1, where clicked
          y: y / e.target.clientHeight, // between 0 and 1, where clicked
        },
        timeStamp: e.timeStamp + performance.timing.navigationStart,
      })
    },
    installImage(interpreter, globalObject) {
      // const vue = this
      const constructor = (opt, fromPageScript) => {
        return interpreter.createThrowable(
          interpreter.ERROR,
          'Sorry. No Image constructor, yet.'
        )
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      interpreter.setProperty(
        manager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
      // PROTO = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'Image', manager)

      interpreter.setProperty(
        manager,
        'webpAnimation',
        interpreter.createNativeFunction(() => {
          return supportsWebpAnimation
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
    },
  },
}
