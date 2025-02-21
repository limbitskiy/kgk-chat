import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  getContacts,
  contactSearch,
  getMessages,
  getUsers,
  sendMessage,
  startPrivateChat,
  getChatParticipants,
} from 'src/api'
import { useAuthStore } from 'src/stores/auth'
import { useMainStore } from 'src/stores/main'
import { useLocalStorage } from '@vueuse/core'

import type { User, Contact, Message, CurrentDialog } from 'src/types'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  const mainStore = useMainStore()

  // STATE
  const state = ref({
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
    cachedUsers: useLocalStorage<{ [key: number]: User }>('cached-users', {}),
  })

  // GETTERS
  const contacts = computed(() => state.value.contacts.sort((a, b) => a.name.localeCompare(b.name)))
  const messages = computed(() => state.value.currentDialog?.data?.messages)
  const currentDialog = computed(() => state.value.currentDialog)
  const isChatLoading = computed(() => state.value.currentDialog.loading)
  const cachedUsers = computed(() => state.value.cachedUsers)

  // SETTERS
  const setContacts = (contacts: Contact[]) => {
    state.value.contacts = contacts
  }

  //   ACTIONS
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

  const addContact = (contact: Contact) => {
    state.value.contacts.push(contact)
  }

  const addMessage = (message: Message) => {
    state.value.currentDialog.data?.messages.push(message)
  }

  const fetchContacts = () => {
    void getContacts(mainStore.user!.id, authStore.token!, authStore.pubsub!)
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

  const searchContact = async (query: string) => {
    const results = await chatRequest({ type: 'contact-search', query })
    return results.filter((resultUser: User) => resultUser.id != mainStore.user!.id)
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
      //   return await enterChat(mainStore.user.value!.id, authStore.token!, chatId!, authStore.pubsub!)
      // }

      case 'contact-search': {
        return await contactSearch(query, authStore.token!)
      }

      case 'get-chat-participants': {
        return await getChatParticipants(authStore.token!, chatId!)
      }

      case 'get-messages': {
        return await getMessages(mainStore.user!.id, authStore.token!, chatId!, authStore.pubsub!)
      }

      case 'get-users': {
        return await getUsers(
          mainStore.user!.id,
          authStore.token!,
          authStore.pubsub!,
          payload as [],
        )
      }

      case 'start-private-chat': {
        return await startPrivateChat(
          mainStore.user!.id,
          authStore.token!,
          authStore.pubsub!,
          payload as number,
        )
      }

      case 'send-message': {
        if (currentDialog.value) {
          return await sendMessage(
            mainStore.user!.id,
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

    idSet.delete(mainStore.user!.id)

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

  const createPrivateChat = (otherUserId: number) => {
    if (!isUserCached(otherUserId)) {
      fetchUsers([otherUserId])
    }
    void chatRequest({ type: 'start-private-chat', payload: otherUserId })
  }

  const onCreatePrivateChat = (data: { msg_id: number; payload: { value: Message }[] }) => {
    setCurrentDialog(data.msg_id, [])
    state.value.currentDialog.messagesLoaded = true
  }

  const onGetChats = async (data: { value: Contact }[]) => {
    setContacts(data.map((item) => item.value))

    // get user ids
    const chatIds = data.map((item) => item.value.id)

    const uniqueUsers: { [key: number]: User } = {}

    // request user data
    const _results = await Promise.all(
      chatIds.map((id) => chatRequest({ type: 'get-chat-participants', chatId: id })),
    )

    interface ResultData {
      data: User[]
    }

    const results = _results as ResultData[]

    results.forEach((resultData) => {
      const chatParticipants = resultData.data

      chatParticipants.forEach((user) => {
        if (user.status === 'online' && user.id != mainStore.user!.id) {
          uniqueUsers[user.id] = user
        }
      })
    })

    // cache users since we have them
    console.log(uniqueUsers)

    Object.keys(uniqueUsers).forEach((key) => {
      const foundContact = findContactByUser(+key)
      if (foundContact) {
        foundContact.status = 'online'
      }
    })

    console.log(contacts.value)
  }

  const onGetMessage = (messageData: { key: string; value: Message }[]) => {
    const message = messageData[0]!.value

    if (message.chat_id === currentDialog.value.data?.id) {
      addMessage(message)
    } else {
      const foundContact = contacts.value.find((contact: Contact) => contact.id === message.chat_id)

      if (foundContact) {
        foundContact.unread_msgs_count += 1
      }
    }
  }

  const onSendNotification = (
    data: { value: { sender_id: number; notify: 'online' | 'offline' } }[],
  ) => {
    const { sender_id: contactId, notify: status } = data[0]!.value

    if (!contactId || !status || contactId === mainStore.user!.id) return

    updateStatus(contactId, status)
  }

  const resetCurrentDialog = () => {
    state.value.currentDialog.loading = false
    state.value.currentDialog.usersLoaded = false
    state.value.currentDialog.messagesLoaded = false
    state.value.currentDialog.data = null
  }

  const updateStatus = (contactId: number, status: 'online' | 'offline') => {
    const foundContact = findContactByUser(contactId)
    if (foundContact) {
      foundContact.status = status
    }
  }

  const findContactByUser = (userId: number) => {
    return contacts.value.find((contact) => contact.priv_id === userId)
  }

  const isUserCached = (id: number) => !!cachedUsers.value[id]

  return {
    contacts,
    currentDialog,
    messages,
    isChatLoading,
    cachedUsers,
    setContacts,
    addMessage,
    setCurrentDialog,
    fetchContacts,
    searchContact,
    updateStatus,
    loadMessages,
    setChatLoading,
    sendMsg,
    createPrivateChat,
    onGetMessageData,
    onGetUsers,
    onGetMessage,
    onCreatePrivateChat,
    onGetChats,
    onSendNotification,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatStore, import.meta.hot))
}
