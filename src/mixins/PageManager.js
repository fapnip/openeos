import pageCompiler from '../util/pageCompiler'
import pagesCode from '!!raw-loader!../interpreter/code/pages.js'
import minimatch from 'minimatch'
import compareVersions from 'compare-versions'
import { version } from '../../package.json'

let navCounter = 0
let navIndex = 0
let disabledPages = {}
let pageScripts = {}
const preloadedPage = {}
let lastGetPageId = null
let captureImageClicks = false
let capturePageClicks = false

import { validateHTMLColorHex } from 'validate-color'

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
    pageScripts = {}
    disabledPages = {}
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
    capturePageClicks() {
      return capturePageClicks
    },
    isPageEnabled(pageId) {
      return !disabledPages[pageId]
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
    getPageScript(pageId) {
      const page = this.getPage(pageId)
      let pageScript = pageScripts[pageId]
      if (!pageScript) {
        pageScript = pageCompiler(page)
        pageScripts[pageId] = pageScript
        // console.log('Page Script: ' + pageId, pageScript.script)
      }
      return pageScript
    },
    getCurrentPageId() {
      return this.currentPageId
    },
    beforePageChange() {
      this.purgePageTimers()
      this.purgePageBubbles()
      this.purgePageSounds()
    },
    showPage(patten, noRun) {
      console.warn('Showing Page:', patten)
      const interpreter = this.interpreter
      const pageScript = this.getPageScript(patten)
      const pageId = lastGetPageId
      const pageKeys = Object.keys(this.pages())
      const pageIndex = pageKeys.indexOf(pageId)
      let pageCode = pageScript.code
      if (!pageCode) {
        // console.log('Building "' + pageId + '" page script', pageScript.script)
        pageCode = interpreter.parseCode(pageScript.script)
        pageScript.code = pageCode
      }
      this.preloadPage(pageId, this.lastPageId, true)
      const preloadedPages = {}
      for (const target of Object.keys(pageScript.targets)) {
        this.preloadPage(target, pageId)
        preloadedPages[lastGetPageId] = true
      }
      if (pageIndex > -1) {
        const nextPagePreload = pageKeys[pageIndex + 1]
        if (nextPagePreload && !preloadedPages[nextPagePreload]) {
          this.preloadPage(nextPagePreload)
        }
      }
      this.lastPageId = this.currentPageId
      this.currentPageId = pageId
      navCounter++ // Increment nav counter so we know when to stop executing page commands
      navIndex++ // Increment nav depth, so we know to skip consecutive gotos.
      this.beforePageChange()
      try {
        this.dispatchEvent({
          target: this.pagesInstance,
          type: 'change',
          value: {
            to: pageId,
            from: this.lastPageId,
          },
        })
      } catch (e) {
        return interpreter.createThrowable(interpreter.TYPE_ERROR, e.toString())
      }
      if (this.hasWaitingPreloads()) {
        this.addAfterPreload(() => {
          interpreter.appendCode(pageCode)
          if (!noRun) interpreter.run()
        })
      } else {
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

      interpreter.setNativeFunctionPrototype(manager, 'galleries', () => {
        return interpreter.nativeToPseudo(Object.keys(this.galleries()))
      })

      interpreter.setNativeFunctionPrototype(manager, 'files', () => {
        return interpreter.nativeToPseudo(Object.keys(this.files()))
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

      interpreter.setNativeFunctionPrototype(manager, 'enable', pattern => {
        if (typeof pattern !== 'string') {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'pattern must be a string'
          )
        }

        this.enablePage(pattern)
      })
      interpreter.setNativeFunctionPrototype(manager, 'disable', pattern => {
        if (typeof pattern !== 'string') {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'pattern must be a string'
          )
        }

        this.disablePage(pattern)
      })

      interpreter.setNativeFunctionPrototype(
        manager,
        'clearInteractions',
        () => {
          this.purgePageBubbles()
        }
      )

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
        v => {
          if (!arguments.length) {
            return captureImageClicks
          }
          captureImageClicks = !!v
        }
      )

      // interpreter.setNativeFunctionPrototype(
      //   manager,
      //   'capturePageClicks',
      //   v => {
      //     if (!arguments.length) {
      //       return capturePageClicks
      //     }
      //     capturePageClicks = !!v
      //   }
      // )

      interpreter.setNativeFunctionPrototype(manager, 'clearBubbles', () => {
        this.purgePageBubbles()
      })

      interpreter.setNativeFunctionPrototype(manager, 'hideBubbles', v => {
        if (!arguments.length) {
          return this.hideBubbles
        }
        this.hideBubbles = !!v
      })

      interpreter.setNativeFunctionPrototype(manager, 'getImage', () => {
        return interpreter.nativeToPseudo(this.image)
      })

      interpreter.setNativeFunctionPrototype(manager, 'setImage', locator => {
        this.image = this.locatorLookup(_prepLocator(locator))
      })

      interpreter.setNativeFunctionPrototype(manager, 'fullHeightImage', v => {
        if (!arguments.length) {
          return this.fullScreenImage
        }
        this.fullScreenImage = !!v
      })

      interpreter.setNativeFunctionPrototype(manager, 'preloadImage', function(
        locator,
        onLoadFunc,
        onErrorFunc
      ) {
        this.image = vue.preloadImage(
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
      })

      interpreter.setNativeFunctionPrototype(manager, 'oeosVersion', v => {
        if (!arguments.length) return version
        return compareVersions(version, v)
      })

      interpreter.setNativeFunctionPrototype(manager, 'barColor', color => {
        if (!arguments.length) {
          return this.$vuetify.theme.themes.dark.primary
        }
        if (!validateHTMLColorHex(color)) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            `Invalid HEX color: ${color}`
          )
        }
        this.$vuetify.theme.themes.dark.primary = color
      })

      interpreter.setNativeFunctionPrototype(manager, 'lockBgColor', color => {
        if (!color) {
          this.forcedBackgroundColor = null
        }
        if (!validateHTMLColorHex(color)) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            `Invalid HEX color: ${color}`
          )
        }
        this.forcedBackgroundColor = color
      })

      interpreter.setNativeFunctionPrototype(manager, 'bgColor', color => {
        if (!arguments.length) {
          return this.currentBackgroundColor
        }
        if (!color) {
          this.backgroundColor = null
        }
        if (!validateHTMLColorHex(color)) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            `Invalid HEX color: ${color}`
          )
        }
        this.backgroundColor = color
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
