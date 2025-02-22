import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
import { useAuthStore } from 'src/stores/auth'
import { useChatStore } from 'src/stores/chat'

import type { User } from 'src/types'
import { login } from 'src/api'

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
    chatHeaderData: ref({ title: '', subtitle: '' }),
    wsConnectionStatus: ref(false),
    loginStatus: ref<'connecting' | 'connected' | 'error'>('connecting'),
  })

  // GETTERS
  const user = computed(() => state.value.user)
  const chatHeaderData = computed(() => state.value.chatHeaderData)
  const error = computed(() => state.value.error.text)
  const wsConnectionStatus = computed(() => state.value.wsConnectionStatus)
  const loginStatus = computed(() => state.value.loginStatus)

  // SETTERS
  const setUser = (user: User) => {
    state.value.user = user
  }

  const setWsConnected = (value: boolean) => {
    state.value.wsConnectionStatus = value
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

  const init = async () => {
    state.value.loginStatus = 'connecting'

    try {
      await authStore.login()
      state.value.loginStatus = 'connected'
    } catch (error) {
      state.value.loginStatus = 'error'
      displayError(error as string)

      setTimeout(() => {
        void init()
      }, 5000)
    }

    await authStore.wsLogin()
    chatStore.fetchContacts()

    //  old version
    //   void authStore
    //     .appLogin()
    //     .then(() => {
    //       state.value.loginStatus = 'connected'

    //       chatStore.fetchContacts()
    //     })
    //     .catch((err) => {
    //       state.value.loginStatus = 'error'
    //       displayError(err)

    //       setTimeout(() => {
    //         init()
    //       }, 5000)
    //     })
  }

  return {
    user,
    wsConnectionStatus,
    chatHeaderData,
    error,
    loginStatus,
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
