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
    },
  },
}

export default function(html) {
  if (typeof html !== 'string') return ''
  return xss(html, filter)
}
