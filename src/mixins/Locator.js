// TODO:  Clean up, simplify
import { getRandomInt } from '../util'
import { buildHref, extToType } from '../util/io'
import minimatch from 'minimatch'

let galleryLookup = {}
let urlIdCounter = 0
// const urlCache = {}
const locatorArrayPreload = {}
const preloadPools = {}
// const lastRandoms = {}
// const lastArrayRandoms = {}
function getPreloadPool(locator, lookupPool) {
  lookupPool = lookupPool || preloadPools
  let pool = lookupPool[locator]
  if (!pool) {
    pool = []
    lookupPool[locator] = pool
  }
  return pool
}
function addToPreloadPool(locator, item, lookupPool) {
  const pool = getPreloadPool(locator, lookupPool)
  if (pool.length >= 5) {
    return
  }
  pool.push(item)
}
function avoidLast(value, array, randomGetter, cfn, locator, lookupPool) {
  // lasts = lasts || lastRandoms
  lookupPool = lookupPool || preloadPools
  const pool = getPreloadPool(locator, lookupPool)
  let avoid = pool[pool.length - 1]
  let avoid2 = pool[pool.length - 2]
  // delete lasts[locator]
  for (
    let i = 10, l = array.length;
    (l > 2 && i > 0 && cfn(value, avoid)) ||
    (l > 3 && i > 0 && cfn(value, avoid2));
    i--
  ) {
    // Try not to repeat the last file
    value = randomGetter()
  }
  return value
}
const supportedHosts = [
  'https://www.mboxdrive.com/',
  'https://media*.vocaroo.com/', // https://vocaroo.com/
  'https://thumbs*.redgifs.com/', // https://redgifs.com/
  'https://thumbs*.gfycat.com/',
  'https://i.ibb.co', // imgbb.com
  'https://media.milovana.com',
  'https://iili.io', // Freeimage.host
]
// TODO: break this out to multiple lines
const allowedUrlMatcher = /(^(https:\/\/thumbs[0-9]*\.*gfycat\.com\/.+|https:\/\/thumbs[0-9]*\.*redgifs\.com\/.+|https:\/\/w*[0-9]*\.*mboxdrive\.com\/.+|https:\/\/media[0-9]*\.vocaroo\.com\/.+|https:\/\/iili\.io\/.+|https:\/\/i\.ibb\.co\/.+|https:\/\/media\.milovana\.com\/.+|^data:image\/.+)|^(file:|gallery:).*\+\(\|(oeos|oeos-video):(.+)\)$)/

function _validateHref(href) {
  return href && !!href.match(allowedUrlMatcher)
}

