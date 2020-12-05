const onNextImageLoad = []
const onNextImageError = []

export default {
  data: () => ({
    fullScreenImage: false,
    hideImage: false,
    image: null,
  }),
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
  },
}
