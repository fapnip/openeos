export default {
  data: () => ({
    fullScreenImage: false,
    hideImage: false,
    image: null,
  }),
  methods: {
    // imageError(image) {
    //   this.dispatchEvent({
    //     target: this.pagesInstance,
    //     type: 'image-error',
    //     value: image,
    //   })
    // },
    imageLoad(e) {
      console.log('Image Loaded', e)
      // this.dispatchEvent({
      //   target: this.pagesInstance,
      //   type: 'image-load',
      //   value: image,
      // })
    },
    setImage(locator) {
      this.hideImage = false
      this.image = this.locatorLookup(locator)
    },
    imageClick(e) {
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
      })
    },
  },
}
