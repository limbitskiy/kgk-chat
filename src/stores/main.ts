import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref } from 'vue'
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
    currentDialog: ref<CurrentDialog>(),
    wsConnected: ref(false),
    isChatLoading: ref(false),
    cachedUsers: useLocalStorage<{ [key: number]: User }>('cached-users', {}),
    chatHeaderData: ref({ title: '', subtitle: '' }),
  })

  const user = computed(() => state.value.user)
  const contacts = computed(() => state.value.contacts)
  const messages = computed(() => state.value.currentDialog?.messages)
  const currentDialog = computed(() => state.value.currentDialog)
  const wsConnected = computed(() => state.value.wsConnected)
  const isChatLoading = computed(() => state.value.isChatLoading)
  const cachedUsers = computed(() => state.value.cachedUsers)
  const chatHeaderData = computed(() => state.value.chatHeaderData)

  const setChatHeaderData = ({ title, subtitle }: { title?: string; subtitle?: string }) => {
    if (title) {
      state.value.chatHeaderData.title = title
    }

    if (subtitle) {
      state.value.chatHeaderData.subtitle = subtitle
    }
  }

  const setLoadedUsers = (users: { key: string; value: User }[]) => {
    users.forEach((item) => {
      state.value.cachedUsers[item.value.id] = item.value
    })
  }

  const setChatLoading = (value: boolean) => {
    state.value.isChatLoading = value
  }

  const setUser = (user: User) => {
    state.value.user = user
  }

  const setWsConnected = (value: boolean) => {
    state.value.wsConnected = value
  }

  // collapse into a single fn
  const setCurrentDialog = (data: { msg_id: number; payload: { value: Message }[] }) => {
    const dialogObject = {
      id: data.msg_id,
      name: 'Название беседы/контакта',
      messages: data.payload.map((msg) => msg.value),
    }

    const messages = data.payload.map((msg) => msg.value)
    const ids = getUserIdsFromMessages(messages)
    const uncachedUsers = ids.filter((id) => !cachedUsers.value[id])

    if (uncachedUsers?.length) {
      fetchUsers(uncachedUsers)
    } else {
      setChatLoading(false)
    }

    state.value.currentDialog = dialogObject
  }

  // collapse into a single fn
  const startNewCurrentDialog = (data: { msg_id: number; payload: { value: Message }[] }) => {
    const dialogObject = {
      id: data.msg_id,
      name: 'Название беседы/контакта',
      messages: [],
    }

    state.value.currentDialog = dialogObject
  }

  const setContacts = (contacts: { value: Contact }[]) => {
    state.value.contacts = contacts.map((contact) => contact.value)
  }

  const addContact = (contact: Contact) => {
    state.value.contacts.push(contact)
  }

  const addMessage = (message: Message) => {
    state.value.currentDialog?.messages.push(message)
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
            currentDialog.value?.id,
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
    setLoadedUsers,
    setChatHeaderData,
    sendMsg,
    createPrivateChat,
    startNewCurrentDialog,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMainStore, import.meta.hot))
}
