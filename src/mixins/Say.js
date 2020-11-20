import { parseEosDuration } from '../util'

let idCounter = 0

function getWaitMode(interpreter, opt) {
  const nativeOpt = interpreter.pseudoToNative(opt)
  const nextCommand = nativeOpt.nextCommand || { type: 'none' }
  switch (nativeOpt.mode || '') {
    case 'auto':
      switch (nextCommand.type) {
        case 'choice':
        case 'prompt':
          return 'instant'
        case 'say':
          return 'autoplay'
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
        const interaction = interpreter.createObjectProto(proto)
        this.$set(interaction, 'active', true)
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
        this.$set(interaction, 'label', interaction.label)
        interaction.isAuto = interaction.mode === 'auto'
        interaction.mode = getWaitMode(interpreter, opt)
        interaction.onContinue = () => {
          if (!interaction.active) return
          interaction.setInactive()
          if (optProps.onContinue) {
            console.log('Doing say onContinue', optProps.onContinue)
            interpreter.queueFunction(optProps.onContinue, opt)
            interpreter.run()
          }
        }
        interaction.duration = parseEosDuration(optProps.duration || '0s')
        this.addInteraction('say', interaction)
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
      interpreter.setProperty(globalObject, 'Say', manager)

      interpreter.setNativeFunctionPrototype(manager, 'update', function(val) {
        vue.$set(this, 'label', val)
      })

      interpreter.setNativeFunctionPrototype(manager, 'remove', function() {
        vue.removeInteraction(this)
      })
    },
  },
}
