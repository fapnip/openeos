import { Howl, Howler } from 'howler'
import TreeMap from '../util/TreeMap'

let soundPools = {}

let PROTO

// let idCounter = 0

export default {
  data: () => ({
    sounds: {},
    soundTime: 0,
    showSoundTime: false,
  }),

  mounted() {
    soundPools = {}
  },

  beforeDestroy() {
    console.log('Unloading sounds')
    const sounds = this.sounds
    const keys = Object.keys(sounds)
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i]
      sounds[key].stop()
      delete sounds[key]
    }
  },

  methods: {
    preloadSound(options, fromPageScript) {
      try {
        return this.createSoundItem(options, fromPageScript, true)
      } catch (e) {
        console.error(e)
      }
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

      const clearLastDoAt = () => {
        // console.warn('Clearing lastdo at')
        item.lastDoAt = null
        item._runningSound = null
      }

      const _setItem = () => {
        // console.log('Setting sound item', item, options)
        item.options = options
        item.loops = options.loops === undefined ? 1 : options.loops || 0
        item.loop = item.loops > 1 || item.loops === 0
        item.loopCount = item.loops
        item.id = options.id
        if (options.startAt) item.startAt = options.startAt
        clearLastDoAt()
        item.doAt = new TreeMap()
      }

      const _startItem = () => {
        if (!isNaN(volume)) item.sound.volume(volume)
        if (!item.sound.playing()) item.play()
      }

      item = this.sounds[options.id]

      // See if we were already loaded, and use that
      if (item) {
        _setItem()
        if (!preload) _startItem()
        return item.pseudoItem()
      }

      const pool = this.getSoundPool(preloadKey)

      if (!preload) {
        // If we're not pre-loading,
        // see if we have a preloaded sound in the pool, and use that
        item = pool.pop()
        if (item) {
          _setItem()
          _startItem()
          this.sounds[options.id] = item
          return item.pseudoItem()
        }
      }

      const pseudoItem = interpreter.createObjectProto(PROTO)
      item = {}
      pseudoItem._item = item
      item.pseudoItem = () => pseudoItem
      item.preloadKey = preloadKey
      item.file = file
      item.id = options.id
      this.$set(item, '_playing', false)
      _setItem(item)

      let sound

      if (typeof preload === 'function') {
        this.addAfterPreload(preload)
      }

      const isElementPlaying = el => {
        return (
          !el.paused && !el.ended && el.currentTime > 0 && el.readyState > 2
        )
      }

      const isElementStopped = el => {
        return el.ended || (el.currentTime === 0 && el.readyState < 3)
      }

      const getPausedOrRunningSound = () => {
        // Hack to get audio element from Howler
        let runningSound = getRunningSound()
        if (!runningSound || isElementStopped(runningSound)) {
          const runningSounds = sound._sounds.filter(
            s => !isElementStopped(s._node)
          )
          if (runningSounds.length) {
            runningSound = runningSounds[runningSounds.length - 1]
            item._runningSound = runningSound && runningSound._node
          }
        }
        return runningSound
      }

      const getRunningSound = () => {
        // Hack to get audio element from Howler
        let runningSound = item._runningSound
        if (!runningSound || !isElementPlaying(runningSound)) {
          const runningSounds = sound._sounds.filter(s =>
            isElementPlaying(s._node)
          )
          if (runningSounds.length) {
            runningSound = runningSounds[runningSounds.length - 1]
            item._runningSound = runningSound && runningSound._node
          }
        }
        return runningSound
      }

      const getCurrentTime = () => {
        const runningSound = getRunningSound()
        return (runningSound && runningSound.currentTime) || sound.seek()
      }

      const formatTime = seconds => {
        let minutes = Math.floor(seconds / 60)
        minutes = minutes >= 10 ? minutes : '0' + minutes
        const s = seconds % 60
        seconds = s.toFixed(1)
        seconds = s >= 10 ? seconds : '0' + seconds
        return minutes + ':' + seconds
      }

      item.runDoAt = () => {
        if (!item.doAt.getLength()) return false // Nothing to do.
        const lastDoAt = item.lastDoAt
        const lastTime = lastDoAt && lastDoAt.value && lastDoAt.key
        const currentTime = getCurrentTime()
        const doAction = item.doAt.floorEntry(
          currentTime,
          lastDoAt && lastDoAt.node
        )
        // if (currentTime > 4) return
        if (this.showSoundTime) {
          this.soundTime = formatTime(currentTime)
        }
        if (!doAction) return true // keep the timer running, since we may loop.
        const doTime = doAction.key
        if (doTime === lastTime) return true // Already did this
        // console.log(
        //   'runDoAt doAction',
        //   doAction,
        //   currentTime,
        //   doTime,
        //   lastTime,
        //   lastDoAt && lastDoAt.node
        // )
        // console.warn('Recording last do at', doAction)
        item.lastDoAt = doAction
        if (currentTime - doTime > 1 && doTime !== 0) return true
        this.debug('Run doAt', doTime, currentTime)
        const doObj = doAction.value
        if (doObj && doObj.func.class === 'Function') {
          if (doObj.sync) {
            // Do on next animation frame
            requestAnimationFrame(() => {
              interpreter.queueFunction(doObj.func, pseudoItem)
              interpreter.run()
            })
          } else {
            // Do as soon as possible
            interpreter.queueFunction(doObj.func, pseudoItem)
            interpreter.run()
          }
        }
        return true
      }

      item.stop = () => {
        item._playing = false
        item._elPaused = false
        item._runningSound = null
        clearLastDoAt()
        clearInterval(item._doInterval)
        sound.stop()
        this.dispatchEvent({ target: pseudoItem, type: 'stop' })
        // if (item.startAt) sound.seek(item.startAt)
      }

      item.seek = v => {
        item._runningSound = null
        clearLastDoAt()
        const soundEl = getPausedOrRunningSound()
        if (soundEl) {
          soundEl.currentTime = v
        } else {
          sound.seek(v)
        }
      }

      item.play = () => {
        item._playing = true
        clearInterval(item._doInterval)
        // Howler doesn't support the event we need to track time, so we do this crap
        const soundEl = getPausedOrRunningSound()
        if (soundEl && soundEl.play && item._elPaused) {
          soundEl.play()
          this.dispatchEvent({ target: pseudoItem, type: 'play' })
        } else if (
          soundEl &&
          soundEl._node &&
          soundEl._node.play &&
          item._elPaused
        ) {
          soundEl._node.play()
          this.dispatchEvent({ target: pseudoItem, type: 'play' })
        } else {
          sound.play()
        }
        item._elPaused = false
        if (item.runDoAt()) {
          item._doInterval = setInterval(() => {
            if (!item.runDoAt()) clearInterval(item._doInterval)
          }, 16) // Check around 30 times a second
        }
      }

      item.pause = () => {
        clearInterval(item._doInterval)
        item._playing = false
        const soundEl = getPausedOrRunningSound()
        if (soundEl) {
          soundEl.pause()
          item._elPaused = true
          this.dispatchEvent({ target: pseudoItem, type: 'pause' })
        } else {
          sound.pause()
        }
      }

      const doPrePlay = e => {
        if (item.startAt) {
          sound.seek(item.startAt)
        }
        item.play()
        item._preloadTimeout = setTimeout(() => {
          doPreload('Timeout waiting for sound preload')
        }, 10000)
      }

      const doPreload = e => {
        if (item.preloaded) return
        if (typeof e === 'string') {
          console.error(e, file.href)
        }
        clearTimeout(item._preloadTimeout)
        item.preloaded = true
        if (preload) {
          item.stop()
          this.doAfterPreload(true)
        }
      }

      try {
        if (preload) {
          this.incrementPreload(file.href)
        }
        sound = new Howl({
          src: [file.href],
          html5: true, // Allows us no not preload the entire file
          loop: item.loop,
          autoPlay: false,
          volume: isNaN(volume) ? 1 : volume,
          format: [file.format || 'mp3'],
          onplay: doPreload,
          onload: doPrePlay,
          onploaderror: function(id, error) {
            console.error('Unable to load sound', file.href, error)
            doPreload.call(this)
          },
        })
      } catch (e) {
        return interpreter.createThrowable(interpreter.ERROR, e.toString())
      }

      item.sound = sound

      sound.on('end', () => {
        // console.warn('ended sound', options, item.loop, item.loops, item)
        if (item.loop && item.loops > 1) {
          item.loopCount--
          if (item.loopCount < 1) {
            item.stop()
          }
        } else if (!item.loop || item.loops === 1) {
          item.stop()
        }
        item._runningSound = null
        clearLastDoAt()
      })
      ;['play', 'end', 'pause'].forEach(type => {
        sound.on(type, e => {
          this.dispatchEvent({ target: pseudoItem, type }, e)
        })
      })
      if (preload) {
        // Save on stack for later
        pool.push(item)
      } else {
        // Use new
        this.sounds[options.id] = item
        _startItem()
      }
      console.log('Created sound item', item)
      return pseudoItem
    },
    purgePageSounds() {
      for (const k of Object.keys(this.sounds)) {
        const item = this.sounds[k]
        if (!item.options.background) {
          item.stop()
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
        const optProps = opt.properties
        delete optProps.preload
        let preload = optProps.preload === true
        let pseudoItem
        if (optProps.preload && optProps.preload.class === 'Function') {
          const preloadFunc = optProps.preload
          preload = () => {
            interpreter.queueFunction(preloadFunc, pseudoItem)
            interpreter.run()
          }
        }
        const options = interpreter.pseudoToNative(opt)
        try {
          pseudoItem = this.createSoundItem(options, fromPageScript, preload)
          // console.log('Playing sound item from constructor', item)
          return pseudoItem
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
          const item = this.sounds[id]
          return item && item.pseudoItem()
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        manager,
        'showSoundTime',
        interpreter.createNativeFunction(function(val) {
          if (!arguments.length) {
            return vue.showSoundTime
          }
          vue.showSoundTime = val
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
          for (const k of Object.keys(this.sounds)) {
            this.sounds[k].stop()
          }
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setNativeFunctionPrototype(manager, 'play', function() {
        this._item.loopCount = this._item.loops
        this._item.play()
      })
      interpreter.setNativeFunctionPrototype(manager, 'pause', function() {
        this._item.pause()
      })
      interpreter.setNativeFunctionPrototype(manager, 'stop', function() {
        this._item.stop()
      })
      interpreter.setNativeFunctionPrototype(manager, 'mute', function(muted) {
        this._item.sound.mute(muted === undefined ? true : muted)
      })
      interpreter.setNativeFunctionPrototype(manager, 'state', function() {
        return this._item.sound.state()
      })
      interpreter.setNativeFunctionPrototype(manager, 'playing', function() {
        return this._item.sound.playing()
      })
      interpreter.setNativeFunctionPrototype(manager, 'duration', function() {
        return this._item.sound.duration()
      })
      interpreter.setNativeFunctionPrototype(manager, 'getId', function() {
        return this._item.options.id
      })
      interpreter.setNativeFunctionPrototype(manager, 'getVolume', function() {
        return this._item.sound.volume()
      })
      interpreter.setNativeFunctionPrototype(manager, 'rate', function(rate) {
        if (!arguments.length) {
          return this._item.sound.rate()
        }
        this._item.sound.rate(rate)
      })
      interpreter.setNativeFunctionPrototype(manager, 'seek', function(time) {
        if (!arguments.length) {
          return this._item.sound.seek()
        }
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
        this._item.seek(time)
      })
      interpreter.setNativeFunctionPrototype(manager, 'startAt', function(
        time
      ) {
        if (!arguments.length) {
          return this._item.startAt || 0
        }
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
        this._item.startAt = time
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
        this._item.sound.volume(volume)
      })

      interpreter.setNativeFunctionPrototype(manager, 'setDoAt', function(
        time,
        func,
        sync
      ) {
        time = Number(time)
        if (isNaN(time)) {
          return interpreter.createThrowable(
            interpreter.TYPE_ERROR,
            'time must be a valid floating point number'
          )
        }
        if (time < 0) {
          return interpreter.createThrowable(
            interpreter.RANGE_ERROR,
            'time must be greater than or equal to 0'
          )
        }
        this._item.doAt.set(time, { func: func, sync: sync })
      })

      interpreter.setNativeFunctionPrototype(manager, 'clearDoAt', function() {
        this._item.doAt = new TreeMap()
      })

      interpreter.setNativeFunctionPrototype(manager, 'fade', function(
        from,
        to,
        duration
      ) {
        this._item.sound.fade(from, to, duration)
      })
      interpreter.setNativeFunctionPrototype(manager, 'destroy', function() {
        this._item.stop()
        const pool = vue.getSoundPool(this._item.preloadKey)
        pool.push(this._item) // Put sound back in pool for later re-use
        delete vue.sounds[this._item.options.id]
      })
    },
  },
}
