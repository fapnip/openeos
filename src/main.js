// Replace all polyfill for older browsers
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(str, newStr) {
    // If a regex pattern
    if (
      Object.prototype.toString.call(str).toLowerCase() === '[object regexp]'
    ) {
      return this.replace(str, newStr)
    }

    // If a string
    return this.replace(
      new RegExp(str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
      newStr
    )
  }
}

import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import 'vue-resize/dist/vue-resize.css'
// import '@mdi/font/css/materialdesignicons.css'
import VueScrollTo from 'vue-scrollto'
import GlobalEvents from 'vue-global-events'
// import 'typeface-noto-sans'
import VueResize from 'vue-resize'

if (location.hostname === 'oeos-player-preview.herokuapp.com') {
  const query = window.location.search
  window.location.replace('https://oeos.ml' + query)
} else {
  Vue.config.productionTip = false

  Vue.use(VueResize)
  Vue.use(VueScrollTo)
  Vue.component('GlobalEvents', GlobalEvents)

  new Vue({
    vuetify,
    render: h => h(App),
  }).$mount('#app')
}
