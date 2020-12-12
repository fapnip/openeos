import { parseEosDuration } from '../util'

let idCounter = 0

function getWaitMode(interpreter, opt) {
  const nativeOpt = interpreter.pseudoToNative(opt)
  const nextCommand = nativeOpt.nextCommand || { type: 'none' }
  switch (nativeOpt.mode || 'auto') {
    case 'auto':
      switch (nextCommand.type) {
        case 'choice':
        case 'prompt':
          return 'instant'
        case 'say':
          return 'pause'
        case 'timer':
          return nextCommand.isAsync ? 'instant' : 'pause'
        default:
          return 'pause'
      }
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
        const optProps = opt.properties
        let id = '__say_' + ++idCounter
        const pseudoItem = interpreter.createObjectProto(proto)
        const interaction = {}
        interaction.pseudoItem = () => pseudoItem
        pseudoItem._item = interaction
        this.$set(interaction, 'active', true)
        interaction.setInactive = () => {
          this.$set(interaction, 'active', false)
        }
        interaction.id = id
        console.log('Iterating:', opt, Object.keys(optProps))
        for (const k of Object.keys(optProps)) {
          const val = optProps[k]
          if (k === 'label') {
            vue.$set(interaction, k, this.sanitizeHtml(val)) // make reactive
          } else if (typeof val !== 'object' || val === null) {
            vue.$set(interaction, k, val) // make reactive
          } else {
            // interaction[k] = val
          }
        }
        this.setReactive(interaction, ['label', 'color'])
        interaction.mode = interaction.mode || 'auto'
        interaction.isAuto = interaction.mode === 'auto'
        interaction.mode = getWaitMode(interpreter, opt)
        interaction.onContinue = () => {
          if (!interaction.active) return
          interaction.setInactive()
          if (optProps.onContinue) {
            console.log('Doing say onContinue', optProps.onContinue)
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
