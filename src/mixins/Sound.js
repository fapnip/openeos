import { Howl, Howler } from 'howler'

let idCounter = 0

export default {
  data: () => ({
    sounds: {},
  }),
  methods: {
    purgePageSounds() {
      for (const k of Object.keys(this.sounds)) {
        const item = this.sounds[k]
        if (!item.options.background) {
          item.sound.stop()
          if (item.options.fromPageScript) {
            item.sound.unload()
            delete this.sounds[k]
          }
        }
      }
    },
    installSound(interpreter, globalObject) {
      const vue = this
      const constructor = (opt, fromPageScript) => {
        const options = interpreter.pseudoToNative(opt)
        const file = this.locatorLookup(options.locator)
        if (!file.item) {
          return interpreter.createThrowable(
            interpreter.ERROR,
            'Invalid sound locator: ' + options.locator
          )
        }
        if (!options.id) {
          options.id = '__sound_' + ++idCounter
        }
        options.fromPageScript = fromPageScript

        if (typeof options.id !== 'string') {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'Given id must be undefined or a string'
          )
        }

        if (this.sounds[options.id]) {
          const result = this.sounds[options.id]
          result.loopCount = result.loops
          result.sound.play()
          return result
        }

        const item = interpreter.createObjectProto(proto)
        item.options = options
        item.sound = sound
        item.loops = options.loops || 0
        item.loop = item.loops > 1 || item.loops === 0
        item.loopCount = item.loops

        const sound = new Howl({
          src: [file.href],
          loop: item.loop,
          autoPlay: true,
          volume: options.volume === undefined ? 1 : options.volume,
        })

        item.sound = sound

        this.sounds[options.id] = item

        sound.on('end', () => {
          if (item.loop && item.loops > 1) {
            item.loopCount--
            if (!item.loopCount) {
              sound.stop()
            }
          }
        })
        ;['play', 'end', 'pause'].forEach(type => {
          sound.on(type, () => {
            this.dispatchEvent({ target: item, type })
          })
        })

        sound.play()
        console.log('Adding sound', item)
        return item
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      interpreter.setProperty(
        manager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
      const proto = manager.properties['prototype']
      interpreter.setProperty(globalObject, 'Sound', manager)

      interpreter.setProperty(
        manager,
        'get',
        interpreter.createNativeFunction(id => {
          if (typeof id !== 'string') {
            return interpreter.createThrowable(
              interpreter.TYPE_ERROR,
              'Given id must be undefined or a string'
            )
          }
          return this.sounds[id]
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        manager,
        'volume',
        interpreter.createNativeFunction(volume => {
          return Howler.volume(volume)
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        manager,
        'mute',
        interpreter.createNativeFunction(muted => {
          return Howler.mute(muted === undefined ? true : muted)
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        manager,
        'stop',
        interpreter.createNativeFunction(() => {
          return Howler.stop()
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setNativeFunctionPrototype(manager, 'play', function() {
        this.loopCount = this.loops
        this.sound.play()
      })
      interpreter.setNativeFunctionPrototype(manager, 'pause', function() {
        this.sound.pause()
      })
      interpreter.setNativeFunctionPrototype(manager, 'stop', function() {
        this.sound.stop()
      })
      interpreter.setNativeFunctionPrototype(manager, 'pan', function(pan) {
        this.sound.pan(pan)
      })
      interpreter.setNativeFunctionPrototype(manager, 'mute', function(muted) {
        this.sound.mute(muted === undefined ? true : muted)
      })
      interpreter.setNativeFunctionPrototype(manager, 'state', function() {
        return this.sound.state()
      })
      interpreter.setNativeFunctionPrototype(manager, 'playing', function() {
        return this.sound.playing()
      })
      interpreter.setNativeFunctionPrototype(manager, 'duration', function() {
        return this.sound.duration()
      })
      interpreter.setNativeFunctionPrototype(manager, 'getId', function() {
        return this.options.id
      })
      interpreter.setNativeFunctionPrototype(manager, 'getVolume', function() {
        return this.sound.volume()
      })
      interpreter.setNativeFunctionPrototype(manager, 'rate', function(rate) {
        this.sound.rate(rate)
      })
      interpreter.setNativeFunctionPrototype(manager, 'seek', function(time) {
        time = Number(time)
        if (isNaN(time)) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'time must be a valid number'
          )
        }
        if (time < 0) {
          return interpreter.createThrowable(
            interpreter.RANGE_ERROR,
            'time must be greater than or equal to 0'
          )
        }
        this.sound.seek(time)
      })
      interpreter.setNativeFunctionPrototype(manager, 'setVolume', function(
        volume
      ) {
        volume = Number(volume)
        if (isNaN(volume)) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'volume must be a valid number'
          )
        }
        if (volume < 0) {
          return interpreter.createThrowable(
            interpreter.RANGE_ERROR,
            'volume must be greater than or equal to 0'
          )
        }
        if (volume > 1) {
          return interpreter.createThrowable(
            interpreter.RANGE_ERROR,
            'volume must be less than or equal to 1'
          )
        }
        this.sound.volume(volume)
      })
      interpreter.setNativeFunctionPrototype(manager, 'fade', function(
        from,
        to,
        duration
      ) {
        this.sound.fade(from, to, duration)
      })
      interpreter.setNativeFunctionPrototype(manager, 'destroy', function() {
        this.sound.stop()
        this.sound.unload()
        delete vue.sounds[this.options.id]
      })
    },
  },
}
