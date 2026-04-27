import { createRouter, createWebHashHistory } from 'vue-router';
import Home from './views/Home.vue';
import Play from './views/Play.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/play', name: 'play', component: Play },
    {
      path: '/about',
      name: 'about',
      component: () => import('./views/About.vue')
    }
  ]
});
