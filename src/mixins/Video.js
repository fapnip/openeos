let PROTO
const videoDestroyDelay = 200 // ms
import { BLANK_VIDEO_SRC } from '../util/media'
const videoElementPool = []

const relayVideoEvents = [
  'play',
  'ended',
  'pause',
  'waiting',
  'stalled',
  'timeupdate',
  'error',
]

const relayVideoSourceEvents = ['error']

export default {
  data: () => ({
    videos: {},
    hideVideo: false,
    hasVideo: false,
    lastVideoPlay: null,
  }),

  methods: {
    loadVideoElementPool() {
      const videoELementPoolContainer = this.$refs.videoElementPool
      videoELementPoolContainer.style.display = 'block'
      videoElementPool.forEach(v => v.remove())
      videoElementPool.length = 0
      let i = 11
      while (i) {
        i--
        const video = document.createElement('video')
        video.setAttribute('playsinline', 'true')
        const videoSrc = document.createElement('source')
        videoSrc.type = 'video/mp4'
        videoSrc.src = BLANK_VIDEO_SRC
        video._videoSrc = videoSrc
        video.appendChild(videoSrc)
        videoELementPoolContainer.appendChild(video)
        video.volume = 0.8
        video.muted = false
        video
          .play()
          .then(() => {
            video.pause()
            video.volume = 0.8
            if (!i) {
              videoELementPoolContainer.style.display = 'none'
            }
          })
          .catch(e => {
            console.error('Error loading video element pool:' + i, e)
            if (!i) {
              videoELementPoolContainer.style.display = 'none'
            }
          })
        videoElementPool.unshift(video)
      }
    },
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
        vidOverlay.style.width = Math.ceil(width) + 'px'
        vidOverlay.style.height = Math.ceil(height) + 'px'
        var imageScale = height / 720
        this.imageScale = imageScale
        this.setCssVar('--video-scale', imageScale)
      }
    },
    videoClick(e) {
      const item = this.hasVideo
      const pseudoItem = item && item.pseudoItem()
      if (!pseudoItem || !this.hasEventListeners(pseudoItem, 'click')) {
        // If no video click listeners, fall back to plage image click
        return this.imageClick(e)
      }
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
      this.$nextTick(() => this.imageResize())
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
      this.$nextTick(() => this.imageResize())
    },
    videoHideAll() {
      for (const video of Object.values(this.videos)) {
        video.show(false)
        video.video && video.video.pause && video.video.pause()
      }
      this.hasVideo = false
      this.$nextTick(() => this.imageResize())
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
        const vol = item.volume || volume
        item.onContinue = options.onContinue
        item.loops = options.loops === undefined ? 1 : options.loops || 0
        item.loop = item.loops > 1 || item.loops === 0
        item.loopCount = item.loops
        item.id = options.id
        item.onCon
        this.$set(item, '_show', false)
        item.setVolume(isNaN(vol) ? 1 : vol)
      }

      const _startItem = () => {
        // item.video.volume = item.volume
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
        if (!item._hasVideoELement) {
          item.loadVideoElement()
        }
        item.lastLoad = Date.now()
        if (!preload) {
          _startItem()
        } else if (!item.playing()) {
          item.video.currentTime = 0
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
      item.siteLink = file.siteLink || {}
      this.$set(item, '_playing', false)
      item.setVolume = volume => {
        item.volume = volume
        if (item.video) {
          // if (item.video._didVSet) return
          // item.video._didVSet = true
          if (item.muted || !volume || volume < 0) {
            volume = 0
            item.video.muted = true
          } else {
            item.video.muted = false
          }
          item.video.volume = volume
        }
      }
      _setItem(item)

      if (preload) {
        this.incrementPreload(item.file.href)
      }

      item.playing = () => {
        // console.warn('Is playing?', video.paused, video.ended, video.readyState)
        return !!(
          !item.video.paused &&
          !item.video.ended &&
          item.video.readyState > 2
        )
      }

      // item.canplaythrough = e => {
      //   console.warn('Can Play Through', item.file.href)
      //   //canplaythrough
      // }

      item.loadedmetadata = e => {
        const video = item.video
        video.removeEventListener('loadedmetadata', item.loadedmetadata)
        video.removeEventListener('play', item.loadedmetadata)
        item.addListener(video, 'play', item.preloader)
        item.addListener(video, 'pause', afterStop)
        video.pause()
        this.debugIf(2, 'Got metadata:', item.file.href)
        if (item.playing()) {
          console.warn('Already playing:', item.file.href)
          return
        }
        const playPromise = item.video.play()

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
              console.warn(
                'Video not launched from user interaction.  Unable to auto-play:',
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

      var afterStop = () => {
        item._stopping = false
        if (preload && !item._didFirstStop) {
          // console.warn('Did initial pause after preload', file.href)
          this.$nextTick(() => this.doAfterPreload(true))
        }
        item._didFirstStop = true
      }

      item.stop = () => {
        if (!item._hasVideoELement) return
        this.debugWarn('STOPPING', item)
        this.videoHide(item)
        item._stopping = item.playing()
        // this.$nextTick(() => {
        item.video.removeEventListener('pause', playAfterStop)
        item.video.pause()
        item.video.currentTime = 0
        item._playing = false
        // console.log('Prepping to unload for stop', file.href)
        if (item._unloadVideoOnHide) {
          const v = item._unloadVideoOnHide
          setTimeout(() => item.unloadVideoElement(v), videoDestroyDelay)
          if (item._unloadVideoOnHide !== item.video) {
            item._unloadVideoOnHide = item.video
          } else {
            item._unloadVideoOnHide = false
          }
        } else {
          item._unloadVideoOnHide = item.video
        }
        // })
      }

      item.reset = () => {
        this.debugWarn('RESETTING', item)
        this.videoHide(item)
        item._stopping = item.playing()
        // this.$nextTick(() => {
        item.video.removeEventListener('pause', playAfterStop)
        item.video.pause()
        item.video.currentTime = 0
        item._playing = false
      }

      item.hasVideoClassList = () => {
        return item.video && item.video.classList
      }

      item.showPrep = val => {
        if (item.hasVideoClassList()) {
          if (val) {
            item.video.classList.add('oeos-show')
            item.video.classList.add('oeos-show-prep')
          } else {
            if (!item._show) item.video.classList.remove('oeos-show')
            item.video.classList.remove('oeos-show-prep')
          }
        }
        this.$nextTick(() => this.videoResize())
      }

      item.show = val => {
        if (val) {
          // console.error('Showing', video)
          if (item.hasVideoClassList()) {
            item.video.classList.remove('oeos-show-prep')
            item.video.classList.add('oeos-show')
          }
          this.$set(item, '_show', true)
          item._unloadVideoOnHide = false
        } else {
          // console.error('Hiding', video)
          // item.video.classList.remove('oeos-show')
          item._didShowOnPlay = true
          if (!item._noPauseOnHide) {
            this.$nextTick(
              () => item.video && item.video.pause && item.video.pause()
            )
            if (item.hasVideoClassList()) {
              item.video.classList.remove('oeos-show-prep')
              item.video.classList.remove('oeos-show')
            }
          } else {
            // console.warn('Not pausing on next play')
          }
          this.$set(item, '_show', false)
          if (item._unloadVideoOnHide) {
            const v = item._unloadVideoOnHide
            setTimeout(() => item.unloadVideoElement(v), videoDestroyDelay)
            if (item._unloadVideoOnHide !== item.video) {
              item._unloadVideoOnHide = item.video
            } else {
              item._unloadVideoOnHide = false
            }
          }
        }
      }

      const _showOnPlay = e => {
        if (item._show) {
          // console.log('Showing video:', file.href)
          item._didShowOnPlay = true
          item.show(true)
          this.videoShow(item)
          this.$nextTick(() => this.videoResize())
          item.video.removeEventListener('play', _showOnPlay)
          this.dispatchEvent({ target: pseudoItem, type: 'play-start' }, e)
        } else {
          // console.log('Skipping show of video:', file.href)
        }
      }

      item.doVideoPlay = c => {
        if (item._stopping) {
          console.warn('Skipping play.. video is stopping')
          return
        }
        // item.video.muted = true
        const playPromise = item.video.play()
        c = c === undefined ? 10 : c
        if (!c) {
          console.error('Unable to play:', item.file.locator)
          this.dispatchEvent({ target: pseudoItem, type: 'error' })
        }

        // In browsers that don’t yet support this functionality,
        // playPromise won’t be defined.
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // We should be good. Wait for play event.
              // console.warn('We can auto play!')
              this.debugIf(2, 'Play promise worked:', item.file.locator)
            })
            .catch(error => {
              // Automatic play not supported.  User will need to interact
              console.warn(
                'Play promise failed. Retrying:',
                item.file.locator,
                error
              )
              // video.controls = true
              // item.needsInteraction = true
              // item.preloader() // pretend that we preloaded
              setTimeout(() => item.doVideoPlay(--c), 0)
            })
        } else {
          // Probably an old, unsupported browser.
          console.warn('No play promise detected:', item.file.locator)
        }
      }

      item.play = noShow => {
        // console.error(`Playing video ${file.href}`)
        const lastVideo = this.lastVideoPlay !== item && this.lastVideoPlay
        if (item._preloading) {
          item._playAfterLoad = true
          this.debugWarnIf(1, 'Playing before preload', file.href)
          if (lastVideo) {
            // unload last video as soon as possible
            const lastV = lastVideo.video
            setTimeout(
              () => lastVideo.unloadVideoElement(lastV),
              videoDestroyDelay
            )
          }
          this.lastVideoPlay = item
          return
        }
        if (!item._hasVideoELement) {
          item._playAfterLoad = true
          item.loadVideoElement()
          return
        }
        this.$set(item, '_show', item._show || !noShow)
        item._didContinue = false
        if (lastVideo) {
          // console.log('Prepping to unload for play', lastVideo.file.href)
          if (lastVideo._unloadVideoOnHide) {
            // kill it now
            const lastV = lastVideo._unloadVideoOnHide
            setTimeout(
              () => lastVideo.unloadVideoElement(lastV),
              videoDestroyDelay
            )
            if (lastVideo._unloadVideoOnHide !== lastVideo.video) {
              lastVideo._unloadVideoOnHide = lastVideo.video
            } else {
              lastVideo._unloadVideoOnHide = false
            }
          } else {
            lastVideo._unloadVideoOnHide = lastVideo.video
          }
        }
        this.lastVideoPlay = item
        item._playCount++
        this.debugIf(2, 'Playing', item.file.href)
        item.setVolume(item.volume)
        if (item._stopping) {
          // console.log('Deferring till pause')
          item.addListener(item.video, 'pause', playAfterStop)
          item.doVideoPlay()
        } else if (!item.playing()) {
          item._playing = true
          item._didShowOnPlay = false
          // hack to try to reduce transition time between two html5 videos.
          if (options.immediateShowOnPlay) {
            _showOnPlay()
          } else {
            item.addListener(item.video, 'play', _showOnPlay)
          }
          item.doVideoPlay()
        } else if (item._didShowOnPlay) {
          item._playing = true
          _showOnPlay()
        }
        item._stopping = false
      }

      item._stopping = false
      var playAfterStop = () => {
        item.video.removeEventListener('pause', playAfterStop)
        if (!item._stopping) item.play()
      }

      item.addListener = (el, type, fn) => {
        const regFns = el._regFns || {}
        el._regFns = regFns
        const fns = regFns[type] || []
        regFns[type] = fns
        fns.push(fn)
        el.addEventListener(type, fn)
      }

      item.clearAllListeners = el => {
        const regFns = el._regFns || {}
        Object.keys(regFns).forEach(k => {
          regFns[k].forEach(fn => {
            el.removeEventListener(k, fn)
          })
        })
        el._regFns = {}
        if (el._videoSrc) {
          item.clearAllListeners(el._videoSrc)
        }
      }

      item.preloader = e => {
        // If we're pre-loading, stop the video playback and restart
        if (item._preloading) {
          item._retryCount = 5
          // console.warn('Stopping after preload')
          item.video.removeEventListener('play', item.preloader)
          item.reset()
          this.videoHide(item)
          item.video.controls = false
          item.video.removeAttribute('controls')
          // video.autoplay = true
          item._preloading = false
          item.addListener(item.video, 'ended', item.looper)
          relayVideoEvents.forEach(type => {
            if (item.video._removing) return
            const relayFn = e => {
              if (item.video._removing || !item._didFirstStop) return
              this.dispatchEvent({ target: pseudoItem, type }, e)
            }
            item.addListener(item.video, type, relayFn)
          })
          relayVideoSourceEvents.forEach(type => {
            if (item.video._removing) return
            const relayFn = e => {
              if (item.video._removing || !item._didFirstStop) return
              this.dispatchEvent({ target: pseudoItem, type }, e)
            }
            item.addListener(item.videoSrc, type, relayFn)
          })
          this.debugIf(2, 'Preloaded', item.file.href)
          if (item._playAfterLoad) {
            item._playAfterLoad = false
            item.play()
          }
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
        console.error('Error loading video:', item.file.href)
        if (item._preloading) {
          item._retryCount--
          if (item._retryCount) {
            console.warn(
              'Error preloading video -- retrying',
              item._retryCount,
              item
            )
            this.dispatchEvent({ target: pseudoItem, type: 'retry' }, e)
            // item.video.src = ''
            // item.video.load()
            setTimeout(() => {
              item.loadVideoElement()
              // startVideoPreload()
              // item.video.load()
            }, 250)
            return
          } else {
            console.warn('Error preloading video -- no retries left', item, e)
            this.dispatchEvent({ target: pseudoItem, type: 'error' }, e)
            if (preload) this.doAfterPreload(true)
          }
        } else if (item._playing && !item._stopping) {
          if (item._retryCount) {
            item._retryCount--
            console.warn(
              'Error playing video -- retrying',
              item._retryCount,
              item,
              e
            )
            this.$nextTick(() => {
              item.play()
            })
            return
          } else {
            console.error('Error playing video -- unable to play', item, e)
            this.dispatchEvent({ target: pseudoItem, type: 'error' }, e)
          }
          // console.warn('Error playing video', item, e)
        } else {
          this.dispatchEvent({ target: pseudoItem, type: 'error' }, e)
        }
      }

      if (typeof preload === 'function') {
        this.addAfterPreload(() => {
          preload()
        })
      }

      // item.firstPlay = () => {
      //   const video = item.video
      //   video.addEventListener('play', item.preloader)
      //   video.removeEventListener('play', item.firstPlay)
      //   video.stop()
      // }

      const startVideoPreload = () => {
        if (!item._loadingUrl) {
          this.debugIf(1, 'Waiting for real URL', item.file.href)
        }
        this.debugIf(1, 'Starting preload', item.file.href)
        item._preloading = true
        if (!item._parsedHref) {
          const urlp = item.file.href.match(
            /https:\/\/.*redgifs\.com\/([a-z0-9]+)(-mobile\.mp4|.mp4|)(\?|$)/i
          )
          if (urlp) {
            item._loadingUrl = true
            const rgvid = urlp[1].toLowerCase()
            fetch(`https://api.redgifs.com/v2/gifs/${rgvid}`)
              .then(res => res.json())
              .then(out => {
                item._parsedHref = out.gif.urls.sd
                item._loadingUrl = false
                startVideoPreload()
              })
              .catch(err => {
                console.error(err)
                item._parsedHref = item.file.href
                item._loadingUrl = false
              })
            return
          } else {
            item._parsedHref = item.file.href
          }
        }
        item._playCount = 0
        const video = item.video
        video.classList.add('oeos-clickable')
        // video.setAttribute('controls', 'true')
        video.preload = 'metadata'
        video.autoplay = false // We'll do this later
        video.muted = true
        video.loop = !!item.loop && !item.loops === 1
        item.addListener(video, 'loadedmetadata', item.loadedmetadata)
        // video.addEventListener('canplaythrough', item.canplaythrough)
        item.addListener(video, 'error', item.error)
        item.addListener(item.videoSrc, 'error', item.error)
        item.videoSrc.src = item._parsedHref
        video.load()
      }

      item._retryCount = 5

      const loadVideoElement = () => {
        this.debugWarnIf(1, 'Loading video element:', item.file.href)
        if (item.video) {
          const v = item.video
          setTimeout(() => item.unloadVideoElement(v), videoDestroyDelay)
        }
        const video = videoElementPool.pop()
        // video.setAttribute('playsinline', 'true')
        // const videoSrc = document.createElement('source')
        // videoSrc.type = 'video/mp4'
        // // videoSrc.src = ''
        // video.appendChild(videoSrc)
        // // video.volume = 0.0001 // Just a little volume to make sure we auth it.
        // item.videoSrc = videoSrc
        item.video = video
        item.videoSrc = video._videoSrc
        item._hasVideoELement = true
        item._unloadVideoOnHide = false
        this.$refs.videoElements.appendChild(video)
        startVideoPreload()
      }
      item.loadVideoElement = loadVideoElement

      const unloadVideoElement = v => {
        if (!v) return
        this.debugWarnIf(1, 'Unloading video element:', item.file.href, v)
        item.clearAllListeners(v)
        v._videoSrc.src = BLANK_VIDEO_SRC
        v.load()
        videoElementPool.unshift(v)
        if (item.video === v) {
          item.video = false
          item._hasVideoELement = false
        }
        this.$refs.videoElementPool.appendChild(v)
      }
      item.unloadVideoElement = unloadVideoElement

      loadVideoElement()

      item.createdAt = Date.now()
      item.lastLoad = Date.now()

      // console.log('refs', this.$refs)

      // video.removeAttribute('controls')

      // Use new
      this.videos[options.id] = item
      if (!preload) _startItem(item)

      this.debug('Created video item', item)
      if (item.siteLink.link)
        this.debug('Link to original video:', item.siteLink.link)
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

      interpreter.setProperty(
        manager,
        'stopAll',
        interpreter.createNativeFunction(allBut => {
          for (const k of Object.keys(this.videos)) {
            const item = this.videos[k]
            if (item.pseudoItem() !== allBut && item._id !== allBut) {
              item.stop()
              item._playing = false
            }
          }
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        manager,
        'lastPlayed',
        interpreter.createNativeFunction(() => {
          return this.lastVideoPlay && this.lastVideoPlay.pseudoItem()
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setProperty(
        manager,
        'activeVideo',
        interpreter.createNativeFunction(() => {
          return this.hasVideo && this.hasVideo.pseudoItem()
        }),
        this.Interpreter.NONENUMERABLE_DESCRIPTOR
      )

      interpreter.setNativeFunctionPrototype(manager, 'play', function(v) {
        this._item.loopCount = this._item.loops
        this._item.play(v)
        // this._item._playing = true
      })
      interpreter.setNativeFunctionPrototype(manager, 'pause', function() {
        vue.debugWarn('PAUSING', this._item)
        this._item.video.pause()
        this._item._playing = false
      })
      interpreter.setNativeFunctionPrototype(manager, 'show', function(v) {
        if (!arguments.length) {
          return this._item._show
        }
        this._item.show(v)
      })
      interpreter.setNativeFunctionPrototype(manager, 'showPrep', function(v) {
        if (!arguments.length) {
          return this._item.video.classList.contains('oeos-show-prep')
        }
        this._item.showPrep(v)
      })
      interpreter.setNativeFunctionPrototype(manager, 'stop', function() {
        this._item.stop()
      })
      interpreter.setNativeFunctionPrototype(manager, 'mute', function(muted) {
        this._item.muted = muted
        this._item.setVolume(this._item.volume)
        // this._item.video.muted = muted === undefined ? true : !!muted
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
      interpreter.setNativeFunctionPrototype(manager, 'noPauseOnHide', function(
        v
      ) {
        if (!arguments.length) {
          return this._item._noPauseOnHide
        }
        this._item._noPauseOnHide = !!v
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
        this._item.setVolume(volume)
      })
      var destroyVideo = function() {
        this._item._destroying = true
        this._item._playing = false
        vue.$nextTick(() => {
          this._item.unloadVideoElement(this._item.video)
          delete vue.videos[this._item.id]
        })
      }
      interpreter.setNativeFunctionPrototype(manager, 'remove', destroyVideo)
      interpreter.setNativeFunctionPrototype(manager, 'destroy', destroyVideo)
    },
  },
}
