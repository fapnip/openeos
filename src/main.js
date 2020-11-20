import Vue from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import '@mdi/font/css/materialdesignicons.css'
import VueSmoothScroll from 'vue2-smooth-scroll'

Vue.config.productionTip = false

Vue.use(VueSmoothScroll, {
  duration: 400,
  updateHistory: false,
})

new Vue({
  vuetify,
  render: h => h(App),
}).$mount('#app')
