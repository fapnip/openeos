import DOMPurify from 'dompurify'
const allowedDomains = /^(https:\/\/milovana\.com\/|https:\/\/oeos\.ml\/|https:\/\/oeos-player-preview\.herokuapp\.com\/|https:\/\/github.com\/fapnip\/)/
const cssUrlMatcher = /url[\s ]*\(['"\s ]*()([^)'"]+)['"\s ]*\)/gi

export default {
  data: () => ({}),
  mounted() {
    DOMPurify.addHook('beforeSanitizeAttributes', (node, data, config) => {
      if (node instanceof Element) {
        for (let i = 0, atts = node.attributes, n = atts.length; i < n; i++) {
          const att = atts[i]
          if (att.name.match(/^(style)$/i)) {
            att.value = this.sanitizeStyle(att.value)
          } else if (att.name.match(/^(src)$/i)) {
            att.value = this.sanitizeSrc(att.value)
          } else if (att.name.match(/^(srcset)$/i)) {
            att.value = this.sanitizeSrcSet(att.value)
          } else if (
            att.name.match(
              /^(href|action|data|cite|profile|classid|codebase|formaction|manifest|poster|archive|longdesc|usemap|xlink:href)$/i
            )
          ) {
            att.value = this.sanitizeHref(att.value)
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
    DOMPurify.addHook('afterSanitizeAttributes', function(node) {
      // set all elements owning target to target=_blank
      if ('target' in node) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener')
      }
    })
  },
  methods: {
    sanitizeHref(href) {
      if (!href.match(allowedDomains)) {
        console.error('Blocked invalid href: ' + href)
        return '#invalid-href'
      }
      return href
    },
    sanitizeSrc(url) {
      return this.locatorLookup(url).href
    },
    sanitizeSrcSet(url) {
      // TODO: update to work with all srcsets
      const srcset = url.split(',')
      for (let i = 0, l = srcset.length; i < l; i++) {
        srcset[i] = this.sanitizeSrc(srcset[i])
      }
      return srcset.join(',')
    },
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
        const replacement = `url("${this.sanitizeSrc(match[2].trim())}")`
        style = style.replaceAll(match[0], replacement)
      }
      return style
    },
    sanitizeHtml(html) {
      if (typeof html !== 'string' || !html) return ''
      const result = DOMPurify.sanitize(html, {
        // FORCE_BODY: false,
        IN_PLACE: true,
        ADD_ATTR: ['target'],
      })
      return result
    },
  },
}
