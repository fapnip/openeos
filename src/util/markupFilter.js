import xss from 'xss'

const filter = {
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
      top: true,
      left: true,
      right: true,
      bottom: true,
      height: true,
      width: true,
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
      'border-width': true,
      'border-style': true,
      'border-color': true,
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
