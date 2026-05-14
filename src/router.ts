import { createRouter, createWebHashHistory } from 'vue-router';
import Home from './views/Home.vue';
import Play from './views/Play.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/play', name: 'play', component: Play },
    { path: '/host', name: 'host', component: () => import('./components/MenuRoom.vue') },
    { path: '/join', name: 'join', component: () => import('./components/MenuJoin.vue') },
    { path: '/about', name: 'about', component: () => import('./views/About.vue') }
  ]
});
