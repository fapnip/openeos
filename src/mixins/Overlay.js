let idCounter = 0
const overlayTypes = {
  image: 'image',
  video: 'video',
  page: 'page',
}
const overlays = {}

export default {
  data: () => ({
    pageOverlays: {},
    imageOverlays: {},
    videoOverlays: {},
  }),
  methods: {
    installOverlay(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        const optProps = opt.properties
        let type = overlayTypes[optProps.type] || Object.keys(overlayTypes)[0]
        let id = optProps.id || '-auto--' + ++idCounter
        let item = overlays[id]
        if (item) {
          delete this[item.type + 'Overlays'][id]
          delete overlays[id]
        }
        item = {}
        item.type = type
        item.id = id
        item.class = optProps.class
        const pseudoItem = interpreter.createObjectProto(proto)
        item.pseudoItem = () => pseudoItem
        pseudoItem._item = item
        this.$set(item, 'active', true)
        this.$set(item, 'value', null)
        item.setInactive = () => {
          this.$set(item, 'active', false)
        }
        item.id = id
        item.options = []
        item.onInput = v => {
          if (!item.active) return
          item.setInactive()
          if (optProps.onInput) {
            this.$set(item, 'value', v)
            interpreter.queueFunction(optProps.onInput, pseudoItem, v)
            interpreter.run()
          }
        }
        item.ready = el => {
          item._o_el = el
          if (optProps.ready) {
            interpreter.queueFunction(
              optProps.ready,
              pseudoItem,
              this.getHTMLElementPseudo(el, true)
            )
            interpreter.run()
          }
        }
        this[type + 'Overlays'][id] = item
        overlays[id] = item
        return pseudoItem
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      // interpreter.setProperty(
      //   manager,
      //   'prototype',
      //   interpreter.createObject(globalObject.properties['EventTarget']),
      //   this.Interpreter.NONENUMERABLE_DESCRIPTOR
      // )
      const proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'Overlay', manager)

      interpreter.setNativeFunctionPrototype(manager, 'getElement', function() {
        return vue.getHTMLElementPseudo(this._item._o_el, true)
      })

      interpreter.setNativeFunctionPrototype(manager, 'getId', function() {
        return this._item.id
      })

      // interpreter.setNativeFunctionPrototype(manager, 'getElement', function() {
      //   return vue.getHTMLElementPseudo(this._item._o_el, true)
      // })

      interpreter.setNativeFunctionPrototype(manager, 'remove', function() {
        const item = this._item
        delete vue[item.type + 'Overlays'][item.id]
        delete overlays[item.id]
      })
    },
  },
}
