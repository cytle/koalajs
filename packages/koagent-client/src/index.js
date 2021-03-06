import Vue from 'vue';
import store from './store';
import ElementUI from 'element-ui';
import 'normalize.css/normalize.css';
import 'element-ui/lib/theme-chalk/index.css';
import router from './router';
import App from './App';

Vue.config.productionTip = false;

Vue.use(ElementUI);

const app = new Vue({
  store,
  router,
  render: h => h(App),
});

store.dispatch('addMenusFromRouter', router);
const client = {
  router,
  store,
  app,
  use(middleware) {
    middleware(client);
  },
};

export default client;
