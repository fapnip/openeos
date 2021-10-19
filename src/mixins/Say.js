import { parseEosDuration } from '../util'

let idCounter = 0

function getWaitMode(interpreter, opt) {
  const nativeOpt = interpreter.pseudoToNative(opt)
  const nextCommand = nativeOpt.nextCommand || { isPrompt: false }
  switch (nativeOpt.mode || 'auto') {
    case 'auto':
      return nextCommand.isPrompt ? 'instant' : 'pause'
    default:
      return nativeOpt.mode || 'instant'
  }
}

export default {
  data: () => ({}),
  methods: {
    installSay(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        if (typeof opt === 'string') {
          opt = interpreter.nativeToPseudo({
            label: opt,
          })
        }
        const optProps = opt.properties
        let id = '__say_' + ++idCounter
        const pseudoItem = interpreter.createObjectProto(proto)
        const interaction = {}
        interaction.pseudoItem = () => pseudoItem
        pseudoItem._item = interaction
        this.setBubbleCommon(interaction, optProps)
        this.$set(interaction, 'active', true)
        interaction.setInactive = () => {
          this.$set(interaction, 'lock', false)
          this.$set(interaction, 'active', false)
        }
        interaction.id = id
        this.debug('Iterating:', opt, Object.keys(optProps))
        this.setReactive(interaction, ['label', 'color'])
        interaction.mode =
          interaction.insertAt &&
          (!interaction.mode || interaction.mode == 'auto')
            ? 'instant'
            : interaction.mode || 'auto'
        interaction.isAuto = interaction.mode === 'auto'
        interaction.mode = interaction.insertAt
          ? interaction.mode
          : getWaitMode(interpreter, opt)
        interaction.onContinue = () => {
          if (!interaction.active) return
          interaction.setInactive()
          if (optProps.onContinue) {
            this.debug('Doing say onContinue', optProps.onContinue)
            interpreter.queueFunction(optProps.onContinue, pseudoItem)
            interpreter.run()
          }
        }
        interaction.ready = el => {
          interaction._o_el = el
          if (optProps.ready) {
            interpreter.queueFunction(
              optProps.ready,
              pseudoItem,
              this.getHTMLElementPseudo(el, true)
            )
            interpreter.run()
          }
        }
        interaction.duration = parseEosDuration(optProps.duration || '0s')
        this.addBubble('say', interaction)
        return pseudoItem
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      interpreter.setProperty(
        manager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
      const proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'Say', manager)

      interpreter.setNativeFunctionPrototype(manager, 'getElement', function() {
        return vue.getHTMLElementPseudo(this._item._o_el, true)
      })

      interpreter.setNativeFunctionPrototype(manager, 'active', function(v) {
        if (arguments.length === 1) {
          return this._item.active
        }
        this._item.active = !!v
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'lock', function(val) {
        if (!arguments.length) {
          return this._item.lock || false
        }
        this._item.lock = !!val
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'label', function(val) {
        if (!arguments.length) {
          return this._item.label
        }
        this._item.label = vue.sanitizeHtml(val)
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'color', function(val) {
        if (!arguments.length) {
          return this._item.color
        }
        this._item.color = val
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'remove', function() {
        vue.removeBubble(this._item)
      })
    },
  },
}
