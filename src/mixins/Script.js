import { getRandomInt } from '../util'
import { buildHref, extToType } from '../util/io'
import minimatch from 'minimatch'
let galleryLookup = {}
let SCRIPT = {}
const preloadPools = {}
function getPreloadPool(locator) {
  let pool = preloadPools[locator]
  if (!pool) {
    pool = []
    preloadPools[locator] = pool
  }
  return pool
}
function addToPreloadPool(locator, item) {
  const pool = getPreloadPool(locator, item)
  if (pool.length >= 3) return
  pool.push(item)
}
const allowedUrlMatcher = /(^https:\/\/cdn\.sex\.com\/images\/)/

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
      const preloaded = !preload && getPreloadPool(locator).pop()
      if (preloaded) {
        // A random locator was pre-loaded, but not yet used
        if (!getPreloadPool(locator).length) {
          // Pre-load pool is empty
          // Add add one for next time
          this.addPreload(locator)
        }
        // use it
        return preloaded
      }
      if (typeof locator !== 'string') return null
      const galleryFile = this.lookupGalleryImage(locator, preload)
      if (galleryFile) return galleryFile
      const file = this.lookupFile(locator, preload)
      if (file) return file
      const link = this.lookupRemoteLink(locator, preload)
      if (link) return link
      console.error('Invalid locator', locator)
      return { href: 'invalid-locator', error: true }
    },
    lookupRemoteLink(locator, preload) {
      if (!locator.match(allowedUrlMatcher)) return
      return {
        href: locator,
        item: {
          hash: locator,
          id: locator,
        },
        noReferrer: true,
      }
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
      let file = matches[Math.floor(Math.random() * matches.length)]
      if (!file) {
        console.error(`Unknown file: ${fileMatch[1]}`)
        return this.missingFile
      }
      if (preload && isRandom) {
        const pool = getPreloadPool(locator)
        const lastInPool = pool[pool.length - 1]
        for (
          let i = 5, l = matches.length;
          l > 2 && i > 0 && file !== lastInPool;
          i--
        ) {
          // Try not to repeat the last file
          file = matches[Math.floor(Math.random() * matches.length)]
        }
        const result = {
          item: file,
          href: buildHref(file),
        }
        addToPreloadPool(locator, result)
        return result
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
        if (preload) {
          const pool = getPreloadPool(locator)
          const lastInPool = pool[pool.length - 1]
          for (
            let i = 5, l = images.length;
            l > 2 && i > 0 && image !== lastInPool;
            i--
          ) {
            // Try not to repeat the last image
            image = images[getRandomInt(0, images.length - 1)]
          }
          const result = {
            item: image,
            href: buildHref(image),
          }
          addToPreloadPool(locator, result)
          return result
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
