import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from 'src/stores/auth'
import { useChatStore } from 'src/stores/chat'

import type { User } from 'src/types'

export const useMainStore = defineStore('main', () => {
  const authStore = useAuthStore()
  const chatStore = useChatStore()

  // STATE
  const state = ref({
    user: <User | null>null,
    error: ref({
      text: <string | null>null,
      timeout: <ReturnType<typeof setTimeout> | null>null,
    }),
    wsConnected: ref(false),
    connectionStatus: ref<'connecting' | 'connected' | 'error'>('connecting'),
    chatHeaderData: ref({ title: '', subtitle: '' }),
  })

  // GETTERS
  const user = computed(() => state.value.user)
  const chatHeaderData = computed(() => state.value.chatHeaderData)
  const error = computed(() => state.value.error.text)
  const wsConnected = computed(() => state.value.wsConnected)
  const connectionStatus = computed(() => state.value.connectionStatus)

  // SETTERS
  const setUser = (user: User) => {
    state.value.user = user
  }

  const setWsConnected = (value: boolean) => {
    state.value.wsConnected = value
  }

  const setChatHeaderData = ({ title, subtitle }: { title?: string; subtitle?: string }) => {
    if (title) {
      state.value.chatHeaderData.title = title
    }

    if (subtitle) {
      state.value.chatHeaderData.subtitle = subtitle
    }
  }

  // ACTIONS
  const displayError = (error: string) => {
    state.value.error.text = error

    if (state.value.error.timeout) {
      clearTimeout(state.value.error.timeout)
    }

    state.value.error.timeout = setTimeout(() => {
      state.value.error.text = null
    }, 3000)
  }

  const init = () => {
    state.value.connectionStatus = 'connecting'

    void authStore
      .appLogin()
      .then(() => {
        state.value.connectionStatus = 'connected'

        chatStore.fetchContacts()
      })
      .catch((err) => {
        state.value.connectionStatus = 'error'
        displayError(err)

        setTimeout(() => {
          init()
        }, 5000)
      })
  }

  return {
    user,
    wsConnected,
    chatHeaderData,
    error,
    connectionStatus,
    chat: chatStore,
    init,
    setUser,
    setWsConnected,
    setChatHeaderData,
    displayError,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMainStore, import.meta.hot))
}
