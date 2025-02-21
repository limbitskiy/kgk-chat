import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  getContacts,
  contactSearch,
  getMessages,
  getUsers,
  sendMessage,
  startPrivateChat,
} from 'src/api'
import { useAuthStore } from 'src/stores/auth'
import { useLocalStorage } from '@vueuse/core'

import type { User, Contact, Message, CurrentDialog } from 'src/types'

export const useMainStore = defineStore('main', () => {
  const authStore = useAuthStore()

  const state = ref({
    user: <User | null>null,
    contacts: useLocalStorage<Contact[]>('chat-contacts', []),
    currentDialog: ref<{
      loading: boolean
      usersLoaded: boolean
      messagesLoaded: boolean
      data: CurrentDialog | null
    }>({
      loading: false,
      usersLoaded: false,
      messagesLoaded: false,
      data: null,
    }),
    error: ref({
      text: <string | null>null,
      timeout: <ReturnType<typeof setTimeout> | null>null,
    }),
    wsConnected: ref(false),
    connectionStatus: ref<'connecting' | 'connected' | 'error'>('connecting'),
    cachedUsers: useLocalStorage<{ [key: number]: User }>('cached-users', {}),
    chatHeaderData: ref({ title: '', subtitle: '' }),
  })

  const user = computed(() => state.value.user)
  const contacts = computed(() => state.value.contacts.sort((a, b) => a.name.localeCompare(b.name)))
  const messages = computed(() => state.value.currentDialog?.data?.messages)
  const currentDialog = computed(() => state.value.currentDialog)
  const wsConnected = computed(() => state.value.wsConnected)
  const isChatLoading = computed(() => state.value.currentDialog.loading)
  const cachedUsers = computed(() => state.value.cachedUsers)
  const chatHeaderData = computed(() => state.value.chatHeaderData)
  const error = computed(() => state.value.error.text)
  const connectionStatus = computed(() => state.value.connectionStatus)

  const setChatHeaderData = ({ title, subtitle }: { title?: string; subtitle?: string }) => {
    if (title) {
      state.value.chatHeaderData.title = title
    }

    if (subtitle) {
      state.value.chatHeaderData.subtitle = subtitle
    }
  }

  const onGetUsers = (userData: { key: string; value: User }[]) => {
    userData.forEach((item) => {
      state.value.cachedUsers[item.value.id] = item.value
    })
    state.value.currentDialog.usersLoaded = true
  }

  const setChatLoading = (value: boolean) => {
    resetCurrentDialog()
    state.value.currentDialog.loading = true
    watchCurrentDialog()
  }

  const resetCurrentDialog = () => {
    state.value.currentDialog.loading = false
    state.value.currentDialog.usersLoaded = false
    state.value.currentDialog.messagesLoaded = false
    state.value.currentDialog.data = null
  }

  const setUser = (user: User) => {
    state.value.user = user
  }

  const setWsConnected = (value: boolean) => {
    state.value.wsConnected = value
  }

  const setCurrentDialog = (id: number, messages: Message[]) => {
    const dialogObject = {
      id,
      messages: <Message[]>[],
    }

    if (messages?.length) {
      dialogObject.messages = messages

      const ids = getUserIdsFromMessages(messages)
      const uncachedUsers = ids.filter((id) => !isUserCached(id))

      if (uncachedUsers?.length) {
        fetchUsers(uncachedUsers)
      } else {
        state.value.currentDialog.usersLoaded = true
      }
    } else {
      state.value.currentDialog.usersLoaded = true
    }

    state.value.currentDialog.data = dialogObject
  }

  const setContacts = (contacts: Contact[]) => {
    state.value.contacts = contacts
  }

  const addContact = (contact: Contact) => {
    state.value.contacts.push(contact)
  }

  const addMessage = (message: Message) => {
    state.value.currentDialog.data?.messages.push(message)
  }

  const fetchContacts = () => {
    void getContacts(user.value!.id, authStore.token!, authStore.pubsub!)
  }

  const openChat = (chatId: number) => {
    if (!chatId) {
      console.error(`No chatId provided`)
      return
    }

    void chatRequest({ type: 'enter-chat', chatId })
  }

  const loadMessages = (chatId: number) => {
    if (!chatId) {
      console.error(`No chatId provided`)
      return
    }

    void chatRequest({ type: 'get-messages', chatId })
  }

  const sendMsg = (message: string) => {
    void chatRequest({ type: 'send-message', message })
  }

  const createPrivateChat = (otherUserId: number) => {
    if (!cachedUsers.value[otherUserId]) {
      fetchUsers([otherUserId])
    }
    void chatRequest({ type: 'start-private-chat', payload: otherUserId })
  }

  const searchContact = async (query: string) => {
    const results = await chatRequest({ type: 'contact-search', query })
    return results.filter((resultUser: User) => resultUser.id != user.value!.id)
  }

  const chatRequest = async ({
    type,
    chatId,
    query = '',
    payload = undefined,
    message = '',
  }: {
    type: string
    chatId?: number
    query?: string
    payload?: unknown
    message?: string
  }) => {
    switch (type) {
      // case 'enter-chat': {
      //   return await enterChat(user.value!.id, authStore.token!, chatId!, authStore.pubsub!)
      // }

      case 'contact-search': {
        return await contactSearch(query, authStore.token!)
      }

      case 'get-messages': {
        return await getMessages(user.value!.id, authStore.token!, chatId!, authStore.pubsub!)
      }

      case 'get-users': {
        return await getUsers(user.value!.id, authStore.token!, authStore.pubsub!, payload as [])
      }

      case 'start-private-chat': {
        return await startPrivateChat(
          user.value!.id,
          authStore.token!,
          authStore.pubsub!,
          payload as number,
        )
      }

      case 'send-message': {
        if (currentDialog.value) {
          return await sendMessage(
            user.value!.id,
            authStore.token!,
            authStore.pubsub!,
            currentDialog.value.data!.id,
            message,
          )
        }
      }
    }
  }

  const getUserIdsFromMessages = (messages: Message[]) => {
    const idSet = new Set()

    messages.forEach((msg) => {
      idSet.add(msg.sender_id)
    })

    idSet.delete(user.value!.id)

    return [...idSet] as number[]
  }

  const fetchUsers = (ids: number[]) => {
    const reformatted = ids.map((id) => ({ id }))
    void chatRequest({ type: 'get-users', payload: reformatted })
  }

  const onGetMessageData = (data: {
    status: string
    msg_id: number
    payload: { value: Message }[]
  }) => {
    const messages = data.payload.map((msg) => msg.value)

    setCurrentDialog(data.msg_id, messages)

    state.value.currentDialog.messagesLoaded = true
  }

  const watchCurrentDialog = () => {
    const unwatch = watch(
      currentDialog,
      () => {
        if (
          currentDialog.value.data &&
          currentDialog.value.messagesLoaded &&
          currentDialog.value.usersLoaded
        ) {
          state.value.currentDialog.loading = false
          unwatch()
        }
      },
      {
        deep: true,
      },
    )
  }

  const displayError = (error: string) => {
    state.value.error.text = error

    if (state.value.error.timeout) {
      clearTimeout(state.value.error.timeout)
    }

    state.value.error.timeout = setTimeout(() => {
      state.value.error.text = null
    }, 3000)
  }

  const onCreatePrivateChat = (data: { msg_id: number; payload: { value: Message }[] }) => {
    setCurrentDialog(data.msg_id, [])
    state.value.currentDialog.messagesLoaded = true
  }

  const onGetChats = (data: { value: Contact }[]) => {
    setContacts(data.map((item) => item.value))
  }

  const init = () => {
    state.value.connectionStatus = 'connecting'

    void authStore
      .appLogin()
      .then(() => {
        state.value.connectionStatus = 'connected'

        fetchContacts()
      })
      .catch((err) => {
        state.value.connectionStatus = 'error'
        displayError(err)

        setTimeout(() => {
          init()
        }, 5000)
      })
  }

  const isUserCached = (id: number) => !!cachedUsers.value[id]

  const updateStatus = (contactId: number, status: string) => {}

  return {
    user,
    contacts,
    currentDialog,
    messages,
    wsConnected,
    isChatLoading,
    cachedUsers,
    chatHeaderData,
    error,
    connectionStatus,
    setUser,
    setContacts,
    addMessage,
    setCurrentDialog,
    fetchContacts,
    openChat,
    searchContact,
    updateStatus,
    loadMessages,
    setWsConnected,
    setChatLoading,
    setChatHeaderData,
    sendMsg,
    createPrivateChat,
    onGetMessageData,
    onGetUsers,
    init,
    displayError,
    onCreatePrivateChat,
    onGetChats,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMainStore, import.meta.hot))
}
