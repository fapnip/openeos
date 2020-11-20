<template>
  <div class="oeos-main">
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
          v-for="interaction in interactions"
          :key="interaction.id"
          class="text-center pa-0 ma-0"
        >
          <v-col class="text-center pa-0 ma-0">
            <vue-switch :value="interaction.type">
              <template #say>
                <say-action
                  :value="interaction.item"
                  :active="interaction.item.active"
                  :is-debug="isDebug"
                ></say-action>
              </template>
              <template #choice>
                <choice-action
                  :value="interaction.item"
                  :active="interaction.item.active"
                  :is-debug="isDebug"
                ></choice-action>
              </template>
              <template #prompt>
                <prompt-action
                  :value="interaction.item"
                  :active="interaction.item.active"
                  :is-debug="isDebug"
                ></prompt-action>
              </template>
            </vue-switch>
          </v-col>
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
      <notification-item
        v-for="(notification, i) in notifications"
        :key="notification.id + ':' + i"
        :duration="notification.timerDuration"
        :title="notification.title"
        :buttonLabel="notification.buttonLabel"
        :is-debug="isDebug"
        @timeout="notification.onTimeout"
        @button-click="notification.onClick"
      >
      </notification-item>
    </div>
    <v-fab-transition>
      <v-btn
        v-show="!scrolledToBottom"
        class="oeos-scroll-button"
        fab
        dark
        small
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
import CountdownTimer from './common/CountdownTimer'
import SayAction from './common/SayAction'
import ChoiceAction from './common/ChoiceAction'
import PromptAction from './common/PromptAction'
import NotificationItem from './common/NotificationItem'

// Interpreter Polyfills
import PromisePoly from '!!raw-loader!../interpreter/polyfills/promise.js'

// Raw code
// import TestCode from '!!raw-loader!../interpreter/code/test.js'

// import testJson from '../assets/test.json'

let interactCounter = 0

export default {
  name: 'OpenEosPlayer',
  components: {
    VueSwitch,
    CountdownTimer,
    SayAction,
    ChoiceAction,
    PromptAction,
    NotificationItem,
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
  }),
  computed: {
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
  methods: {
    debug() {
      if (this.isDebug) {
        console.log(...arguments)
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
    checkActionContainer(e) {
      if (e && e.target) {
        this.scrollActionContainer(e.target)
      }
    },
    scrollActionContainer({ scrollTop, clientHeight, scrollHeight }) {
      // console.log(scrollTop, clientHeight, scrollHeight)
      this.scrolledToBottom = scrollTop + clientHeight >= scrollHeight
    },
    scrollToBottom() {
      const oeosBottom = this.$refs.oeosBottom
      if (oeosBottom) {
        oeosBottom.scrollTop = oeosBottom.scrollHeight - oeosBottom.clientHeight
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
      this.debug(
        'Loaded Interpreter',
        Interpreter,
        interpreter,
        interpreter.globalObject
      )
      this.setScript(this.script)
      interpreter.appendCode(this.getInitScript())
      interpreter.run()
      this.debug('Loaded Init Script')
      // interpreter.appendCode(TestCode)
      this.showPage('start')
      interpreter.run()
    },
  },
}
</script>
<style scoped>
.oeos-main {
  height: 100%;
  width: 100%;
}
.oeos-top {
  position: absolute;
  height: 70%;
  max-height: 70%;
  top: 0;
  left: 0;
  right: 0;
  background: black;
}
.oeos-right {
  position: absolute;
  top: 0;
  right: 10px;
}
.oeos-notifications {
  position: absolute;
  top: 50%;
  right: 10px;
}
.oeos-bottom {
  position: absolute;
  overflow-y: scroll;
  top: 70%;
  bottom: 0;
  left: 0;
  right: 0;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  scroll-behavior: smooth;
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
}
.oeos-bottom.has-image {
  top: 70%;
}
.oeos-bottom::-webkit-scrollbar {
  /* WebKit */
  width: 0;
  height: 0;
}
.oeos-image {
  height: 100%;
  padding: 5px;
  margin-left: auto;
  margin-right: auto;
  width: auto;
  text-align: center;
}
.oeos-image img {
  height: 100%;
  box-sizing: border-box;
}
.oeos-scroll-button {
  position: absolute;
  bottom: 4px;
  right: 4px;
}
</style>
