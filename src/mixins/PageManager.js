import pageCompiler from '../util/pageCompiler'
import pagesCode from '!!raw-loader!../interpreter/code/pages.js'
import minimatch from 'minimatch'

let navCounter = 0
let disabledPages = {}
let pageScripts = {}
const preloaded = {}

export default {
  data: () => ({
    pagesInstance: null,
    currentPageId: 'start',
    lastPageId: '',
    commandIndex: 0,
    preloadImages: [],
  }),
  mounted() {
    navCounter = 0
    pageScripts = {}
    disabledPages = {}
  },
  methods: {
    addPreload(file, asType) {
      if (file && !file.error && !preloaded[file.href]) {
        preloaded[file.href] = true
        this.preloadImages.push(file)
        var preload = document.createElement('link')
        preload.rel = 'preload'
        preload.href = file.href
        preload.as = asType
        preload.onload = function() {
          this.remove() // Remove preload element now that it's loaded
        }
        document.head.appendChild(preload)
      }
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
      }
      return pageScript
    },
    getCurrentPageId() {
      return this.currentPageId
    },
    beforePageChange() {
      this.purgePageTimers()
      this.purgePageInteractions()
      this.purgePageSounds()
    },
    preloadPage(pageId, parentPageId) {
      if (!this.pages()[pageId]) {
        console.warn(`Linked pageId "${pageId}" in ${parentPageId} not found.`)
        return
      }
      const pageScript = this.getPageScript(pageId)
      for (const image of Object.keys(pageScript.images)) {
        const file = this.locatorLookup(image, true)
        this.addPreload(file, 'image')
      }
      for (const sound of Object.keys(pageScript.sounds)) {
        const file = this.locatorLookup(sound, true)
        this.addPreload(file, 'audio')
      }
    },
    showPage(pageId) {
      // TODO
      console.warn('Showing Page:', pageId)
      const interpreter = this.interpreter
      const pageScript = this.getPageScript(pageId)
      let pageCode = pageScript.code
      if (!pageCode) {
        // console.log('Building "' + pageId + '" page script', pageScript.script)
        pageCode = this.interpreter.parseCode(pageScript.script)
        pageScript.code = pageCode
      }
      this.preloadPage(pageId, this.lastPageId)
      for (const target in Object.keys(pageScript.targets)) {
        this.preloadPage(target, pageId)
      }
      this.lastPageId = this.currentPageId
      this.currentPageId = pageId
      navCounter++
      this.beforePageChange()
      this.dispatchEvent({ target: this.pagesInstance, type: 'change' })
      interpreter.appendCode(pageCode)
    },
    getPage(pageId) {
      const result = this.pages()[pageId]
      if (!result) {
        console.warn('Script pages', this.pages())
        throw new Error(`Invalid page: ${pageId}`)
      }
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
          this.purgePageInteractions()
        }
      )

      interpreter.setNativeFunctionPrototype(manager, 'getNavId', () => {
        return navCounter
      })

      interpreter.setNativeFunctionPrototype(manager, 'setImage', locator => {
        this.image = this.locatorLookup(locator)
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
        const page = this.pages()[pageId]
        if (!page) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'Invalid page: ' + pageId
          )
        }
        return this.showPage(pageId)
      })

      this.pagesInstance = interpreter.createObjectProto(proto)
      interpreter.setProperty(globalObject, 'pages', this.pagesInstance)

      // Add interpreted code
      interpreter.appendCode(pagesCode)
      interpreter.run()
    },
  },
}
