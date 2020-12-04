import { Howl, Howler } from 'howler'

const soundPools = {}

let PROTO

// let idCounter = 0

export default {
  data: () => ({
    sounds: {},
  }),
  methods: {
    preloadSound(options, fromPageScript) {
      return this.createSoundItem(options, fromPageScript, true)
    },
    getSoundPool(preloadKey) {
      let pool = soundPools[preloadKey]
      if (!pool) {
        pool = []
        soundPools[preloadKey] = pool
      }
      return pool
    },
    createSoundItem(options, fromPageScript, preload) {
      const interpreter = this.interpreter
      const file = this.locatorLookup(options.locator)
      if (!file.item) {
        throw new Error('Invalid sound locator: ' + options.locator)
      }
      let preloadKey = options.locator
      if (!options.id) {
        options.id = '__sound_' + file.href
      } else {
        preloadKey += ':' + options.id
      }
      options.fromPageScript = fromPageScript

      if (typeof options.id !== 'string') {
        throw new Error('Given id must be undefined or a string')
      }
      // console.log('Loading sound:', file)
      const volume = Number(options.volume)

      let item

      function _setItem(item) {
        item.options = options
        item.loops = options.loops || 0
        item.loop = item.loops > 1 || item.loops === 0
        item.loopCount = item.loops
        item.id = options.id
      }

      function _startItem(item) {
        if (!isNaN(volume)) item.sound.volume(volume)
        item.sound.play()
      }

      item = this.sounds[options.id]

      // See if we were already loaded, and use that
      if (item) {
        _setItem(item)
        if (!preload) _startItem(item)
        return item
      }

      const pool = this.getSoundPool(preloadKey)

      if (!preload) {
        // If we're not pre-loading,
        // see if we have a preloaded sound in the pool, and use that
        item = pool.pop()
        if (item) {
          _setItem(item)
          _startItem(item)
          this.sounds[options.id] = item
          return item
        }
      }

      item = interpreter.createObjectProto(PROTO)
      item.preloadKey = preloadKey
      item.id = options.id
      _setItem(item)

      let sound

      const doPreload = e => {
        if (!item.preloaded) {
          item.preloaded = true
          if (preload) {
            sound.stop()
            this.doAfterPreload(true)
          }
        }
      }

      try {
        if (preload) {
          this.incrementPreload()
        }
        sound = new Howl({
          src: [file.href],
          html5: true, // Allows us no not preload the entire file
          loop: item.loop,
          autoPlay: true,
          volume: isNaN(volume) ? 1 : volume,
          format: [file.format || 'mp3'],
          onload: doPreload,
          onloaderror: function(id, error) {
            console.error('Unable to load sound', file.href, error)
            doPreload.call(this)
          },
        })
      } catch (e) {
        return interpreter.createThrowable(interpreter.ERROR, e.toString())
      }

      item.sound = sound

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
      if (preload) {
        // Save on stack for later
        pool.push(item)
      } else {
        // Use new
        this.sounds[options.id] = item
        _startItem(item)
      }
      return item
    },
    purgePageSounds() {
      for (const k of Object.keys(this.sounds)) {
        const item = this.sounds[k]
        if (!item.options.background) {
          item.sound.stop()
          if (item.options.fromPageScript) {
            const pool = this.getSoundPool(item.preloadKey)
            pool.push(item) // Put sound back in pool for later re-use
            delete this.sounds[k]
          }
        }
      }
    },
    installSound(interpreter, globalObject) {
      const vue = this
      const constructor = (opt, fromPageScript) => {
        const options = interpreter.pseudoToNative(opt)
        try {
          return this.createSoundItem(options, fromPageScript)
        } catch (e) {
          return interpreter.createThrowable(interpreter.ERROR, e.toString())
        }
      }

      const manager = interpreter.createNativeFunction(constructor, true)
      interpreter.setProperty(
        manager,
        'prototype',
        interpreter.createObject(globalObject.properties['EventTarget']),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )
      PROTO = manager.properties['prototype']
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
        const pool = vue.getSoundPool(this.preloadKey)
        pool.push(this) // Put sound back in pool for later re-use
        delete vue.sounds[this.options.id]
      })
    },
  },
}
