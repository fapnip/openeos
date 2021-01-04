<template>
  <div class="oeos-outer">
    <div :class="mainClass" v-resize="scrollToBottom" @click="pageClick">
      <div
        v-if="currentBackgroundColor"
        class="oeos-background"
        :style="{
          backgroundImage:
            selectedBackgroundTexture && `url(${selectedBackgroundTexture})`,
          backgroundColor: currentBackgroundColor,
        }"
      ></div>
      <div
        v-show="(!hideVideo && hasVideo) || (image && !hideImage)"
        :class="{
          'oeos-top': true,
        }"
      >
        <div
          class="oeos-image"
          v-show="(hideVideo || !hasVideo) && image && !hideImage"
        >
          <img
            ref="mainImage"
            :src="image && image.href"
            class="oeos-clickable"
            crossorigin="anonymous"
            @load="imageLoad"
            @loadstart="imageResize"
            @progress="imageResize"
            @error="imageError"
          />
        </div>
        <div
          class="oeos-image-overlays"
          ref="imageOverlays"
          @click="imageClick"
          v-show="(hideVideo || !hasVideo) && image && !hideImage"
        >
          <overlay-item
            v-for="overlay in imageOverlays"
            :key="overlay.id"
            :id="overlay.id"
            @ready="overlay.ready"
          ></overlay-item>
        </div>
        <div
          v-show="!hideVideo && hasVideo"
          class="oeos-video"
          ref="videoElements"
        ></div>
        <div
          v-show="!hideVideo && hasVideo"
          class="oeos-video-overlays"
          ref="videoOverlays"
          @click="videoClick"
        >
          <overlay-item
            v-for="overlay in videoOverlays"
            :key="overlay.id"
            :id="overlay.id"
            @ready="overlay.ready"
          ></overlay-item>
        </div>
        <resize-observer @notify="imageResize" />
      </div>
      <div
        v-show="!hideBubbles"
        :class="{
          'oeos-bottom': true,
          'has-image': (!hideVideo && hasVideo) || (image && !hideImage),
        }"
        v-scroll.self="checkBubbleScroll"
        ref="oeosBottom"
      >
        <v-container fill-height class="pa-0">
          <v-row
            :style="{ height: bubbleHeight + 'px' }"
            class="text-center pa-0 ma-0"
          >
          </v-row>
          <v-row
            v-for="bubble in bubbles"
            :key="bubble.id"
            class="text-center pa-0 ma-0"
          >
            <div :class="bubbleClass(bubble)">
              <vue-switch :value="bubble.type">
                <template #say>
                  <say-bubble
                    :ref="'say_' + bubble.id"
                    :value="bubble.item"
                    :active="bubble.item.active"
                    :is-debug="isDebug"
                    @ready="bubble.item.ready"
                  ></say-bubble>
                </template>
                <template #choice>
                  <choice-bubble
                    :value="bubble.item"
                    :active="bubble.item.active"
                    :is-debug="isDebug"
                    @ready="bubble.item.ready"
                  ></choice-bubble>
                </template>
                <template #prompt>
                  <prompt-bubble
                    :value="bubble.item"
                    :active="bubble.item.active"
                    :is-debug="isDebug"
                    @ready="bubble.item.ready"
                  ></prompt-bubble>
                </template>
              </vue-switch>
            </div>
          </v-row>
          <v-row
            ref="lastItem"
            class="oeos-bubble-end text-center pa-0 ma-0"
          ></v-row>
        </v-container>
      </div>
      <div class="oeos-right">
        <countdown-timer
          v-for="(timer, i) in timers"
          :key="timer.id + ':' + i"
          :duration="timer.duration"
          :loops="timer.loops"
          :type="timer.style"
          :is-debug="isDebug"
          @timeout="timer.onTimeout"
          @loop="timer.onLoop"
          @ready="timer.ready"
        >
        </countdown-timer>
      </div>
      <div class="oeos-notifications">
        <div class="oeos-notification-list">
          <notification-item
            v-for="(notification, i) in notifications"
            :key="notification.id + ':' + i"
            :duration="notification.timerDuration"
            :title="notification.title"
            :buttonLabel="notification.buttonLabel"
            :is-debug="isDebug"
            style="margin-bottom: 5px;"
            @timeout="notification.onTimeout"
            @button-click="notification.onClick"
            @ready="notification.ready"
          >
          </notification-item>
        </div>
      </div>
      <v-fab-transition>
        <v-btn
          v-show="!scrolling && !scrolledToBottom"
          class="oeos-scroll-button"
          fab
          dark
          x-small
          @click="scrollToBottom"
        >
          <v-icon>mdi-arrow-down-bold</v-icon>
        </v-btn>
      </v-fab-transition>
      <div id="oeos-sounds">
        <data
          v-for="(sound, i) in sounds"
          :class="{ 'is-active': sound._playing }"
          :key="sound.id + ':' + i"
          :value="sound.file.locator"
          >{{ sound.file.href }}</data
        >
      </div>
      <overlay-item
        v-for="overlay in pageOverlays"
        :key="overlay.id"
        :id="overlay.id"
        @ready="overlay.ready"
      ></overlay-item>
      <loading v-if="loading">{{ loadingText }}</loading>
      <v-progress-linear
        :active="showPreloading && waitingForPageChange"
        absolute
        indeterminate
        color="primary"
        style="top:0;"
      ></v-progress-linear>
    </div>

    <loading v-show="loading && !started">{{ loadingText }}</loading>
    <div
      v-if="!started && !loading"
      class="oeos-start-prompt"
      @click.stop="runTease"
    >
      <global-events @keydown.space="runTease" @keydown.enter="runTease" />
      <div class="oeos-start-title">{{ title }}</div>
      <div v-if="author" class="oeos-start-author">by {{ author }}</div>
      <div class="oeos-start-button">
        <v-btn icon small
          ><v-icon dark>mdi-arrow-right-drop-circle</v-icon></v-btn
        >
      </div>
    </div>
    <div v-if="showSoundTime" class="oeos-sound-time">{{ soundTime }}</div>
  </div>
