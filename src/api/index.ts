import axios from 'axios'
import { API_BASE_URL, API_WS_URL, API_ENDPOINTS, TOKEN } from 'src/constants'

export const login = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}sputnik/login`, {
      timeout: 3000,
      headers: { Authorization: `Bearer ${TOKEN}` },
    })

    return response.data
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const contactSearch = async (query: string, token: string) => {
  try {
    const result = await axios.get(`${API_BASE_URL}auth/getusers?search=${query}&start=0&stop=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    return result?.data
  } catch (error) {
    console.error(error)
    return false
  }
}

export const getContacts = async (senderId: number, token: string, pubsub: string) => {
  try {
    await axios.post(
      `${API_BASE_URL}auth/req?pubsub=${pubsub}`,
      {
        pload_type: 'get chats',
        sender_id: senderId,
        destination_id: 1,
        payload: [],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const getMessages = async (
  senderId: number,
  token: string,
  chatId: number,
  pubsub: string,
) => {
  try {
    await axios.post(
      `${API_BASE_URL}auth/req?pubsub=${pubsub}`,
      {
        pload_type: 'get messages',
        sender_id: senderId,
        destination_id: 1,
        payload: [
          {
            key: 'get messages',
            value: {
              chat_id: chatId,
              initial_msg_id: 1,
              before: 20,
              after: 20,
            },
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const getUsers = async (senderId: number, token: string, pubsub: string, data: []) => {
  try {
    await axios.post(
      `${API_BASE_URL}auth/req?pubsub=${pubsub}`,
      {
        pload_type: 'get users',
        sender_id: senderId,
        destination_id: 1,
        payload: [
          {
            key: 'get users',
            value: data,
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const sendMessage = async (
  senderId: number,
  token: string,
  pubsub: string,
  chatId: number,
  message: string,
) => {
  try {
    await axios.post(
      `${API_BASE_URL}auth/req?pubsub=${pubsub}`,
      {
        pload_type: 'send message',
        sender_id: senderId,
        destination_id: chatId,
        payload: [
          {
            key: 'text',
            value: {
              ptype: 'text',
              content: message,
            },
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const startPrivateChat = async (
  senderId: number,
  token: string,
  pubsub: string,
  secondId: number,
) => {
  try {
    await axios.post(
      `${API_BASE_URL}auth/req?pubsub=${pubsub}`,
      {
        pload_type: 'create private chat',
        sender_id: senderId,
        destination_id: 1,
        payload: [
          {
            key: 'create private chat',
            value: {
              user_two_id: secondId,
            },
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export const getChatParticipants = async (token: string, chatId: number) => {
  try {
    return await axios.get(`${API_BASE_URL}auth/usersByChat?chat_id=${chatId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (error) {
    console.error(error)
    return false
  }
}

// interface ChatRequest {
//   token: string
//   pubsub: string
//   payload: Record<string, unknown>
// }

// export const enterChat = async (
//   senderId: number,
//   token: string,
//   chatId: number,
//   pubsub: string,
// ) => {
//   try {
//     await axios.post(
//       `${API_BASE_URL}auth/req?pubsub=${pubsub}`,
//       {
//         pload_type: 'enter to chat',
//         sender_id: senderId,
//         destination_id: 1,
//         payload: [
//           {
//             key: 'cmd',
//             value: {
//               ptype: 'enter to chat',
//               chat_id: chatId,
//               pubsub: pubsub,
//             },
//           },
//         ],
//       },
//       {
//         headers: { Authorization: `Bearer ${token}` },
//       },
//     )

//     return true
//   } catch (error) {
//     console.error(error)
//     return false
//   }
// }

// const chatRequest = async ({ token, pubsub, payload }: ChatRequest) => {
//   try {
//     await axios.post(`${API_BASE_URL}auth/req?pubsub=${pubsub}`, payload, {
//       headers: { Authorization: `Bearer ${token}` },
//     })

//     return true
//   } catch (error) {
//     console.error(error)
//     return false
//   }
// }
