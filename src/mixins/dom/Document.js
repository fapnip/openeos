import EventManager from './EventManager'
import DOMTokenList from './DOMTokenList'
import HTMLElement from './HTMLElement'
import HTMLCollection from './HTMLCollection'
import CSSStyleDeclaration from './CSSStyleDeclaration'
let proto
const usedStyles = {}
const sheetClass = 'oeos-extracted-stylesheet'

// Probably should change this to allowed tags, but for now this should be okay.
// Really sanitizeHtml should catch all the bad stuff, this is just an extra check.
const blockedTags = {
  applet: true,
  script: true,
  link: true,
  iframe: true,
  meta: true,
  frameset: true,
  object: true,
  embed: true,
}

export default {
  mixins: [
    EventManager,
    CSSStyleDeclaration,
    DOMTokenList,
    HTMLElement,
    HTMLCollection,
  ],
  data: () => ({}),
  mounted() {
    // Remove styles that may have been added from previous mount
    const existingStyles = document.getElementsByClassName(sheetClass)
    for (const style of existingStyles) {
      style.remove()
    }
  },
  methods: {
    addStyles(styles) {
      // TODO:  Do all this in a better way
      if (typeof styles === 'string') {
        styles = [styles]
      }
      styles.forEach(style => {
        if (style) {
          style = style.trim()
          if (usedStyles[style]) {
            return this // already have it
          }
          const sanitized = this.sanitizeStyle(style)
          if (sanitized) {
            usedStyles[style] = true
            const el = document.createElement('style')
            el.setAttribute('type', 'text/css')
            el.setAttribute('class', sheetClass)
            el.textContent = sanitized
            document.head.appendChild(el)
          }
        }
      })
    },
    installDocument(interpreter, globalObject) {
      this.installEventManager(interpreter, globalObject)
      this.installCSSStyleDeclaration(interpreter, globalObject)
      this.installDOMTokenList(interpreter, globalObject)
      this.installHTMLElement(interpreter, globalObject)
      this.installHTMLCollection(interpreter, globalObject)
      const vue = this
      const constructor = opt => {
        return interpreter.createObjectProto(proto)
      }
      const manager = interpreter.createNativeFunction(constructor, true)
      proto = manager.properties['prototype']
      // interpreter.setProperty(globalObject, 'Document', manager)
      interpreter.setProperty(
        globalObject,
        'document',
        interpreter.createObjectProto(proto)
      )

      // Filter any create element
      ;['createElement'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          ...attr
        ) {
          const el = document[fnName](...attr)
          if (
            blockedTags[el.tagName.toLowerCase()] ||
            !vue.sanitizeHtml(el.outerHTML)
          ) {
            return interpreter.createThrowable(
              interpreter.TYPE_ERROR,
              "Sorry.  You can't make " + el.tagName + '.'
            )
          }
          vue.sanitizeHtml(el)

          return vue.getHTMLElementPseudo(el)
        })
      })
      // Don't really need to filter text nodes?
      ;['createTextNode'].forEach(fnName => {
        interpreter.setNativeFunctionPrototype(manager, fnName, function(
          ...attr
        ) {
          return vue.getHTMLElementPseudo(document[fnName](...attr))
        })
      })

      interpreter.setNativeFunctionPrototype(manager, 'addStyles', function(
        style
      ) {
        vue.addStyles(style)
        return this
      })
    },
  },
}
