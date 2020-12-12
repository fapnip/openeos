import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import '@mdi/font/css/materialdesignicons.css'
import VueScrollTo from 'vue-scrollto'
import GlobalEvents from 'vue-global-events'
import 'typeface-noto-sans'

Vue.config.productionTip = false

Vue.use(VueScrollTo)
Vue.component('GlobalEvents', GlobalEvents)

new Vue({
  vuetify,
  render: h => h(App),
}).$mount('#app')
