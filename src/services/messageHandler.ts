import { fasBullseye } from '@quasar/extras/fontawesome-v6'
import { useMainStore } from 'src/stores/main'
import type { Contact, Message, User } from 'src/types'

// handle web socket messages
export const handleMessage = (data: {
  action: string
  content: { id: number; payload: unknown; msg_id?: number }
}) => {
  switch (data.action) {
    case 'get chats': {
      useMainStore().setContacts(data.content.payload as { value: Contact }[])
      break
    }
    // case 'enter to chat': {
    //   onEnterChat(data.content.payload)
    //   break
    // }
    case 'get messages': {
      onGetMessageData(data.content as { msg_id: number; payload: { value: Message }[] })
      break
    }
    case 'send notification': {
      onSendNotification(data.content.payload as { value: { id: number; notify: string } }[])
      break
    }
    case 'get users': {
      onGetUsers(data.content.payload as { key: string; value: User }[])
      break
    }
    case 'send message': {
      onGetMessage(data.content.payload as { key: string; value: Message }[])
      break
    }
    case 'create private chat': {
      onCreatePrivateChat(data.content as { msg_id: number; payload: { value: Message }[] })
      break
    }
  }
}

const onGetMessage = (message: { key: string; value: Message }[]) => {
  useMainStore().addMessage(message[0]!.value)
}

const onGetUsers = (userData: { key: string; value: User }[]) => {
  useMainStore().setChatLoading(false)
  useMainStore().setLoadedUsers(userData)
}

const onGetMessageData = (data: { msg_id: number; payload: { value: Message }[] }) => {
  useMainStore().setCurrentDialog(data)
}

const onCreatePrivateChat = (data: { msg_id: number; payload: { value: Message }[] }) => {
  useMainStore().startNewCurrentDialog(data)
  useMainStore().setChatLoading(false)
}

// const onEnterChat = (data: unknown) => {
//   console.log(data)
// }

const onSendNotification = (data: { value: { id: number; notify: string } }[]) => {
  const { id: contactId, notify: status } = data[0]!.value

  if (!contactId || !status) return

  useMainStore().updateStatus(contactId, status)
}
