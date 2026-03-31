import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@views/Home.vue'),
    meta: {
      title: 'Co-Arch · 发现创作',
      requiresAuth: false,
      showFooter: true
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@views/Login.vue'),
    meta: {
      title: '登录 · Co-Arch',
      guestOnly: true
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@views/Register.vue'),
    meta: {
      title: '注册 · Co-Arch',
      guestOnly: true
    }
  },
  {
    path: '/articles/:id',
    name: 'ArticleDetail',
    component: () => import('@views/ArticleDetail.vue'),
    meta: {
      title: '文章详情 · Co-Arch',
      requiresAuth: false
    },
    props: true
  },
  {
    path: '/articles/:id/edit',
    name: 'ArticleEdit',
    component: () => import('@views/Submit.vue'),
    meta: {
      title: '编辑文章 · Co-Arch',
      requiresAuth: true,
      requiresOwnership: true
    },
    props: (route) => ({
      mode: 'edit',
      articleId: route.params.id,
      articleType: 'article'
    })
  },
  {
    path: '/videos/:id',
    name: 'VideoDetail',
    component: () => import('@views/VideoDetail.vue'),
    meta: {
      title: '视频详情 · Co-Arch',
      requiresAuth: false
    },
    props: true
  },
  {
    path: '/videos/:id/edit',
    name: 'VideoEdit',
    component: () => import('@views/Submit.vue'),
    meta: {
      title: '编辑视频 · Co-Arch',
      requiresAuth: true,
      requiresOwnership: true
    },
    props: (route) => ({
      mode: 'edit',
      articleId: route.params.id,
      articleType: 'video'
    })
  },
  {
    path: '/profile/:username?',
    name: 'Profile',
    component: () => import('@views/Profile.vue'),
    meta: {
      title: '个人主页 · Co-Arch',
      requiresAuth: false
    },
    props: true
  },
  {
    path: '/submit',
    name: 'Submit',
    component: () => import('@views/Submit.vue'),
    meta: {
      title: '投稿 · Co-Arch',
      requiresAuth: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@views/NotFound.vue'),
    meta: {
      title: '页面未找到 · Co-Arch'
    }
  }
]

export default routes