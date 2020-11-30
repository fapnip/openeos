<template>
  <loading v-if="loading">{{ loadingText }}</loading>
  <div v-else-if="!started" class="oeos-main" @click="runTease">
    <global-events @keydown.space="runTease" @keydown.enter="runTease" />
    <div class="oeos-start-title">{{ title }}</div>
    <div v-if="author" class="oeos-start-author">by {{ author }}</div>
    <div class="oeos-start-button">
      <v-btn icon small
        ><v-icon dark>mdi-arrow-right-drop-circle</v-icon></v-btn
      >
    </div>
  </div>
  <div v-else class="oeos-main" @click="onBodyClick">
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
      :class="{
        'oeos-bottom': true,
        'has-image': !!image,
      }"
      v-scroll.self="checkActionContainer"
      v-resize="checkActionContainer"
      ref="oeosBottom"
    >
      <v-container fill-height class="pa-0">
        <v-row
          :style="{ height: bubbleHeight + 'px' }"
          class="text-center pa-0 ma-0"
        >
        </v-row>
        <v-row
          v-for="interaction in interactions"
          :key="interaction.id"
          class="text-center pa-0 ma-0"
        >
          <div :class="bubbleClass(interaction)">
            <vue-switch :value="interaction.type">
              <template #say>
                <say-bubble
                  :ref="'say_' + interaction.id"
                  :value="interaction.item"
                  :active="interaction.item.active"
                  :is-debug="isDebug"
                ></say-bubble>
              </template>
              <template #choice>
                <choice-bubble
                  :value="interaction.item"
                  :active="interaction.item.active"
                  :is-debug="isDebug"
                ></choice-bubble>
              </template>
              <template #prompt>
                <prompt-bubble
                  :value="interaction.item"
                  :active="interaction.item.active"
                  :is-debug="isDebug"
                ></prompt-bubble>
              </template>
            </vue-switch>
          </div>
        </v-row>
        <div ref="lastItem"></div>
      </v-container>
    </div>
    <div v-if="image" class="oeos-top">
      <div class="oeos-image">
        <img
          ref="mainImage"
          :src="image.href"
          crossOrigin="anonymous"
          @click="imageClick"
        />
      </div>
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
        >
        </notification-item>
      </div>
    </div>
    <v-fab-transition>
      <v-btn
        v-show="!scrolledToBottom"
        class="oeos-scroll-button"
        fab
        dark
        x-small
        @click="scrollToBottom"
      >
        <v-icon>mdi-arrow-down-bold</v-icon>
      </v-btn>
    </v-fab-transition>
  </div>
</template>

<script>
import Interpreter from '../interpreter'
const interpreter = new Interpreter('')
interpreter.REGEXP_MODE = 1

// Module Mixins
import Script from '../mixins/Script'
import Console from '../mixins/Console'
import EventManager from '../mixins/EventManager'
import NativeTimers from '../mixins/NativeTimers'
import PageManager from '../mixins/PageManager'
import Timer from '../mixins/Timer'
import Say from '../mixins/Say'
import Choice from '../mixins/Choice'
import Prompt from '../mixins/Prompt'
import Notification from '../mixins/Notification'
import Sound from '../mixins/Sound'
import Storage from '../mixins/Storage'
import Image from '../mixins/Image'

// Components
import Loading from './common/Loading'
import VueSwitch from './common/VueSwitch'
import CountdownTimer from './sidebar/CountdownTimer'
import NotificationItem from './sidebar/NotificationItem'
import SayBubble from './bubbles/SayBubble'
import ChoiceBubble from './bubbles/ChoiceBubble'
import PromptBubble from './bubbles/PromptBubble'

// Interpreter Polyfills
// import PromisePoly from '!!raw-loader!../interpreter/polyfills/promise.js'

import backgroundImage from '../assets/bg-texture.png'

import Vibrant from 'node-vibrant/lib/browser.js'
import Pipeline from 'node-vibrant/lib/pipeline/index.js'

Vibrant.use(Pipeline)

let interactCounter = 0
let scrolling = false
let isScrolled = null

