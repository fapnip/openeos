import xss from 'xss'

const filter = {
  onIgnoreTagAttr: function(tag, name, value, isWhiteAttr) {
    if (name.match(/^data-oeos-/)) {
      // escape its value using built-in escapeAttrValue function
      return name + '="' + xss.escapeAttrValue(value) + '"'
    }
  },
  whiteList: {
    br: [],
    b: [],
    i: [],
    u: [],
    strong: [],
    em: [],
    p: ['class', 'style'],
    span: ['class', 'style'],
    div: ['class', 'style'],
  },
  css: {
    whiteList: {
      color: true,
      display: true,
      cursor: true,
      top: true,
      left: true,
      right: true,
      bottom: true,
      height: true,
      width: true,
      padding: true,
      'padding-top': true,
      'padding-left': true,
      'padding-right': true,
      'padding-bottom': true,
      margin: true,
      'margin-top': true,
      'margin-left': true,
      'margin-right': true,
      'margin-bottom': true,
      'max-width': true,
      'max-height': true,
      'min-width': true,
      'min-height': true,
      'text-align': true,
      'font-size': true,
      'letter-spacing': true,
      'font-family': true,
      'background-color': true,
      flex: true,
      'flex-direction': true,
      'flex-flow': true,
      'flex-shrink': true,
      border: true,
      'border-top': true,
      'border-left': true,
      'border-right': true,
      'border-bottom': true,
      'border-width': true,
      'border-style': true,
      'border-color': true,
      'border-radius': true,
      'box-shadow': true,
      'box-sizing': true,
      overflow: true,
      'overflow-x': true,
      'overflow-y': true,
      transition: true,
      'transition-delay': true,
      'transition-duration': true,
      'transition-property': true,
      'transition-timing-function': true,
    },
  },
}

export default function(html) {
  if (typeof html !== 'string') return ''
  return xss(html, filter)
}
