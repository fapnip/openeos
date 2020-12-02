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

        const _doComplete = selectedIndex => {
          if (optProps.onComplete) {
            interpreter.queueFunction(
              optProps.onComplete,
              interaction,
              selectedIndex === undefined ? -1 : selectedIndex
            )
            interpreter.run()
          }
        }

        const origOptions = (optProps.options || {}).properties || []
        const options = []

        for (const k of Object.keys(origOptions)) {
          const option = interpreter.pseudoToNative(origOptions[k])
          const o = origOptions[k].properties
          if (origOptions.visible === undefined) option.visible = true
          this.setReactive(option, ['label', 'visible', 'color'])
          option.onSelect = () => {
            this.$set(interaction, 'selectedOption', option)
            if (interaction.active) {
              interaction.setInactive()
              if (o.onSelect) {
                console.log('Doing choice onSelect', o.onSelect)
                interpreter.queueFunction(o.onSelect, opt)
                interpreter.run()
              }
              _doComplete(parseInt(k, 10))
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
            _doComplete()
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

      function getOptionByIndex(choice, i) {
        if (!choice.options[i]) {
          return interpreter.createThrowable(
            interpreter.RANGE_ERROR,
            'Invalid option index: ' + i
          )
        }
        return choice.options[i]
      }

      interpreter.setNativeFunctionPrototype(manager, 'remove', function(i) {
        if (arguments.length) {
          const option = getOptionByIndex(this, i)
          if (option instanceof vue.Interpreter.Throwable) return option
          this.options.splice(i, 1)
          return this
        } else {
          vue.removeBubble(this)
        }
      })

      interpreter.setNativeFunctionPrototype(manager, 'select', function(i) {
        const option = getOptionByIndex(this, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        option.onSelect()
      })

      interpreter.setNativeFunctionPrototype(manager, 'visible', function(
        i,
        v
      ) {
        const option = getOptionByIndex(this, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        if (arguments.length === 1) {
          return option.visible
        }
        option.visible = !!v
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'color', function(
        i,
        color
      ) {
        const option = getOptionByIndex(this, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        if (arguments.length === 1) {
          return option.color
        }
        color = vue.validateHexColor(color)
        if (color instanceof vue.Interpreter.Throwable) return color
        option.color = color
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'label', function(
        i,
        text
      ) {
        const option = getOptionByIndex(this, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        if (arguments.length === 1) {
          return option.label
        }
        if (text === undefined) text = ''
        option.label = text + ''
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'cancel', function(i) {
        this.onContinue()
      })
    },
  },
}