export default {
  name: 'OpenEosPlayer',
  components: {
    Loading,
    VueSwitch,
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
  },
  mixins: [
    Script,
    Console,
    EventManager,
    NativeTimers,
    PageManager,
    Timer,
    Say,
    Choice,
    Prompt,
    Notification,
    Sound,
    Storage,
    Image,
  ],
  data: () => ({
    loading: true,
    started: false,
    isDebug: true,
    stack: [],
    commands: [],
    currentAction: null,
    interactions: [],
    scrolledToBottom: true,
    image: null,
    backgroundTexture: null,
    backgroundColor: null,
    forcedBackgroundColor: null,
    bubbleHeight: 0,
    loadingText: 'Preloading images...',
  }),
  computed: {
    currentBackgroundColor() {
      return this.forcedBackgroundColor || this.backgroundColor
    },
    selectedBackgroundTexture() {
      return (
        this.currentBackgroundColor &&
        (this.backgroundTexture || backgroundImage)
      )
    },
    initScript() {
      return this.script.init || ''
    },
  },
  // beforeMount() {
  //   this.script = testJson
  // },
  mounted() {
    this.initInterpreter()
  },
  watch: {
    image(image) {
      if (this.forcedBackgroundColor) return
      if (!image || !image.href) return
      this.$nextTick(() => {
        this.setBackgroundFromImage()
      })
    },
    started(val) {
      if (val) {
        this.$nextTick(() => {
          this.checkActionContainer()
        })
      }
    },
  },
  methods: {
    bubbleClass(interaction) {
      const item = interaction.item || {}
      const result = {
        'oeos-bubble': true,
      }
      result[`oeos-${interaction.type}-item`] = true
      result['oeos-align-' + (item.align || 'center')] = true
      return result
    },
    async setBackgroundFromImage() {
      const img = this.$refs.mainImage
      if (!img) return
      const { DarkMuted } = await Vibrant.from(img).getPalette()
      this.backgroundColor = DarkMuted.getHex()
    },
    debug() {
      if (this.isDebug) {
        console.log(...arguments)
      }
    },
    onBodyClick() {
      const li = this.interactions[this.interactions.length - 1]
      if (li && li.type === 'say' && li.item.active) {
        const ref = this.$refs['say_' + li.id]
        if (ref) {
          console.log('clicking say', ref)
          ref[0].$el.click()
        }
      }
    },
    purgePageInteractions() {
      for (let i = this.interactions.length - 1; i >= 0; i--) {
        if (!this.interactions[i].persist) {
          this.interactions.splice(i, 1)
        }
      }
    },
    removeInteraction(item) {
      const index = this.interactions.findIndex(i => i === item)
      if (index > -1) {
        this.interactions.splice(index, 1)
      }
    },
    addInteraction(type, item) {
      const currentInteraction = this.interactions[this.interactions.length - 1]
      if (
        currentInteraction &&
        typeof currentInteraction.item.setInactive === 'function'
      ) {
        currentInteraction.item.setInactive()
      }
      const newInteraction = {
        type: type,
        item: item,
        id: interactCounter++,
      }
      this.interactions.push(newInteraction)

      console.log(
        'Adding ' + newInteraction.type,
        newInteraction,
        this.interactions
      )
      this.$nextTick(() => {
        this.scrollToBottom()
      })
      return interactCounter
    },
    checkActionContainer() {
      const oeosBottom = this.$refs.oeosBottom
      if (oeosBottom) {
        this.setScrollToBottom(oeosBottom)
      }
    },
    setScrollToBottom(oeosBottom) {
      // console.log(scrollTop, clientHeight, scrollHeight)

      this.bubbleHeight = oeosBottom.clientHeight
      let isAtBottom =
        oeosBottom.scrollTop + oeosBottom.clientHeight >=
        oeosBottom.scrollHeight
      if (isScrolled) clearTimeout(isScrolled)
      isScrolled = false
      if (!isAtBottom && this.scrolledToBottom) {
        isScrolled = setTimeout(() => {
          this.scrolledToBottom =
            oeosBottom.scrollTop + oeosBottom.clientHeight >=
            oeosBottom.scrollHeight
        }, 250)
      } else if (isAtBottom) {
        this.scrolledToBottom = isAtBottom
      }
    },
    scrollToBottom() {
      if (scrolling) return
      const oeosBottom = this.$refs.oeosBottom
      const lastItem = this.$refs.lastItem
      if (oeosBottom && lastItem) {
        const srollpx =
          oeosBottom.scrollHeight -
          (oeosBottom.scrollTop + oeosBottom.clientHeight)
        if (oeosBottom && lastItem) {
          if (srollpx > 0) {
            this.$scrollTo(lastItem, {
              container: oeosBottom,
              duration: 500,
              onStart: () => {
                console.log('Doing Scroll')
                scrolling = true
              },
              onDone: () => {
                scrolling = false
                // this.scrollToBottom()
              },
              onCancel: () => {
                scrolling = false
              },
              // easing: 'ease-in',
              lazy: false,
            })
          }
        }
      }
    },
    installInterpreterModules(interpreter, globalObject) {
      this.installConsole(interpreter, globalObject)
      this.installNativeTimers(interpreter, globalObject)
      // interpreter.appendCode(PromisePoly)
      interpreter.run()
      this.installEventManager(interpreter, globalObject)
      this.installPageManager(interpreter, globalObject)
      this.installTimer(interpreter, globalObject)
      this.installSay(interpreter, globalObject)
      this.installChoice(interpreter, globalObject)
      this.installPrompt(interpreter, globalObject)
      this.installNotification(interpreter, globalObject)
      this.installSound(interpreter, globalObject)
      this.installStorage(interpreter, globalObject)
    },
    initInterpreter() {
      this.Interpreter = Interpreter

      this.interpreter = interpreter
      this.installInterpreterModules(interpreter, interpreter.globalObject)
      interpreter.run()
      this.debug(
        'Loaded Interpreter',
        Interpreter,
        interpreter,
        interpreter.globalObject
      )
      this.setScript(this.script)
      interpreter.run()
      interpreter.appendCode(this.getInitScript())
      interpreter.run()
      this.debug('Loaded Init Script')
      this.showPage('start', true)
      this.loading = false
    },
    runTease() {
      const sounds = this.popStartupSounds()

      if (sounds.length) {
        // We have sounds to pre-load
        this.loading = true
        this.loadingText = 'Preloading audio...'
        this.shiftAfterPreload(() => {
          this.loading = false
          this.started = true
          this.interpreter.run()
        })
        for (const soundOption of sounds) {
          this.preloadSound(soundOption, true)
        }
      } else {
        this.started = true
        this.interpreter.run()
      }
    },
  },
}
</script>
<style>
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
  background-size: 520px;
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
.oeos-right {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 10px;
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
.oeos-bottom::-webkit-scrollbar {
  /* WebKit */
  width: 0;
  height: 0;
}
.oeos-bottom.has-image {
  top: 70%;
}
.oeos-image {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  height: 100%;
  box-sizing: border-box;
  /* padding: 5px; */
}
.oeos-image img {
  display: block;
  object-fit: contain;
  object-position: 50% 50%;
  height: 100%;
  max-width: 100%;
  box-sizing: border-box;
  filter: drop-shadow(0 0 25px rgba(0, 0, 0, 0.3));
}
.oeos-scroll-button {
  position: absolute;
  bottom: 5px;
  right: 5px;
  opacity: 0.8;
}
.oeos-bubble {
  margin-bottom: 6px;
}

.oeos-bubble p {
  margin-bottom: 0px;
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
.oeos-say-item {
  max-width: 90%;
}
.oeos-blink-button,
.oeos-start-button {
  animation: fadeinout 1.5s linear forwards;
  animation-iteration-count: infinite;
}
.oeos-blink-button {
  position: absolute;
  right: 5px;
  bottom: 3px;
}
.oeos-start-button {
  text-align: center;
  margin-left: auto;
  margin-right: auto;
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
