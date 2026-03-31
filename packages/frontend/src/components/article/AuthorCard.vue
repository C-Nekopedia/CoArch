<script setup lang="ts">
import { useUIStore } from '@stores/ui'
import { computed } from 'vue'
import Avatar from '@components/ui/Avatar.vue'

interface Props {
  author: {
    name: string
    avatar: string
    bio: string
    stats: string
    username?: string
  }
}

const props = defineProps<Props>()
const uiStore = useUIStore()


const profileLink = computed(() => {
  const username = props.author.username || props.author.name
  return { name: 'Profile', params: { username } }
})

const handleFollow = (e: Event) => {
  e.stopPropagation()
  e.preventDefault()
  uiStore.showDevelopmentNotice('关注')
}

const handleMessage = (e: Event) => {
  e.stopPropagation()
  e.preventDefault()
  uiStore.showDevelopmentNotice('私信')
}
</script>

<template>
  <router-link :to="profileLink" class="author-card-link">
    <div class="author-card">
      <Avatar
        :src="author.avatar"
        :name="author.name"
        size-preset="lg"
        class="author-avatar"
      />
      <div class="author-info">
        <div class="author-name">{{ author.name }}</div>
        <div class="author-bio">{{ author.bio }}</div>
        <div class="author-stats">{{ author.stats }}</div>
        <div class="author-actions">
          <button class="follow-btn" @click="handleFollow">关注</button>
          <button class="message-btn" @click="handleMessage">私信</button>
        </div>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
.author-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  gap: 20px;
  align-items: center;
}


.author-avatar {
  flex-shrink: 0;
}


.author-info {
  flex: 1;
}

.author-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.author-bio {
  font-size: 13px;
  color: #5e636b;
  margin-bottom: 8px;
  line-height: 1.4;
}

.author-stats {
  font-size: 12px;
  color: #9499a0;
  margin-bottom: 12px;
}

.follow-btn {
  background-color: #fb7299;
  border: none;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.follow-btn:hover {
  background-color: #fc5c7d;
}

.author-actions {
  display: flex;
  gap: 8px;
}

.message-btn {
  background-color: rgba(251, 114, 153, 0.1);
  border: 1px solid #fb7299;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #fb7299;
  cursor: pointer;
  transition: background-color 0.2s;
}

.message-btn:hover {
  background-color: rgba(251, 114, 153, 0.2);
}

@media (max-width: 680px) {
  .author-card {
    padding: 20px;
  }
}

.author-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.author-card-link:hover .author-card {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}
</style>