</template>

<script>
import NoSleep from 'nosleep.js'
import Interpreter from '../interpreter'
const interpreter = new Interpreter('')
interpreter.REGEXP_MODE = 1
import extractStyles from '../util/extractStyles'

// Module Mixins
import sanitize from '../mixins/sanitize'
import Image from '../mixins/Image'
import Background from '../mixins/Background'
import Bubbles from '../mixins/Bubbles'
import Script from '../mixins/Script'
import Locator from '../mixins/Locator'
import Preload from '../mixins/Preload'
import Console from '../mixins/Console'
import Document from '../mixins/dom/Document'
import NativeTimers from '../mixins/NativeTimers'
import PageManager from '../mixins/PageManager'
import Overlay from '../mixins/Overlay'
import FileManager from '../mixins/FileManager'
import Timer from '../mixins/Timer'
import Say from '../mixins/Say'
import Choice from '../mixins/Choice'
import Prompt from '../mixins/Prompt'
import Notification from '../mixins/Notification'
import Sound from '../mixins/Sound'
import Video from '../mixins/Video'
import Storage from '../mixins/Storage'

// Components
import Loading from './common/Loading'
import VueSwitch from './common/VueSwitch'
import OverlayItem from './common/OverlayItem'
import CountdownTimer from './sidebar/CountdownTimer'
import NotificationItem from './sidebar/NotificationItem'
import SayBubble from './bubbles/SayBubble'
import ChoiceBubble from './bubbles/ChoiceBubble'
import PromptBubble from './bubbles/PromptBubble'

// Interpreter Polyfills
// import PromisePoly from '!!raw-loader!../interpreter/polyfills/promise.js'

