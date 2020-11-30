let idCounter = 0

export default {
  data: () => ({}),
  methods: {
    installChoice(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        const optProps = opt.properties
        let id = '__choice_' + ++idCounter

        const interaction = interpreter.createObjectProto(proto)
        interaction.id = id
        interaction.options = []
        this.$set(interaction, 'active', true)
        interaction.setInactive = () => {
          this.$set(interaction, 'active', false)
        }

        const origOptions = (optProps.options || {}).properties || []
        const options = []

        for (const k of Object.keys(origOptions)) {
          const option = {}
          const o = origOptions[k].properties
          for (var i in o) {
            option[i] = o[i]
          }
          option.onSelect = () => {
            this.$set(interaction, 'selectedOption', option)
            if (interaction.active) {
              interaction.setInactive()
              if (o.onSelect) {
                console.log('Doing choice onSelect', o.onSelect)
                interpreter.queueFunction(o.onSelect, opt)
                interpreter.run()
              }
            }
          }
          options.push(option)
        }
        this.$set(interaction, 'options', options)
        interaction.onContinue = () => {
          if (interaction.active) {
            interaction.setInactive()
            if (optProps.onContinue) {
              console.log('Doing choice onContinue')
              interpreter.queueFunction(optProps.onContinue, opt)
              interpreter.run()
            }
          }
        }
        this.$set(interaction, 'selectedOption', null)
        this.addBubble('choice', interaction)
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
      interpreter.setProperty(globalObject, 'Choice', manager)

      function getOptionByIndex(i) {
        if (!this.options[i]) {
          return interpreter.createThrowable(
            interpreter.RANGE_ERROR,
            'Invalid option index: ' + i
          )
        }
        return this.options[i]
      }

      interpreter.setNativeFunctionPrototype(manager, 'remove', function(i) {
        if (i !== undefined) {
          if (getOptionByIndex(i)) this.options.splice(i, 1)
        } else {
          vue.removeBubble(this)
        }
      })

      interpreter.setNativeFunctionPrototype(manager, 'select', function(i) {
        if (getOptionByIndex(i)) this.options[i].onSelect()
      })

      interpreter.setNativeFunctionPrototype(manager, 'cancel', function(i) {
        this.onContinue()
      })
    },
  },
}
