import { getRandomInt } from '../util'
import { buildHref, extToType } from '../util/io'
import minimatch from 'minimatch'

let galleryLookup = {}
let urlIdCounter = 0
const urlCache = {}

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
  if (pool.length >= 5) {
    return
  }
  console.log('Added Random Pool', pool, locator, item)
  pool.push(item)
}

const allowedUrlMatcher = /(^(https:\/\/i\.ibb\.co\/.+|^data:image\/.+)|^file:.*\*\+\(\|oeos:(.+)\)$)/

export default {
  data: () => ({
    missingFile: {
      href: 'missing-file',
      error: true,
    },
  }),
  methods: {
    locatorLookup(locator, preload) {
      const link = this.lookupRemoteLink(locator, preload)
      if (link) return link
      const pool = getPreloadPool(locator)
      const preloaded = !preload && pool.pop()
      if (preloaded) {
        console.log('Used preloaded', pool, preloaded)
        // A random locator was pre-loaded, but not yet used
        if (!pool.length) {
          // Pre-load pool is empty
          // Add add one for next time
          console.log('Adding random preload', pool, locator)
          this.preloadImage(locator)
        }
        // use it
        return preloaded
      }
      if (typeof locator !== 'string') return null
      const galleryFile = this.lookupGalleryImage(locator, preload)
      if (galleryFile) return galleryFile
      const file = this.lookupFile(locator, preload)
      if (file) return file
      console.error('Invalid locator', locator)
      return { href: 'invalid-locator', error: true }
    },
    lookupRemoteLink(locator, preload) {
      const urlMatch = locator.match(allowedUrlMatcher)
      if (!urlMatch) return
      if (urlMatch[3]) {
        return this.locatorLookup(decodeURIComponent(urlMatch[3]))
      }
      let image = urlCache[locator]
      if (!image) {
        const id = ++urlIdCounter
        image = {
          href: locator,
          item: {
            hash: id,
            id: id,
          },
          noReferrer: true,
        }
        urlCache[locator] = image
      }
      return image
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
  },
}
