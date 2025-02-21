<template>
  <q-chat-message
    :key="message.id"
    :name="user ? user.name : 'Вы'"
    :avatar="AvatarPlaceholder"
    :text="[message.text]"
    :sent="!user"
    :stamp="
      new Date(message.created_at).getHours() + ':' + new Date(message.created_at).getMinutes()
    "
    :bg-color="user ? 'primary' : ''"
    :text-color="user ? 'white' : ''"
  />
</template>

<script setup lang="ts">
import AvatarPlaceholder from 'src/assets/avatar-placeholder.webp'
import type { Message, User } from 'src/types'

const props = defineProps<{
  message: Message
  user: User
}>()

// console.log(props)
</script>
