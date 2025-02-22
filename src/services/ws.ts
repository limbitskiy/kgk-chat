import { ref } from 'vue'
import { API_WS_URL } from 'src/constants'
import { handleMessage } from './messageHandler'
import { handleStatus } from './statusHandler'

const socket = ref<WebSocket | null>(null)

const connect = (pubsub: string): Promise<boolean> =>
  new Promise((resolve) => {
    if (socket.value) return

    socket.value = new WebSocket(`${API_WS_URL}/subscribe/${pubsub}`)

    socket.value.onopen = () => {
      console.log('✅ WebSocket connected')
      handleStatus('open')
      resolve(true)
    }

    socket.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('📩 Recieved a WS message:', data)
      handleMessage(data)
    }

    socket.value.onclose = () => {
      console.log('❌ WebSocket disconnected, reconnecting...')
      socket.value = null
      setTimeout(connect, 3000)
      handleStatus('closed')
    }

    socket.value.onerror = (error) => {
      console.error('⚠️ WebSocket error:', error)
    }
  })

const sendMessage = (message: object) => {
  if (socket.value?.readyState === WebSocket.OPEN) {
    socket.value.send(JSON.stringify(message))
  } else {
    console.warn('⚠️ WebSocket is not connected, message not sent')
  }
}

export default { connect, sendMessage }
