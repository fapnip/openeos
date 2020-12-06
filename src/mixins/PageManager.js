import pagesCode from '!!raw-loader!../interpreter/code/pages.js'
import minimatch from 'minimatch'
import compareVersions from 'compare-versions'
import { version } from '../../package.json'

let navCounter = 0
let navIndex = 0
let disabledPages = {}
const preloadedPage = {}
let lastGetPageId = null
let captureImageClicks = false
let capturePageClicks = false
// let captureImageLoads = false
let skipNextBubbleClear = false
let nextPageFuncs = []

export default {
  data: () => ({
    pagesInstance: null,
    currentPageId: null,
    lastPageId: '',
    commandIndex: 0,
    // preloadImages: [],
  }),
  mounted() {
    navCounter = 0
    disabledPages = {}
    document.addEventListener('visibilitychange', this.documentVisibilityChange)
  },
  beforeDestroy() {
    document.removeEventListener(
      'visibilitychange',
      this.documentVisibilityChange
    )
  },
  watch: {
    currentPageId(val) {
      this.$emit('page-change', val)
    },
  },
  methods: {
    captureImageClicks() {
      return captureImageClicks
    },
    // captureImageLoads() {
    //   return captureImageLoads
    // },
    capturePageClicks() {
      return capturePageClicks
    },
    documentVisibilityChange(e) {
      this.dispatchEvent({
        target: this.pagesInstance,
        type: 'visibilitychange', // Tab lost or gained focus
        timeStamp: e.timeStamp + performance.timing.navigationStart,
      })
    },
    isPageEnabled(pageId) {
      return !disabledPages[pageId]
    },
    pageClick(e) {
      if (!this.capturePageClicks()) return this.clickLastSayBubble(e)
      e.stopPropagation()
      const rect = e.target.getBoundingClientRect()
      const x = e.clientX - rect.left //x position within the element.
      const y = e.clientY - rect.top //y position within the element.
      this.dispatchEvent({
        target: this.pagesInstance,
        type: 'click',
        value: {
          x: x / e.target.clientWidth, // between 0 and 1, where clicked
          y: y / e.target.clientHeight, // between 0 and 1, where clicked
        },
        timeStamp: e.timeStamp + performance.timing.navigationStart,
      })
    },
    enablePage(pattern) {
      const filter = minimatch.filter(pattern)
      const pages = Object.keys(this.pages()).filter(filter)

      for (const page of pages) {
        delete disabledPages[page]
      }
    },
    disablePage(pattern) {
      const filter = minimatch.filter(pattern)
      const pages = Object.keys(this.pages()).filter(filter)

      for (const page of pages) {
        disabledPages[page] = true
      }
    },
    getCurrentPageId() {
      return this.currentPageId
    },
    beforePageChange() {
      const interpreter = this.interpreter
      try {
        this.dispatchEvent({
          target: this.pagesInstance,
          type: 'change',
          value: {
            to: this.currentPageId,
            from: this.lastPageId,
          },
        })
      } catch (e) {
        return interpreter.createThrowable(interpreter.TYPE_ERROR, e.toString())
      }
      this.purgePageTimers()
      if (skipNextBubbleClear) {
        skipNextBubbleClear = false
        console.log('Skipping bubble clear')
      } else {
        this.purgePageBubbles()
      }
      this.purgePageSounds()
    },
    doNextPageFuncs() {
      let func = nextPageFuncs.shift()
      while (func) {
        this.interpreter.queueFunction(func, this.pagesInstance)
        func = nextPageFuncs.shift()
      }
    },
    showPage(patten, noRun) {
      console.warn('Showing Page:', patten)
      const interpreter = this.interpreter
      const pageScript = this.getPageScript(patten)
      const pageId = lastGetPageId
      let pageCode = pageScript.code
      if (!pageCode) {
        // console.log('Building "' + pageId + '" page script', pageScript.script)
        pageCode = interpreter.parseCode(pageScript.script)
        pageScript.code = pageCode
      }
      this.preloadPage(pageId, this.lastPageId, true)
      const didPages = {}
      didPages[pageId] = true
      for (const target of Object.keys(pageScript.targets)) {
        if (!didPages[preloadedPage[target]] && !didPages[target]) {
          this.preloadPage(target, pageId)
          didPages[lastGetPageId] = true
        }
      }
      this.lastPageId = this.currentPageId
      this.currentPageId = pageId
      navCounter++ // Increment nav counter so we know when to stop executing page commands
      navIndex++ // Increment nav depth, so we know to skip consecutive gotos.
      this.beforePageChange()
      if (this.hasWaitingPreloads()) {
        this.addAfterPreload(() => {
          this.doNextPageFuncs()
          interpreter.appendCode(pageCode)
          if (!noRun) interpreter.run()
        })
      } else {
        this.doNextPageFuncs()
        interpreter.appendCode(pageCode)
      }
    },
    lastGetPageId() {
      return lastGetPageId
    },
    getPage(pattern, preload) {
      if (!preload && preloadedPage[pattern]) {
        const result = preloadedPage[pattern]
        delete preloadedPage[pattern]
        pattern = result
      }
      if (pattern && pattern.match(/\*/)) {
        const filter = minimatch.filter(pattern)
        const pages = Object.keys(this.pages()).filter(filter)
        const selectedPage = pages[Math.floor(Math.random() * pages.length)]
        if (selectedPage) {
          if (preload) preloadedPage[pattern] = selectedPage
          pattern = selectedPage
        } else {
          throw new Error(`No page found with pattern: ${pattern}`)
        }
      }
      const result = this.pages()[pattern]
      if (!result) {
        console.warn('Script pages', this.pages())
        throw new Error(`Invalid page: ${pattern}`)
      }
      lastGetPageId = pattern
      return result
    },
    startPage(pageId) {
      const page = this.getPage(pageId)
      this.currentPage = page
      for (let i in page) {
        console.log(i)
      }
    },
    installPageManager(interpreter, globalObject) {
      const vue = this
      const constructor = () => {
        return interpreter.createThrowable(
          interpreter.ERROR,
          'Cannot construct PageManager object, use `pages` global'
        )
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      interpreter.setProperty(
        manager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
      const proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'PageManager', manager)

      interpreter.setNativeFunctionPrototype(manager, 'list', () => {
        return interpreter.nativeToPseudo(Object.keys(this.pages()))
      })

      interpreter.setNativeFunctionPrototype(manager, 'isEnabled', pageId => {
        if (typeof pageId !== 'string') {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'pageId must be a string'
          )
        }

        return this.isPageEnabled(pageId)
      })

      interpreter.setNativeFunctionPrototype(manager, 'enable', function(
        pattern
      ) {
        if (typeof pattern !== 'string') {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'pattern must be a string'
          )
        }
        vue.enablePage(pattern)
        return this
      })
      interpreter.setNativeFunctionPrototype(manager, 'disable', function(
        pattern
      ) {
        if (typeof pattern !== 'string') {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'pattern must be a string'
          )
        }
        vue.disablePage(pattern)
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, '_getNavId', () => {
        return navCounter
      })

      interpreter.setNativeFunctionPrototype(manager, '_getNavQueued', () => {
        // If more than one pages.goto(...) were executed in a row before the
        // interpreted script returns control to us, this will make sure only the last
        // goto is executed, just like the original EOS player
        navIndex--
        if (navIndex < 0) {
          navIndex = 0
        }
        return navIndex
      })

      const _prepLocator = locator => {
        if (locator instanceof this.Interpreter.Object) {
          locator = JSON.stringify(interpreter.pseudoToNative(locator))
        }
        return locator
      }

      interpreter.setNativeFunctionPrototype(
        manager,
        'captureImageClicks',
        function(v) {
          if (!arguments.length) {
            return captureImageClicks
          }
          captureImageClicks = !!v
          return this
        }
      )

      interpreter.setNativeFunctionPrototype(
        manager,
        'captureImageLoads',
        function(v) {
          console.warn(
            'pages.captureImageLoads is deprecated.  Image loads are always captured.  Do not use.'
          )
          if (!arguments.length) {
            return true
            // return captureImageLoads
          }
          // captureImageLoads = !!v
          return this
        }
      )

      interpreter.setNativeFunctionPrototype(manager, 'captureClicks', function(
        v
      ) {
        if (!arguments.length) {
          return capturePageClicks
        }
        capturePageClicks = !!v
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'clearBubbles', function(
        keep
      ) {
        vue.purgePageBubbles(keep)
        return this
      })

      interpreter.setNativeFunctionPrototype(
        manager,
        'skipNextBubbleClear',
        function(v) {
          if (!arguments.length) {
            return skipNextBubbleClear
          }
          console.log('Setting skipNextBubbleClear', v)
          skipNextBubbleClear = !!v
          return this
        }
      )

      interpreter.setNativeFunctionPrototype(manager, 'hideBubbles', function(
        v
      ) {
        if (!arguments.length) {
          return vue.hideBubbles
        }
        vue.hideBubbles = !!v
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'getImage', () => {
        return interpreter.nativeToPseudo(this.image)
      })

      interpreter.setNativeFunctionPrototype(manager, 'visibilityState', () => {
        return document.visibilityState
      })

      interpreter.setNativeFunctionPrototype(manager, 'restartImage', function(
        onLoadFunc,
        onErrorFunc
      ) {
        vue.addImageOnLoad(onLoadFunc)
        vue.addImageOnError(onErrorFunc)
        const img = vue.$refs.mainImage
        if (img) {
          // eslint-disable-next-line no-self-assign
          img.src = img['src']
        }
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'setImage', function(
        locator,
        onLoadFunc,
        onErrorFunc
      ) {
        vue.addImageOnLoad(onLoadFunc)
        vue.addImageOnError(onErrorFunc)
        vue.setImage(_prepLocator(locator))
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'hideImage', function(v) {
        if (!arguments.length) {
          return vue.hideImage
        }
        vue.hideImage = !!v
        return this
      })

      interpreter.setNativeFunctionPrototype(
        manager,
        'addOnNextPageChange',
        function(func) {
          if (func) nextPageFuncs.push(func)
          return this
        }
      )

      interpreter.setNativeFunctionPrototype(
        manager,
        'removeOnNextPageChange',
        function(func) {
          let index = nextPageFuncs.findIndex(i => i === func)
          while (index > -1) {
            nextPageFuncs.splice(index, 1)
            index = nextPageFuncs.findIndex(i => i === func)
          }
          return this
        }
      )

      interpreter.setNativeFunctionPrototype(
        manager,
        'fullHeightImage',
        function(v) {
          if (!arguments.length) {
            return vue.fullScreenImage
          }
          vue.fullScreenImage = !!v
          return this
        }
      )

      interpreter.setNativeFunctionPrototype(manager, 'preload', function(
        target
      ) {
        vue.preloadPage(target, vue.getCurrentPageId())
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'preloadImage', function(
        locator,
        onLoadFunc,
        onErrorFunc
      ) {
        vue.preloadImage(
          _prepLocator(locator),
          false,
          () => {
            if (onLoadFunc) {
              interpreter.queueFunction(onLoadFunc, this)
              interpreter.run()
            }
          },
          e => {
            if (onErrorFunc) {
              interpreter.queueFunction(onErrorFunc, this, e)
              interpreter.run()
            }
          }
        )
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'oeosVersion', function(
        v
      ) {
        if (!arguments.length) return version
        return compareVersions(version, v)
      })

      interpreter.setNativeFunctionPrototype(manager, 'barColor', function(
        color
      ) {
        if (!arguments.length) {
          return vue.$vuetify.theme.themes.dark.primary
        }
        color = vue.validateHexColor(color)
        if (color instanceof vue.Interpreter.Throwable) return color
        vue.$vuetify.theme.themes.dark.primary = color
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'bgLockColor', function(
        color
      ) {
        if (!arguments.length) {
          return vue.forcedBackgroundColor
        }
        if (!color) {
          vue.forcedBackgroundColor = null
        }
        color = vue.validateHexColor(color)
        if (color instanceof vue.Interpreter.Throwable) return color
        vue.forcedBackgroundColor = color
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'bgColor', function(
        color
      ) {
        if (!arguments.length) {
          return vue.currentBackgroundColor
        }
        if (!color) {
          vue.backgroundColor = null
        }
        color = vue.validateHexColor(color)
        if (color instanceof vue.Interpreter.Throwable) return color
        vue.backgroundColor = color
        return this
      })

      interpreter.setNativeFunctionPrototype(
        manager,
        'getCurrentPageId',
        () => {
          return this.getCurrentPageId()
        }
      )
      interpreter.setNativeFunctionPrototype(manager, 'end', () => {
        navCounter++
        // TODO: display end modal
      })
      interpreter.setNativeFunctionPrototype(manager, 'goto', pageId => {
        try {
          return this.showPage(pageId)
        } catch (e) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            `Error loading page: ${pageId};  ${e.toString()}`
          )
        }
      })

      this.pagesInstance = interpreter.createObjectProto(proto)
      interpreter.setProperty(globalObject, 'pages', this.pagesInstance)

      // Add interpreted code
      interpreter.appendCode(pagesCode)
      interpreter.run()
    },
  },
}
