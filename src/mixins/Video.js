let PROTO

export default {
  data: () => ({
    videos: {},
    hideVideo: false,
    hasVideo: false,
  }),

  methods: {
    videoResize() {
      const item = this.hasVideo
      const video = item && item.video
      const vidOverlay = this.$refs.videoOverlays
      if (video && vidOverlay) {
        let width = video.clientWidth
        let height = video.clientHeight
        const naturalHeight = video.videoHeight
        const naturalWidth = video.videoWidth
        const xScale = width / naturalWidth
        const yScale = height / naturalHeight
        if (xScale === 1) {
          width = naturalWidth * yScale
        }
        if (yScale === 1 || xScale < yScale) {
          height = naturalHeight * xScale
        }
        console.log(
          'Video Overlay',
          video.clientWidth,
          video.clientHeight,
          width,
          height,
          naturalWidth,
          naturalHeight
        )
        vidOverlay.style.width = Math.ceil(width) + 'px'
        vidOverlay.style.height = Math.ceil(height) + 'px'
      }
    },
    videoClick(e) {
      const item = this.hasVideo
      const pseudoItem = item && item.pseudoItem()
      if (!pseudoItem || !this.hasEventListeners(pseudoItem, 'click')) return
      const rect = e.target.getBoundingClientRect()
      const x = e.clientX - rect.left //x position within the element.
      const y = e.clientY - rect.top //y position within the element.
      this.dispatchEvent(
        {
          target: pseudoItem,
          type: 'click',
          value: {
            x: x / e.target.clientWidth, // between 0 and 1, where clicked
            y: y / e.target.clientHeight, // between 0 and 1, where clicked
          },
          timeStamp: e.timeStamp + performance.timing.navigationStart,
        },
        e
      )
    },
    videoShow(item) {
      let hasVideo = false
      for (const video of Object.values(this.videos)) {
        video.show(video === item)
        if (video._show) hasVideo = video
      }
      this.hasVideo = hasVideo
    },
    videoHide(item) {
      let hasVideo = false
      for (const video of Object.values(this.videos)) {
        if (video === item) {
          video.show(false)
        }
        if (video._show) hasVideo = video
      }
      this.hasVideo = hasVideo
    },
    videoHideAll() {
      for (const video of Object.values(this.videos)) {
        video.show(false)
        video.video.pause()
      }
      this.hasVideo = false
    },
    preloadVideo(options, fromPageScript) {
      try {
        return this.createVideoItem(options, fromPageScript, true)
      } catch (e) {
        console.error(e)
      }
    },
    createVideoItem(options, fromPageScript, preload) {
      const interpreter = this.interpreter
      const file = this.locatorLookup(options.locator)
      if (!file.item) {
        throw new Error('Invalid video locator: ' + options.locator)
      }
      let preloadKey = options.locator
      if (!options.id) {
        options.id = '__video_' + file.href
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

      const _setItem = () => {
        // console.log('Setting sound item', item, options)
        // item.controls = options.controls
        item.onContinue = options.onContinue
        item.loops = options.loops || 0
        item.loop = item.loops > 1 || item.loops === 0
        item.loopCount = item.loops
        item.id = options.id
        item.onCon
        item._show = false
      }

      const _startItem = () => {
        if (!isNaN(volume)) item.video.volume = volume
        // if (!item.playing()) item.play()
        item.play()
      }

      item = this.videos[options.id]

      // See if we were already loaded, and use that
      if (item) {
        this.debug(
          `Using preloaded video for ${preload ? 'preload' : 'display'}`,
          item
        )
        _setItem()
        if (!preload) {
          _startItem()
        }

        return item.pseudoItem()
      }

      // console.warn('Creating new video', file.href, preload)

      const pseudoItem = interpreter.createObjectProto(PROTO)
      item = {}
      pseudoItem._item = item
      item.pseudoItem = () => pseudoItem
      item.preloadKey = preloadKey
      item.file = file
      item.id = options.id
      this.$set(item, '_playing', false)
      _setItem(item)

      if (preload) {
        this.incrementPreload(file.href)
      }

      item.playing = () => {
        // console.warn('Is playing?', video.paused, video.ended, video.readyState)
        return !!(!video.paused && !video.ended && video.readyState > 2)
      }

      item.loadedmetadata = e => {
        video.removeEventListener('loadedmetadata', item.loadedmetadata)
        // console.warn('Got metadata')
        const playPromise = video.play()

        // In browsers that don’t yet support this functionality,
        // playPromise won’t be defined.
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // We should be good. Wait for play event.
              // console.warn('We can auto play!')
            })
            .catch(error => {
              // Automatic play not supported.  User will need to interact
              console.error(
                'Video not launched from user interaction.  Unable to auto-play or preload:',
                file.locator
              )
              // video.controls = true
              item.needsInteraction = true
              item.preloader() // pretend that we preloaded
            })
        } else {
          // Probably an old, unsupported browser.
        }
      }

      item.stop = () => {
        this.videoHide(item)
        this.$nextTick(() => {
          video.pause()
          video.currentTime = 0
          item._playing = false
        })
      }

      item.show = val => {
        if (val) {
          // console.error('Showing', video)
          item.video.classList.add('oeos-show')
          item._show = true
        } else {
          // console.error('Hiding', video)
          item.video.classList.remove('oeos-show')
          this.$nextTick(() => item.video.pause())
          item._show = false
        }
      }

      const _showOnPlay = e => {
        if (item._show) {
          item.show(true)
          this.videoShow(item)
          this.$nextTick(() => this.videoResize())
          video.removeEventListener('play', _showOnPlay)
          this.dispatchEvent({ target: pseudoItem, type: 'play-start' }, e)
        }
      }

      item.play = () => {
        // console.error(`Playing video ${file.href}`)
        item._show = true
        item._didContinue = false
        item._playing = true
        if (!item.playing()) {
          video.addEventListener('play', _showOnPlay)
          item.video.play()
        } else {
          _showOnPlay()
        }
      }

      item.preloader = e => {
        // If we're pre-loading, stop the video playback and restart
        if (item._preloading) {
          // console.warn('Stopping after preload')
          item.stop()
          this.videoHide(item)
          video.controls = false
          video.removeAttribute('controls')
          // video.autoplay = true
          video.muted = false
          this.doAfterPreload(true)
          item._preloading = false
          video.removeEventListener('play', item.preloader)
          video.addEventListener('ended', item.looper)
          ;['play', 'ended', 'pause', 'waiting'].forEach(type => {
            video.addEventListener(type, () => {
              this.dispatchEvent({ target: pseudoItem, type }, e)
            })
          })
        }
      }

      item.doContinue = () => {
        if (item._didContinue) return
        item._didContinue = true
        if (typeof item.onContinue === 'function') {
          // item.stop()
          item.onContinue()
        }
      }

      item.looper = () => {
        if (item.loop && item.loops > 1) {
          item.loopCount--
          if (!item.loopCount) {
            item._playing = false
            this.$nextTick(() => item.video.pause())
            item.doContinue()
          }
        } else if (!item.loop || item.loops === 1) {
          item._playing = false
          this.$nextTick(() => item.video.pause())
          item.doContinue()
        } else {
          item.doContinue()
        }
      }

      item.error = e => {
        // item._o_el = e.target
        if (preload) this.doAfterPreload(true)
      }

      if (typeof preload === 'function') {
        this.addAfterPreload(() => {
          preload()
        })
      }

      item._preloading = true

      const video = document.createElement('video')
      item.video = video
      video.classList.add('oeos-clickable')
      video.setAttribute('controls', 'true')
      video.preload = 'metadata'
      video.autoplay = false // We'll do this later
      video.muted = true
      video.loop = !!item.loop && !item.loops === 1
      video.addEventListener('loadedmetadata', item.loadedmetadata)
      video.addEventListener('play', item.preloader)
      video.addEventListener('error', item.error)
      video.src = file.href

      console.log('refs', this.$refs)

      this.$refs.videoElements.appendChild(video)
      // video.removeAttribute('controls')

      // Use new
      this.videos[options.id] = item
      if (!preload) _startItem(item)

      console.log('Created video item', item)
      return pseudoItem
    },
    purgePageVideos() {
      for (const k of Object.keys(this.videos)) {
        const item = this.videos[k]
        if (!item.options.background) {
          item.stop()
          item._playing = false
          // if (item.options.fromPageScript) {
          //   const pool = this.getSoundPool(item.preloadKey)
          //   pool.push(item) // Put sound back in pool for later re-use
          //   delete this.sounds[k]
          // }
        }
      }
    },
    installVideo(interpreter, globalObject) {
      const vue = this
      const constructor = (opt, fromPageScript) => {
        const optProps = opt.properties
        const preloadFunc = optProps.preload
        let preload = optProps.preload === true
        let pseudoItem
        if (preloadFunc && preloadFunc.class === 'Function') {
          delete optProps.preload
          preload = () => {
            interpreter.queueFunction(preloadFunc, pseudoItem)
            interpreter.run()
          }
        }
        const onContinueFunc = optProps.onContinue
        let onContinue
        if (onContinueFunc && onContinueFunc.class === 'Function') {
          delete optProps.onContinue
          onContinue = () => {
            interpreter.queueFunction(onContinueFunc, pseudoItem)
            interpreter.run()
          }
        }
        const options = interpreter.pseudoToNative(opt)
        options.onContinue = onContinue
        try {
          pseudoItem = this.createVideoItem(options, fromPageScript, preload)
          // console.log('Playing video item from constructor', pseudoItem)
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
      interpreter.setProperty(globalObject, 'Video', manager)

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
          const item = this.videos[id]
          return item && item.pseudoItem()
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      // interpreter.setProperty(
      //   manager,
      //   'volume',
      //   interpreter.createNativeFunction(volume => {
      //     return Howler.volume(volume)
      //   }),
      //   this.Interpreter.NONENUMERABLE_DESCRIPTOR
      // )

      // interpreter.setProperty(
      //   manager,
      //   'mute',
      //   interpreter.createNativeFunction(muted => {
      //     return Howler.mute(muted === undefined ? true : muted)
      //   }),
      //   this.Interpreter.NONENUMERABLE_DESCRIPTOR
      // )

      // interpreter.setProperty(
      //   manager,
      //   'stop',
      //   interpreter.createNativeFunction(() => {
      //     return Howler.stop()
      //   }),
      //   this.Interpreter.NONENUMERABLE_DESCRIPTOR
      // )

      interpreter.setNativeFunctionPrototype(manager, 'play', function() {
        this._item.loopCount = this._item.loops
        this._item.video.play()
        this._item._playing = true
      })
      interpreter.setNativeFunctionPrototype(manager, 'pause', function() {
        this._item.video.pause()
        this._item._playing = false
      })
      interpreter.setNativeFunctionPrototype(manager, 'show', function(v) {
        if (!arguments.length) {
          return this._item._show
        }
        this._item.show(v)
      })
      interpreter.setNativeFunctionPrototype(manager, 'stop', function() {
        this._item.stop()
      })
      interpreter.setNativeFunctionPrototype(manager, 'mute', function(muted) {
        this._item.video.muted = muted === undefined ? true : !!muted
      })
      interpreter.setNativeFunctionPrototype(manager, 'playing', function() {
        return this._item.playing()
      })
      interpreter.setNativeFunctionPrototype(manager, 'duration', function() {
        return this._item.video.duration
      })
      interpreter.setNativeFunctionPrototype(manager, 'getId', function() {
        return this._item.id
      })
      interpreter.setNativeFunctionPrototype(manager, 'getVolume', function() {
        return this._item.video.volume
      })
      interpreter.setNativeFunctionPrototype(manager, 'getElement', function() {
        return vue.getHTMLElementPseudo(this._item.video, true)
      })
      interpreter.setNativeFunctionPrototype(manager, 'rate', function(rate) {
        if (!arguments.length) {
          return this._item.video.playbackRate
        }
        this._item.video.playbackRate = rate
      })
      interpreter.setNativeFunctionPrototype(manager, 'seek', function(time) {
        if (!arguments.length) {
          return this._item.video.currentTime
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
        this._item.video.currentTime = time
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
        this._item.video.volume = volume
      })
      interpreter.setNativeFunctionPrototype(manager, 'destroy', function() {
        this._item.stop()
        this._item._playing = false
        delete vue.sounds[this._item.options.id]
      })
    },
  },
}