export default {
  data: () => ({}),
  methods: {
    hasInPreloadPool(locator) {
      return (
        (preloadPools[locator] && preloadPools[locator].length) ||
        (locatorArrayPreload[locator] && locatorArrayPreload[locator].length)
      )
    },
    locatorLookup(locator, preload) {
      const fromArray = this.locatorArrayLookup(locator, preload)
      if (fromArray) return fromArray
      const link = this.lookupRemoteLink(locator, preload)
      if (link) return link
      const pool = getPreloadPool(locator)
      if (!preload && pool.length) {
        // Preload the next call to this locator
        this.preloadImage(locator)
      }
      const preloaded = !preload && pool.shift()
      if (preloaded) {
        // A random locator was pre-loaded, but not yet used
        // if (!pool.length) {
        // Random pre-load pool is now empty
        // Add add one in case we need it next time
        // lastRandoms[locator] = preloaded.locator
        // this.preloadImage(locator)
        // }
        // use preloaded object
        return preloaded
      }
      if (typeof locator !== 'string') return null
      const galleryFile = this.lookupGalleryImage(locator, preload)
      if (galleryFile) return galleryFile
      const file = this.lookupFile(locator, preload)
      if (file) return file
      console.error('Invalid locator', locator)
      return { href: 'invalid-locator', error: 'Invalid locator: ' + locator }
    },
    locatorArrayLookup(locator, preload) {
      try {
        const locatorArray = JSON.parse(locator)
        if (!Array.isArray(locatorArray) || !locatorArray.length) return
        const _getRandom = () =>
          locatorArray[Math.floor(Math.random() * locatorArray.length)]
        const pool = getPreloadPool(locator, locatorArrayPreload)
        if (!preload) {
          if (pool.length) this.preloadImage(locator)
          const preloaded = pool.shift()
          if (preloaded) {
            // if (!pool.length) {
            // lastArrayRandoms[locator] = preloaded
            // this.preloadImage(locator)
            // }
            return this.locatorLookup(preloaded)
          }
          return this.locatorLookup(_getRandom())
        } else {
          let randLocator = _getRandom()
          randLocator = avoidLast(
            randLocator,
            locatorArray,
            _getRandom,
            (a, b) => a && a === b,
            locator,
            locatorArrayPreload
            // ,
            // lastArrayRandoms
          )
          // if (locatorArray.length > 2) lastRandoms[locator] = randLocator
          addToPreloadPool(locator, randLocator, locatorArrayPreload)
          return this.locatorLookup(randLocator, preload)
        }
      } catch (e) {
        return
      }
    },
    lookupRemoteLink(locator, preload) {
      const urlMatch = locator.match(allowedUrlMatcher)
      if (!urlMatch) {
        const hrefMatch = locator.match(/^https*:\/\/(^[/])/i)
        if (hrefMatch) {
          return {
            href: 'invalid-host',
            error: `Host not in whitelist: ${supportedHosts.join(', ')}`,
          }
        }
        return
      }
      if (urlMatch[5]) {
        console.log('urlMatch', urlMatch)
        return this.locatorLookup(decodeURIComponent(urlMatch[5]), preload)
      }
      // let image = urlCache[locator]
      // if (!image) {
      const id = ++urlIdCounter
      const image = {
        href: locator,
        item: {
          hash: id,
          id: id,
        },
        locator: locator,
        noReferrer: true,
      }
      // urlCache[locator] = image
      // }
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
      const _getRandom = () =>
        matches[Math.floor(Math.random() * matches.length)]
      let file = _getRandom()
      if (!file) {
        console.error(`Unknown file: ${fileMatch[1]}`)
        return {
          href: 'unknown-file',
          error: `Unknown file: ${fileMatch[1]}`,
        }
      }
      if (preload && isRandom) {
        file = avoidLast(
          file,
          matches,
          _getRandom,
          (a, b) => b && a === b.item,
          locator
        )
        const result = {
          item: file,
          href: buildHref(file, null, _validateHref),
          locator: locator,
        }
        // if (matches.length > 2) lastRandoms[locator] = file.href
        addToPreloadPool(locator, result)
        return result
      }
      return {
        item: file,
        href: buildHref(file, null, _validateHref),
        locator: locator,
      }
    },
    lookupGalleryImage(locator, preload) {
      const galleryMatch = locator.match(/^gallery:([^/]+)\/(.*)$/)
      if (!galleryMatch) return
      const gallery = galleryLookup[galleryMatch[1]]
      if (!gallery) {
        console.error(`Unknown gallery: ${gallery}`)
        return {
          href: 'unknown-gallery',
          error: `Unknown gallery: ${gallery}`,
        }
      }
      let image = null
      if (galleryMatch[2] === '*') {
        const images = this.galleries()[galleryMatch[1]].images
        const _getRandom = () => images[getRandomInt(0, images.length - 1)]
        image = _getRandom()
        if (!image) {
          const galleryName = this.galleries()[galleryMatch[1]].name
          console.error(
            `Unknown image ID in gallery "${galleryName}": ${galleryMatch[2]}`
          )
          return {
            href: 'unknown-image-id',
            error: `Unknown image id: ${galleryMatch[2]}`,
          }
        }
        if (preload) {
          image = avoidLast(
            image,
            images,
            _getRandom,
            (a, b) => b && a === b.item,
            locator
          )
          const result = {
            item: image,
            href: buildHref(image, null, _validateHref),
            locator: locator,
          }
          // if (images.length > 2) lastRandoms[locator] = image.href
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
          return {
            href: 'unknown-image-id',
            error: `Unknown image id: ${galleryMatch[2]}`,
          }
        }
      }
      return {
        item: image,
        href: buildHref(image, null, _validateHref),
        locator: locator,
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
