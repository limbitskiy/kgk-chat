import { useMainStore } from 'src/stores/main'
import type { Contact, Message, User } from 'src/types'

// handle web socket messages
export const handleMessage = (data: {
  action: string
  content: { id: number; payload: unknown; msg_id?: number; status: string }
}) => {
  const store = useMainStore()
  const { displayError } = store
  const {
    onGetMessageData,
    onGetUsers,
    onCreatePrivateChat,
    onGetChats,
    onGetMessage,
    onSendNotification,
  } = store.chat

  if (data.content?.status !== 'OK') {
    displayError(data.content.status)
    return
  }

  switch (data.action) {
    case 'get chats': {
      void onGetChats(data.content.payload as { value: Contact }[])
      break
    }

    case 'get messages': {
      onGetMessageData(
        data.content as { status: string; msg_id: number; payload: { value: Message }[] },
      )
      break
    }
    case 'send notification': {
      onSendNotification(
        data.content.payload as { value: { sender_id: number; notify: 'online' | 'offline' } }[],
      )
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
