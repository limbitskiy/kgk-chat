import { defineStore } from 'pinia'
import { login } from 'src/api'
import { useMainStore } from 'src/stores/main'
import { computed, ref } from 'vue'
import wsService from 'src/services/ws'

export const useAuthStore = defineStore('auth', () => {
  const mainStore = useMainStore()

  const state = ref({
    token: <string | null>null,
    pubsub: <string | null>null,
  })

  const token = computed(() => state.value.token)
  const pubsub = computed(() => state.value.pubsub)

  const setToken = (token: string) => {
    state.value.token = token
  }

  const setPubSub = (pubsub: string) => {
    state.value.pubsub = pubsub
  }

  const register = async () => {
    // await makeRequest()
  }

  // separate http from ws connection
  const appLogin = async () => {
    const response = await login()

    if (!response) {
      return false
    }

    const { pubsub, token, user } = response

    // set data
    mainStore.setUser(user)
    setToken(token)
    setPubSub(pubsub)

    wsService.connect(pubsub)

    return true
  }

  const appLogout = async () => {
    // await makeRequest()
  }
  return { pubsub, token, register, appLogin, appLogout }
})
