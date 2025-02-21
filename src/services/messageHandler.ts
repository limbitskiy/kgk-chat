import { useMainStore } from 'src/stores/main'
import type { Contact, Message, User } from 'src/types'

// handle web socket messages
export const handleMessage = (data: {
  action: string
  content: { id: number; payload: unknown; msg_id?: number; status: string }
}) => {
  const mainStore = useMainStore()
  const { onGetMessageData, onGetUsers, displayError, onCreatePrivateChat, onGetChats } = mainStore

  if (data.content?.status !== 'OK') {
    displayError(data.content.status)
    return
  }

  switch (data.action) {
    case 'get chats': {
      onGetChats(data.content.payload as { value: Contact }[])
      break
    }
    // case 'enter to chat': {
    //   onEnterChat(data.content.payload)
    //   break
    // }
    case 'get messages': {
      onGetMessageData(
        data.content as { status: string; msg_id: number; payload: { value: Message }[] },
      )
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

const onSendNotification = (data: { value: { id: number; notify: string } }[]) => {
  const { id: contactId, notify: status } = data[0]!.value

  if (!contactId || !status) return

  useMainStore().updateStatus(contactId, status)
}
