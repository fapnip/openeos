import DOMPurify from 'dompurify'
const allowedDomains = /^(https:\/\/milovana\.com\/|https:\/\/oeos-player-preview\.herokuapp\.com\/)/
const cssUrlMatcher = /url[\s ]*\(['"\s ]*()([^)'"]+)['"\s ]*\)/gi

export default {
  data: () => ({}),
  mounted() {
    DOMPurify.addHook('beforeSanitizeAttributes', (node, data, config) => {
      if (node instanceof Element) {
        if (node.hasAttribute('style')) {
          node.setAttribute(
            'style',
            this.sanitizeStyle(node.getAttribute('style'))
          )
        }

        if (node.hasAttribute('src')) {
          node.setAttribute(
            'src',
            this.locatorLookup(node.getAttribute('src')).href
          )
        }

        if (node.hasAttribute('srcset')) {
          const srcset = node.getAttribute('srcset').split(',')
          for (let i = 0, l = srcset.length; i < l; i++) {
            srcset[i] = this.locatorLookup(srcset[i]).href
          }
          node.setAttribute('srcset', srcset.join(','))
        }

        if (node.hasAttribute('href')) {
          if (!node.getAttribute('href').match(allowedDomains)) {
            console.error('Blocked invalid href: ' + node.getAttribute('href'))
            node.setAttribute('href', '#invalid-href')
          }
        }
      }
    })
    DOMPurify.addHook('uponSanitizeElement', (node, data, config) => {
      // Do something with the current node and return it
      // You can also mutate hookEvent (i.e. set hookEvent.forceKeepAttr = true)
      if (data.tagName === 'style') {
        let style = node.textContent
        node.textContent = this.sanitizeStyle(style)
      }
      return node
    })
  },
  methods: {
    sanitizeStyle(style) {
      if (style.match(/@import/i)) {
        console.error('@import not allowed in stylesheet', style)
        return ''
      }
      if (style.match(/expression/i)) {
        console.error('expression not allowed in stylesheet', style)
        return ''
      }
      let match
      while ((match = cssUrlMatcher.exec(style)) !== null) {
        const locator = this.locatorLookup(match[2].trim())
        const replacement = `url("${locator.href}")`
        // console.error(`Invalid URL ${match[0]}`, style, match)
        style = style.replaceAll(match[0], replacement)
      }
      return style
    },
    sanitizeHtml(html) {
      if (typeof html !== 'string' || !html) return ''
      const result = DOMPurify.sanitize(html, {
        // FORCE_BODY: false,
        IN_PLACE: true,
      })
      return result
    },
  },
}
