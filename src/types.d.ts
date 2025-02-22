export interface User {
  id: number
  user_ext_id: number
  login: string
  profile: string
  name: string
  surname: string
  email: string
  type: string
  created_at: number
  updated_at: number
  status: string
}

export interface Contact {
  id: number
  name: string
  status: 'online' | 'offline'
  priv_id: number
  chat_type: string
  unread_msgs_count: number
  last_message_id: number
}

export interface Message {
  id: number
  name?: string
  text: string
  stamp: number
  sender_id: number
  created_at: number
  chat_id: number
}

export interface CurrentDialog {
  id: number
  // name: string
  messages: Message[]
  lastSeen?: number
  members?: number
}
