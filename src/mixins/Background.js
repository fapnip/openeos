import backgroundImage from '../assets/bg-texture.png'

import Vibrant from 'node-vibrant/lib/browser.js'
import Pipeline from 'node-vibrant/lib/pipeline/index.js'

Vibrant.use(Pipeline)

const colors = {}

export default {
  data: () => ({
    backgroundTexture: null,
    backgroundColor: null,
    forcedBackgroundColor: null,
  }),

  computed: {
    currentBackgroundColor() {
      return this.forcedBackgroundColor || this.backgroundColor
    },
    selectedBackgroundTexture() {
      return (
        this.currentBackgroundColor &&
        (this.backgroundTexture || backgroundImage)
      )
    },
  },
  watch: {
    image(image) {
      if (this.forcedBackgroundColor) return
      if (!image || !image.href) return
      console.log('Displayed Image', { url: image.href })
      this.$nextTick(() => {
        this.setBackgroundFromImage()
      })
    },
  },
  methods: {
    async setBackgroundFromImage() {
      const image = this.image
      const href = image && image.href
      if (!href || image.error) return
      // const img = this.$refs.mainImage
      // if (!img) return
      let color = colors[href]
      if (!color) {
        const { DarkMuted } = await Vibrant.from(href).getPalette()
        color = DarkMuted.getHex()
        colors[href] = color
        // Vibrant seems to have a memory leak
        // This helps, but there's more it leaves behind
        // What's the correct way to destroy a vibrant instance?
        const els = document.getElementsByClassName('@vibrant/canvas')
        if (els.length) els[els.length - 1].remove()
      }
      this.backgroundColor = color
    },
  },
}
