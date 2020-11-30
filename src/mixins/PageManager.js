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
        this.dispatchEvent({ target: this.pagesInstance, type: 'change' })
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
      const constructor = () => {
        throw new Error(
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

      interpreter.setNativeFunctionPrototype(manager, 'getNavId', () => {
        return navCounter
      })

      interpreter.setNativeFunctionPrototype(manager, 'getNavQueued', () => {
        // If more than one pages.goto(...) were executed in a row before the
        // interpreted script returns control to us, this will make sure only the last
        // goto is executed, just like the original EOS player
        navIndex--
        if (navIndex < 0) {
          navIndex = 0
        }
        return navIndex
      })

      interpreter.setNativeFunctionPrototype(manager, 'setImage', locator => {
        this.image = this.locatorLookup(locator)
      })

      interpreter.setNativeFunctionPrototype(manager, 'oeosVersion', v => {
        if (v === undefined) return version
        return compareVersions(version, v)
      })

      interpreter.setNativeFunctionPrototype(manager, 'setBarColor', color => {
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

      interpreter.setNativeFunctionPrototype(manager, 'setBgColor', color => {
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

      interpreter.setNativeFunctionPrototype(manager, 'getBgColor', () => {
        return this.currentBackgroundColor
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
