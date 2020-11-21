import pageCompiler from '../util/pageCompiler'
import pagesCode from '!!raw-loader!../interpreter/code/pages.js'
import minimatch from 'minimatch'

let navCounter = 0
let disabledPages = {}
let pageScripts = {}

export default {
  data: () => ({
    pagesTarget: null,
    currentPageId: 'start',
    commandIndex: 0,
  }),
  mounted() {
    navCounter = 0
    pageScripts = {}
    disabledPages = {}
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
    getCurrentPageId() {
      return this.currentPageId
    },
    beforePageChange() {
      this.purgePageTimers()
      this.purgePageInteractions()
      this.purgePageSounds()
    },
    showPage(pageId) {
      // TODO
      console.warn('Showing Page:', pageId)
      const page = this.getPage(pageId)
      const interpreter = this.interpreter
      // this.dispatchEvent({
      //   target: this.pagesTarget,
      //   type: 'change',
      //   value: pageId,
      // })
      let pageScript = pageScripts[pageId]
      if (!pageScript) {
        pageScript = pageCompiler(page, interpreter, interpreter.globalObject)
        pageScripts[pageId] = pageScript
      }
      let pageCode = pageScript.code
      if (!pageCode) {
        console.log('Building "' + pageId + '" page script', pageScript.script)
        pageCode = this.interpreter.parseCode(pageScript.script)
        pageScript.code = pageCode
      }
      this.currentPageId = pageId
      navCounter++
      this.beforePageChange()
      interpreter.appendCode(pageCode)
    },
    getPage(pageId) {
      const result = this.pages()[pageId]
      if (!result) throw new Error(`Invalid page: ${pageId}`)
      return result
    },
    buildIfCommand(command) {},
    buildCommand(command) {
      const commandName = Object.keys(command)[0]
      switch (commandName) {
        case 'if':
          return this.buildIfCommand()
        case 'noop':
          break
        default:
          console.error('Unknown command:', commandName)
      }
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
          throw new TypeError('pageId must be a string')
        }

        return this.isPageEnabled(pageId)
      })
      interpreter.setNativeFunctionPrototype(manager, 'enable', pattern => {
        if (typeof pattern !== 'string') {
          throw new TypeError('pattern must be a string')
        }

        this.enablePage(pattern)
      })
      interpreter.setNativeFunctionPrototype(manager, 'disable', pattern => {
        if (typeof pattern !== 'string') {
          throw new TypeError('pattern must be a string')
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
          interpreter.throwException(
            interpreter.RANGE_ERROR,
            'Invalid page: ' + pageId
          )
          return false
        }
        return this.showPage(pageId)
      })

      this.pagesTarget = interpreter.createObjectProto(proto)
      interpreter.setProperty(globalObject, 'pages', this.pagesTarget)

      // Add interpreted code
      interpreter.appendCode(pagesCode)
      interpreter.run()
    },
  },
}
