let idCounter = 0

export default {
  data: () => ({}),
  methods: {
    installChoice(interpreter, globalObject) {
      const vue = this
      const constructor = opt => {
        const optProps = opt.properties
        let id = '__choice_' + ++idCounter

        const pseudoItem = interpreter.createObjectProto(proto)
        const interaction = {}
        interaction.pseudoItem = () => pseudoItem
        pseudoItem._item = interaction
        this.setBubbleCommon(interaction, optProps)
        interaction.id = id
        interaction.options = []
        this.$set(interaction, 'active', true)
        interaction.setInactive = () => {
          console.log('Setting inactive', interaction)
          this.$set(interaction, 'active', false)
        }

        const _doComplete = option => {
          if (optProps.onComplete) {
            interpreter.queueFunction(optProps.onComplete, pseudoItem, option)
            interpreter.run()
          }
        }

        const origOptions = (optProps.options || {}).properties || []
        const options = []

        for (const k of Object.keys(origOptions)) {
          const o = origOptions[k].properties
          const option = interpreter.pseudoToNative(origOptions[k])
          option.label = this.sanitizeHtml(o.label)
          option._index = parseInt(k, 10)
          if (!Object.prototype.hasOwnProperty.call(o, 'visible'))
            option.visible = true
          this.setReactive(option, ['label', 'visible', 'color', 'keep'])
          option.onSelect = () => {
            if (!option.keep) this.$set(interaction, 'selectedOption', option)
            if (interaction.active) {
              if (!option.keep) interaction.setInactive()
              const pseudoOpt = getOptionProto.call(interaction, option)
              if (o.onSelect) {
                console.log('Doing choice onSelect', option, o.onSelect)
                interpreter.queueFunction(o.onSelect, pseudoOpt, option._index)
                interpreter.run()
              }
              if (!option.keep) _doComplete(pseudoOpt)
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
              interpreter.queueFunction(optProps.onContinue, pseudoItem)
              interpreter.run()
            }
            _doComplete()
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
        this.$set(interaction, 'selectedOption', null)
        this.addBubble('choice', interaction)
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
      interpreter.setProperty(globalObject, 'Choice', manager)

      const optionConstructor = opt => {}
      const optionManager = interpreter.createNativeFunction(
        optionConstructor,
        true
      )
      interpreter.setProperty(
        optionManager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
      const optionProto = optionManager.properties['prototype']
      interpreter.setProperty(proto, 'Option', manager)

      function getOptionByIndex(choice, i) {
        if (!choice.options[i]) {
          return interpreter.createThrowable(
            interpreter.RANGE_ERROR,
            'Invalid option index: ' + i
          )
        }
        return choice.options[i]
      }

      const getOptionProto = function(option) {
        let opt = option._pseudoOption && option._pseudoOption()
        if (!opt) {
          opt = interpreter.createObjectProto(optionProto)
          opt._index = option._index
          option._pseudoOption = () => opt
          opt._choice = this
        }
        return opt
      }

      interpreter.setNativeFunctionPrototype(manager, 'getElement', function() {
        return vue.getHTMLElementPseudo(this._item._o_el, true)
      })

      interpreter.setNativeFunctionPrototype(manager, 'get', function(i) {
        const option = getOptionByIndex(this._item, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        return getOptionProto.call(this._item, option)
      })

      interpreter.setNativeFunctionPrototype(manager, 'active', function(v) {
        if (arguments.length === 1) {
          return this._item.active
        }
        this._item.active = !!v
        return this
      })

      interpreter.setNativeFunctionPrototype(manager, 'cancel', function() {
        this.onContinue()
      })

      interpreter.setNativeFunctionPrototype(
        optionManager,
        'remove',
        function() {
          return _remove.call(this._choice.pseudoItem(), this._index)
        }
      )
      interpreter.setNativeFunctionPrototype(
        optionManager,
        'select',
        function() {
          return _select.call(this._choice.pseudoItem(), this._index)
        }
      )
      interpreter.setNativeFunctionPrototype(optionManager, 'visible', function(
        ...args
      ) {
        return _visible.call(this._choice.pseudoItem(), this._index, ...args)
      })
      interpreter.setNativeFunctionPrototype(optionManager, 'keep', function(
        ...args
      ) {
        return _keep.call(this._choice.pseudoItem(), this._index, ...args)
      })
      interpreter.setNativeFunctionPrototype(optionManager, 'color', function(
        ...args
      ) {
        return _color.call(this._choice.pseudoItem(), this._index, ...args)
      })
      interpreter.setNativeFunctionPrototype(optionManager, 'label', function(
        ...args
      ) {
        return _label.call(this._choice.pseudoItem(), this._index, ...args)
      })
      interpreter.setNativeFunctionPrototype(
        optionManager,
        'parent',
        function() {
          return this._choice.pseudoItem()
        }
      )
      interpreter.setNativeFunctionPrototype(
        optionManager,
        'index',
        function() {
          return this._index
        }
      )

      const _remove = function(i) {
        if (arguments.length) {
          this._item.options.splice(i, 1)
          return this
        } else {
          vue.removeBubble(this._item)
        }
      }

      const _select = function(i) {
        const option = getOptionByIndex(this._item, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        option.onSelect()
      }

      const _visible = function(i, v) {
        const option = getOptionByIndex(this._item, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        if (arguments.length === 1) {
          return option.visible
        }
        option.visible = !!v
        return this
      }

      const _keep = function(i, v) {
        const option = getOptionByIndex(this._item, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        if (arguments.length === 1) {
          return option.keep
        }
        option.keep = !!v
        return this
      }

      const _color = function(i, color) {
        const option = getOptionByIndex(this._item, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        if (arguments.length === 1) {
          return option.color
        }
        color = vue.validateHTMLColor(color)
        if (color instanceof vue.Interpreter.Throwable) return color
        option.color = color
        return this
      }

      const _label = function(i, text) {
        const option = getOptionByIndex(this._item, i)
        if (option instanceof vue.Interpreter.Throwable) return option
        if (arguments.length === 1) {
          return option.label
        }
        if (text === undefined) text = ''
        option.label = text + ''
        return this
      }

      interpreter.setNativeFunctionPrototype(manager, 'remove', _remove)
      interpreter.setNativeFunctionPrototype(manager, 'select', _select)
      interpreter.setNativeFunctionPrototype(manager, 'visible', _visible)
      interpreter.setNativeFunctionPrototype(manager, 'keep', _keep)
      interpreter.setNativeFunctionPrototype(manager, 'color', _color)
      interpreter.setNativeFunctionPrototype(manager, 'label', _label)
    },
  },
}
