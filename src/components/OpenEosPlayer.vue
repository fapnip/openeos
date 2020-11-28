<template>
  <div class="oeos-main" @click="onBodyClick">
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
      <div class="oeos-image"><img :src="image.href" /></div>
    </div>
    <div class="oeos-right">
      <countdown-timer
        v-for="(timer, i) in timers"
        :key="timer.id + ':' + i"
        :duration="timer.duration"
        :type="timer.style"
        :is-debug="isDebug"
        @timeout="timer.onTimeout"
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

// Components
import VueSwitch from './common/VueSwitch'
import CountdownTimer from './sidebar/CountdownTimer'
import NotificationItem from './sidebar/NotificationItem'
import SayBubble from './bubbles/SayBubble'
import ChoiceBubble from './bubbles/ChoiceBubble'
import PromptBubble from './bubbles/PromptBubble'

// Interpreter Polyfills
import PromisePoly from '!!raw-loader!../interpreter/polyfills/promise.js'

// Raw code
import TestCode from '!!raw-loader!../interpreter/code/test.js'

// import testJson from '../assets/test.json'

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
  ],
  data: () => ({
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
    this.checkActionContainer()
  },
  watch: {
    image(image) {
      if (this.forcedBackgroundColor) return
      if (!image || !image.href) return
      this.setBackgroundFromImage(image.href)
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
    async setBackgroundFromImage(imageHref) {
      const { DarkMuted } = await Vibrant.from(imageHref).getPalette()
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
      const srollpx =
        oeosBottom.scrollHeight -
        (oeosBottom.scrollTop + oeosBottom.clientHeight)
      if (oeosBottom && lastItem) {
        if (srollpx > 0) {
          this.$scrollTo(lastItem, {
            container: oeosBottom,
            onStart: () => {
              console.log('Doing Scroll')
              scrolling = true
            },
            onDone: () => {
              scrolling = false
              this.scrollToBottom()
            },
            onCancel: () => {
              scrolling = false
            },
          })
        }
      }
    },
    installInterpreterModules(interpreter, globalObject) {
      this.installConsole(interpreter, globalObject)
      this.installNativeTimers(interpreter, globalObject)
      interpreter.appendCode(PromisePoly)
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
      interpreter.appendCode(TestCode)
      interpreter.run()
      interpreter.appendCode(this.getInitScript())
      interpreter.run()
      this.debug('Loaded Init Script')
      this.showPage('start')
      interpreter.run()
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
  scroll-behavior: smooth;
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
</style>
