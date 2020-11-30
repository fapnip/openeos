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
      this.$nextTick(() => {
        this.setBackgroundFromImage()
      })
    },
  },
  methods: {
    async setBackgroundFromImage() {
      const img = this.$refs.mainImage
      if (!img) return
      let color = colors[img.src]
      if (!color) {
        const { DarkMuted } = await Vibrant.from(img).getPalette()
        color = DarkMuted.getHex()
        colors[img.src] = color
        const els = document.getElementsByClassName('@vibrant/canvas')
        if (els.length) els[els.length - 1].remove()
      }
      this.backgroundColor = color
    },
  },
}
