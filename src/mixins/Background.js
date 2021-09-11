import * as Vibrant from 'node-vibrant'

const colors = {}

export default {
  data: () => ({
    // defaultBackgroundTexture: `${process.env.BASE_URL}bg-texture.png`,
    defaultBackgroundTexture: `https://i.ibb.co/C1MnYvW/bg-texture.png`,
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
        (this.backgroundTexture || this.defaultBackgroundTexture)
      )
    },
  },
  watch: {
    image(image) {
      if (this.forcedBackgroundColor) return
      if (!image || !image.href) return
      this.debug('Displayed Image', { url: image.href })
      this.$nextTick(() => {
        this.setBackgroundFromImage()
      })
    },
  },
  methods: {
    setBackgroundFromImage() {
      const image = this.image
      const href = image && image.href
      if (!href || image.error) return
      // const img = this.$refs.mainImage
      // if (!img) return
      let color = colors[href]
      if (!color) {
        Vibrant.from(href)
          .getPalette()
          .then(({ DarkMuted }) => {
            color = DarkMuted.getHex()
            colors[href] = color
            this.backgroundColor = color
          })
      } else {
        this.backgroundColor = color
      }
    },
  },
}