export default {
  name: 'OpenEosPlayer',
  components: {
    Loading,
    VueSwitch,
    OverlayItem,
    CountdownTimer,
    NotificationItem,
    SayBubble,
    ChoiceBubble,
    PromptBubble,
  },
  props: {
    isFullscreen: Boolean,
    script: {
      type: Object,
    },
    title: {
      type: String,
      default: 'Unknown',
    },
    author: {
      type: String,
      default: '',
    },
    teaseId: {
      type: String,
      default: null,
    },
  },
  mixins: [
    sanitize,
    Image,
    Background,
    Bubbles,
    Script,
    Locator,
    Preload,
    Console,
    Document,
    NativeTimers,
    PageManager,
    Overlay,
    FileManager,
    Timer,
    Say,
    Choice,
    Prompt,
    Notification,
    Sound,
    Video,
    Storage,
  ],
  data: () => ({
    loading: true,
    started: false,
    isDebug: true,
    loadingText: 'Preloading images...',
    noSleep: new NoSleep(),
  }),
  computed: {
    initScript() {
      return this.script.init || ''
    },
    Interpreter: {
      get() {
        return Interpreter
      },
    },
    interpreter: {
      get() {
        return interpreter
      },
    },
    mainClass() {
      return {
        'oeos-main': true,
        'allow-backdrop': this.hasBackdropFilter,
        'no-backdrop': !this.hasBackdropFilter,
        'oeos-image-full': this.fullScreenImage,
      }
    },
  },
  // beforeMount() {
  //   this.script = testJson
  // },
  mounted() {
    this.initInterpreter()
  },
  watch: {
    started(val) {
      if (val) {
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
  },
  methods: {
    debug() {
      if (this.isDebug) {
        console.log(...arguments)
      }
    },
    debugWarn() {
      if (this.isDebug) {
        console.warn(...arguments)
      }
    },
    installInterpreterModules(interpreter, globalObject) {
      this.installConsole(interpreter, globalObject)
      this.installNativeTimers(interpreter, globalObject)
      // interpreter.appendCode(PromisePoly)
      interpreter.run()

      this.installDocument(interpreter, globalObject)
      this.installPageManager(interpreter, globalObject)
      this.installOverlay(interpreter, globalObject)
      this.installImage(interpreter, globalObject)
      this.installFileManager(interpreter, globalObject)
      this.installTimer(interpreter, globalObject)
      this.installSay(interpreter, globalObject)
      this.installChoice(interpreter, globalObject)
      this.installPrompt(interpreter, globalObject)
      this.installNotification(interpreter, globalObject)
      this.installSound(interpreter, globalObject)
      this.installVideo(interpreter, globalObject)
      this.installStorage(interpreter, globalObject)
    },
    initInterpreter() {
      this.installInterpreterModules(interpreter, interpreter.globalObject)
      interpreter.run()
      this.debug(
        'Loaded Interpreter',
        Interpreter,
        interpreter,
        interpreter.globalObject
      )
      this.setScript(this.script)
      const style = extractStyles(this.getInitScript())
      this.addStyles(Object.keys(style.styles))
      this.debug('Precompiling all page scripts...')
      this.preloadPage('start', 'script load', true)
      this.preloadPageScriptsAndSounds()
      this.loading = false
    },
    runTease() {
      this.noSleep.enable() // Prevent tease from sleeping on mobile devices
      this.addAfterPreload(() => {
        console.log('Running start')
        this.loading = false
        this.showPage('start')
        interpreter.run()
        this.scrollToBottom()
      })
      this.loading = true
      this.started = true
      this.loadingText = 'Prebuffering media...'
      const sounds = this.popStartupSounds()
      for (const soundOption of sounds) {
        this.preloadSound(soundOption, true)
      }
      const videos = this.popStartupVideos()
      for (const videoOption of videos) {
        this.preloadVideo(videoOption, true)
      }
      this.debug('Loading JS Includes')
      for (const jsInclude of Object.values(this.getJsIncludes())) {
        try {
          interpreter.appendCode(jsInclude)
          interpreter.run()
        } catch (e) {
          console.error('Error executing JS include', jsInclude)
          console.error(e)
        }
      }
      this.debug('Loading Init Script')
      interpreter.appendCode(this.getInitScript())
      interpreter.run()
      this.debug('Loaded Init Script and started media preload')
      this.interpreter.run()
      if (!this.hasWaitingPreloads()) {
        console.log('Nothing to preload...')
        this.doAfterPreload(true)
      }
    },
  },
}
</script>
<style>
html {
  overflow: hidden;
}
.oeos-start-prompt,
.oeos-outer,
.oeos-main {
  /* height: 100%;
  width: 100%;
  position: relative; */
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
#oeos-sounds {
  display: none;
}
.oeos-sound-time {
  position: absolute;
  top: 0;
  left: 0;
}
.oeos-start-title {
  text-align: center;
  margin-top: 50px;
  font-size: 200%;
  margin-bottom: 10px;
}
.oeos-start-author {
  text-align: center;
  margin-bottom: 10px;
  opacity: 0.6;
}
.oeos-background {
  /* height: 100%;
  width: 100%;
  position: relative; */
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 0;
  /* background-image: url(/static/media/navy.70005832.png); */
  transition: background-color 0.3s ease;
  background-repeat: repeat;
}
.oeos-background:before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-image: linear-gradient(90deg, #000, transparent, #000);
  opacity: 0.6;
}
.oeos-top {
  position: absolute;
  height: 70%;
  top: 0;
  left: 0;
  right: 0;
}
.oeos-image-full .oeos-top {
  height: 100%;
}
.oeos-right {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 10px;
  pointer-events: auto;
}
.oeos-notifications {
  position: absolute;
  overflow: visible;
  bottom: 30%;
  right: 10px;
}
.oeos-bottom {
  position: absolute;
  overflow-y: scroll;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  /* scroll-behavior: smooth; */
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 10%);
  mask-image: linear-gradient(180deg, transparent 0, #000 10%);
  overflow-anchor: none;
}
.oeos-image-full .oeos-bottom {
  pointer-events: none;
}
.oeos-clickable {
  pointer-events: auto;
}
.oeos-bottom::-webkit-scrollbar {
  /* WebKit */
  width: 0;
  height: 0;
}
.oeos-bottom.has-image {
  top: 70%;
}
.oeos-image {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
.oeos-video-overlays,
.oeos-image-overlays {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 100%;
  height: 100%;
  -webkit-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
}
.oeos-image img {
  display: block;
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: 100%;
  height: 100%;
  object-fit: contain;
  -webkit-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
  min-width: 0;
  box-sizing: border-box;
  user-select: none;
  filter: drop-shadow(0 0 25px rgba(0, 0, 0, 0.3));
}
.oeos-video {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
.oeos-video video {
  display: none;
  position: absolute;
  left: 50%;
  top: 50%;
  max-width: 100%;
  height: 100%;
  object-fit: contain;
  -webkit-transform: translate(-50%, -50%);
  transform: translate(-50%, -50%);
  min-width: 0;
  box-sizing: border-box;
  user-select: none;
  pointer-events: none;
  filter: drop-shadow(0 0 25px rgba(0, 0, 0, 0.3));
}
/* hide video controls on safari iOS */
.oeos-video *::-webkit-media-controls-timeline,
.oeos-video *::-webkit-media-controls-container,
.oeos-video *::-webkit-media-controls-container,
.oeos-video *::-webkit-media-controls-start-playback-button,
.oeos-video *::-webkit-media-controls-play-button,
.oeos-video *::-webkit-media-controls-panel,
.oeos-video *::-webkit-media-controls {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  -webkit-appearance: none !important;
  z-index: -200 !important;
}

.oeos-video video.oeos-show {
  display: block;
}
.oeos-scroll-button {
  position: absolute;
  bottom: 5px;
  right: 5px;
  opacity: 0.8;
}
.oeos-bubble {
  margin-bottom: 8px;
  user-select: none;
}
.oeos-bubble p {
  margin-bottom: 0px;
  padding: 3px;
  user-select: text;
}
.oeos-bubble.oeos-align-center {
  margin-right: auto;
  margin-left: auto;
}
.oeos-bubble.oeos-align-left {
  margin-right: auto;
}
.oeos-bubble.oeos-align-right {
  margin-left: auto;
}
.oeos-bubble-end {
  display: block;
  height: 1px;
}
.oeos-say-item {
  max-width: 95%;
}
.oeos-choice-item {
  margin-bottom: 0px;
  max-width: 95%;
}
.oeos-choice-item .v-btn {
  margin-bottom: 6px;
}
.oeos-blink-button,
.oeos-start-button {
  animation: fadeinout 1.5s linear forwards;
  animation-iteration-count: infinite;
}
.oeos-blink-button {
  position: absolute;
  right: 5px;
  bottom: 7px;
}
.oeos-start-button {
  text-align: center;
  margin-left: auto;
  margin-right: auto;
}
.oeos-text-standard {
  font-size: 1.1rem;
}
.theme--dark.v-card > .v-card__text,
.theme--dark.v-card .v-card__subtitle {
  color: rgba(255, 255, 255, 0.8);
}

.oeos-main .v-btn.v-size--default {
  height: auto;
  min-height: 36px;
  font-size: 1.1rem;
  font-family: 'Noto Sans', sans-serif;
  letter-spacing: normal;
  font-weight: bold;
}

.oeos-main .v-btn.v-size--small {
  height: auto;
  min-height: 26px;
  font-size: 1rem;
  font-family: 'Noto Sans', sans-serif;
  letter-spacing: normal;
  font-weight: bold;
}

.oeos-main .v-btn.v-size--default .v-btn__content {
  max-width: 100%;
}

.oeos-main .v-btn.v-size--default .v-btn__content > span {
  white-space: normal;
}

@keyframes fadeinout {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.6;
  }
}

/* Use styles from EOS buttons for teases that used these classes */
.Button_root__28K_E {
  background: #111
    linear-gradient(180deg, hsla(0, 0%, 100%, 0.15), hsla(0, 0%, 100%, 0))
    repeat-x;
  display: inline-block;
  padding: 5px 10px 6px;
  color: #fff;
  text-decoration: none;
  border-radius: 5px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.25);
  position: relative;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  font-size: 100%;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 -1px 1px rgba(0, 0, 0, 0.5);
}
.Button_root__28K_E:hover {
  background: #111
    linear-gradient(180deg, hsla(0, 0%, 100%, 0.2), hsla(0, 0%, 100%, 0.1))
    repeat-x;
}
.Button_root__28K_E:active {
  top: 1px;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}
</style>
