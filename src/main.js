import { createApp } from 'vue'
import { VueFire } from 'vuefire'
import App from './App.vue'
import { firebaseApp } from './firebase/client'
import router from './router'
import './style.css'

const app = createApp(App)

if (firebaseApp) {
  app.use(VueFire, {
    firebaseApp,
  })
}

app.use(router)
app.mount('#app')
