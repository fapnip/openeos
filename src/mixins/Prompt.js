let idCounter = 0

export default {
  data: () => ({}),
  methods: {
    installPrompt(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        const optProps = opt.properties
        let id = '__prompt_' + ++idCounter
        const pseudoItem = interpreter.createObjectProto(proto)
        const interaction = {}
        interaction.pseudoItem = () => pseudoItem
        pseudoItem._item = interaction
        this.setBubbleCommon(interaction, optProps)
        this.$set(interaction, 'active', true)
        // this.$set(interaction, 'value', null)
        this.$set(interaction, 'value', (optProps.value || '') + '')
        interaction.setInactive = () => {
          this.$set(interaction, 'active', false)
        }
        interaction.id = id
        interaction.options = []
        interaction.onInput = v => {
          if (!interaction.active) return
          this.debug('Got input', v)
          interaction.setInactive()
          if (optProps.onInput) {
            this.$set(interaction, 'value', v)
            interpreter.queueFunction(optProps.onInput, pseudoItem, v)
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
        this.addBubble('prompt', interaction)
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
      interpreter.setProperty(globalObject, 'Prompt', manager)

      interpreter.setNativeFunctionPrototype(manager, 'getElement', function() {
        return vue.getHTMLElementPseudo(this._item._o_el, true)
      })

      interpreter.setNativeFunctionPrototype(manager, 'input', function(val) {
        this._item.onInput(val)
      })

      interpreter.setNativeFunctionPrototype(manager, 'remove', function() {
        vue.removeBubble(this)
      })
    },
  },
}
