let idCounter = 0

export default {
  data: () => ({}),
  methods: {
    installPrompt(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        const optProps = opt.properties
        let id = '__prompt_' + ++idCounter
        const interaction = interpreter.createObjectProto(proto)
        this.$set(interaction, 'active', true)
        this.$set(interaction, 'value', null)
        interaction.setInactive = () => {
          this.$set(interaction, 'active', false)
        }
        interaction.id = id
        interaction.options = []
        for (const k of Object.keys(optProps)) {
          const val = optProps[k]
          if (typeof val !== 'object') {
            vue.$set(interaction, k, val) // make reactive
          } else {
            interaction[k] = val
          }
        }
        interaction.onInput = v => {
          if (!interaction.active) return
          interaction.setInactive()
          if (optProps.onInput) {
            this.$set(interaction, 'value', v)
            interpreter.queueFunction(optProps.onInput, opt, v)
            interpreter.run()
          }
        }
        this.addBubble('prompt', interaction)
        return interaction
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

      interpreter.setNativeFunctionPrototype(manager, 'input', function(val) {
        this.onInput(val)
      })

      interpreter.setNativeFunctionPrototype(manager, 'remove', function() {
        vue.removeBubble(this)
      })
    },
  },
}
