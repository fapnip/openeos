import { getRandomInt } from '../util'
import { buildHref, extToType } from '../util/io'
import minimatch from 'minimatch'
let galleryLookup = {}
let SCRIPT = {}
const randomPreload = {}

export default {
  data: () => ({
    missingFile: {
      href: 'missing-file',
      error: true,
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
    locatorLookup(locator, preload) {
      const preloaded = !preload && randomPreload[locator]
      if (preloaded) {
        // A random locator was pre-loaded, but not yet used
        // use it
        delete randomPreload[locator]
        return preloaded
      }
      if (typeof locator !== 'string') return null
      const galleryFile = this.lookupGalleryImage(locator)
      if (galleryFile) return galleryFile
      const file = this.lookupFile(locator)
      if (file) {
        return file
      }
      console.error('Invalid locator', locator)
      return { href: 'invalid-locator', error: true }
    },
    lookupFile(locator, preload) {
      const fileMatch = locator.match(/^file:(.*)$/)
      if (!fileMatch) return
      const extMatch = locator.match(/\.([^.]+)$/)
      const isRandom = locator.match(/\*/)
      const ext = extMatch && extMatch[1]
      const type = extToType[ext]
      const files = this.files()
      const filter = minimatch.filter(locator.slice('file:'.length))
      const matches = Object.keys(files)
        .filter(filter)
        .map(f => files[f])
        .filter(f => !type || f.type === type)
      const file = matches[Math.floor(Math.random() * matches.length)]
      if (!file) {
        console.error(`Unknown file: ${fileMatch[1]}`)
        return this.missingFile
      } else if (preload && isRandom) {
        randomPreload[locator] = file
      }
      return {
        item: file,
        href: buildHref(file),
      }
    },
    lookupGalleryImage(locator, preload) {
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
        if (preload) randomPreload[locator] = image
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
