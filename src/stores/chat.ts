import { defineStore, acceptHMRUpdate } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'
import {
  getContacts,
  contactSearch,
  fetchMessages,
  fetchUsers,
  sendChatMessage,
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
  const setChatLoading = () => {
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
        getUsers(uncachedUsers)
      } else {
        state.value.currentDialog.usersLoaded = true
      }
    } else {
      state.value.currentDialog.usersLoaded = true
    }

    state.value.currentDialog.data = dialogObject
  }

  const addMessage = (message: Message) => {
    state.value.currentDialog.data?.messages.push(message)
  }

  const fetchContacts = () => {
    void getContacts(mainStore.user!.id, authStore.token!, authStore.pubsub!)
  }

  const watchCurrentDialog = () => {
    const unwatch = watch(
      currentDialog,
      async () => {
        if (
          currentDialog.value.data &&
          currentDialog.value.messagesLoaded &&
          currentDialog.value.usersLoaded
        ) {
          await nextTick()
          state.value.currentDialog.loading = false
          unwatch()
        }
      },
      {
        deep: true,
      },
    )
  }

  const updateStatus = (contactId: number, status: 'online' | 'offline') => {
    const foundContact = findContactByUser(contactId)
    if (foundContact) {
      foundContact.status = status
    }
  }

  const chatRequest = async ({
    type,
    chatId,
    query = '',
    payload = undefined,
    message = '',
    messageId = 0,
  }: {
    type: string
    chatId?: number
    query?: string
    payload?: unknown
    message?: string
    messageId?: number
  }) => {
    switch (type) {
      case 'contact-search': {
        return await contactSearch(query, authStore.token!)
      }

      case 'get-chat-participants': {
        return await getChatParticipants(authStore.token!, chatId!)
      }

      case 'get-messages': {
        return await fetchMessages(
          mainStore.user!.id,
          authStore.token!,
          chatId!,
          authStore.pubsub!,
          messageId,
        )
      }

      case 'get-users': {
        return await fetchUsers(
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
        // if (currentDialog.value) {
        return await sendChatMessage(
          mainStore.user!.id,
          authStore.token!,
          authStore.pubsub!,
          currentDialog.value.data!.id,
          message,
        )
        // }
      }
    }
  }

  // CHAT REQUESTS
  const createPrivateChat = (otherUserId: number) => {
    if (!isUserCached(otherUserId)) {
      getUsers([otherUserId])
    }
    void chatRequest({ type: 'start-private-chat', payload: otherUserId })
  }

  const getUsers = (ids: number[]) => {
    const reformatted = ids.map((id) => ({ id }))
    void chatRequest({ type: 'get-users', payload: reformatted })
  }

  const getMessages = (contact: Contact) => {
    void chatRequest({
      type: 'get-messages',
      chatId: contact.id,
      messageId: contact.last_message_id,
    })
  }

  const sendMessage = (message: string) => {
    void chatRequest({ type: 'send-message', message })
  }

  const searchContact = async (query: string) => {
    const results = await chatRequest({ type: 'contact-search', query })
    return results.filter((resultUser: User) => resultUser.id != mainStore.user!.id)
  }

  // WS HANDLERS (6 total)
  const onGetMessages = (data: {
    status: string
    msg_id: number
    payload: { value: Message }[]
  }) => {
    const messages = data.payload.map((msg) => msg.value)

    setCurrentDialog(data.msg_id, messages)

    state.value.currentDialog.messagesLoaded = true
  }

  const onGetUsers = (userData: { key: string; value: User }[]) => {
    userData.forEach((item) => {
      state.value.cachedUsers[item.value.id] = item.value
    })
    state.value.currentDialog.usersLoaded = true
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

    // could cache users since we have them
    console.log(uniqueUsers)

    Object.keys(uniqueUsers).forEach((key) => {
      const foundContact = findContactByUser(+key)
      if (foundContact) {
        foundContact.status = 'online'
      }
    })

    console.log(contacts.value)
  }

  const onSendMessage = (messageData: { key: string; value: Message }[]) => {
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

  // HELPERS
  const findContactByUser = (userId: number) => {
    return contacts.value.find((contact) => contact.priv_id === userId)
  }

  const getUserIdsFromMessages = (messages: Message[]) => {
    const idSet = new Set()

    messages.forEach((msg) => {
      idSet.add(msg.sender_id)
    })

    idSet.delete(mainStore.user!.id)

    return [...idSet] as number[]
  }

  const resetCurrentDialog = () => {
    state.value.currentDialog.loading = false
    state.value.currentDialog.usersLoaded = false
    state.value.currentDialog.messagesLoaded = false
    state.value.currentDialog.data = null
  }

  const isUserCached = (id: number) => !!cachedUsers.value[id]

  // const addContact = (contact: Contact) => {
  //   state.value.contacts.push(contact)
  // }

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
    setChatLoading,
    sendMessage,
    getMessages,
    createPrivateChat,
    onGetMessages,
    onGetUsers,
    onSendMessage,
    onCreatePrivateChat,
    onGetChats,
    onSendNotification,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatStore, import.meta.hot))
}
