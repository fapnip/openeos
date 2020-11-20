import { getRandomInt, buildHref } from '../util'
let galleryLookup = {}
let SCRIPT = {}

// export const extensionMap = {
//   'audio/mpeg': 'mp3',
//   'image/jpeg': 'jpg',
// }

// function buildHref(item) {
//   if (!item.type || item.type.match(/^image/)) {
//     return `https://media.milovana.com/timg/tb_xl/${item.hash}.jpg`
//   } else {
//     return `https://media.milovana.com/timg/${item.hash}.${
//       extensionMap[item.type]
//     }`
//   }
// }

export default {
  data: () => ({
    missingFile: {
      href: 'missing-file',
    },
  }),
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
    locatorLookup(locator) {
      if (typeof locator !== 'string') return null
      const galleryFile = this.lookupGalleryImage(locator)
      if (galleryFile) return galleryFile
      const file = this.lookupFile(locator)
      if (file) return file
      console.error('Invalid locator', locator)
      return { href: 'invalid-locator' }
    },
    lookupFile(locator) {
      const fileMatch = locator.match(/^file:(.*)$/)
      if (!fileMatch) return
      const file = this.files()[fileMatch[1]]
      if (!file) {
        console.error(`Unknown file: ${fileMatch[1]}`)
        return this.missingFile
      }
      return {
        item: file,
        href: buildHref(file),
      }
    },
    lookupGalleryImage(locator) {
      const galleryMatch = locator.match(/^gallery:([^/]+)\/(.*)$/)
      if (!galleryMatch) return
      const gallery = galleryLookup[galleryMatch[1]]
      if (!gallery) {
        console.error(`Unknown gallery: ${gallery}`)
        return this.missingFile
      }
      let image = null
      if (galleryMatch[2] === '*') {
        const images = this.galleries()[galleryMatch[1]].images
        image = images[getRandomInt(0, images.length - 1)]
        if (!image) {
          const galleryName = this.galleries()[galleryMatch[1]].name
          console.error(
            `Unknown image ID in gallery "${galleryName}": ${galleryMatch[2]}`
          )
          return this.missingFile
        }
      } else {
        image = gallery[galleryMatch[2]]
        if (!image) {
          const galleryName = this.galleries()[galleryMatch[1]].name
          console.error(
            `Unknown image ID in gallery "${galleryName}": ${galleryMatch[2]}`
          )
          return this.missingFile
        }
      }
      return {
        item: image,
        href: buildHref(image),
      }
    },
    updateGalleryLookup() {
      const galleries = this.galleries()
      galleryLookup = Object.keys(galleries).reduce((a, k) => {
        a[k] = galleries[k].images.reduce((a2, img) => {
          a2[img.id] = img
          return a2
        }, {})
        return a
      }, {})
    },
    setScript(script) {
      SCRIPT = script
      this.updateGalleryLookup()
    },
  },
}
