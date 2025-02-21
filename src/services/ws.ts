import { ref } from 'vue'
import { API_WS_URL } from 'src/constants'
import { handleMessage } from './messageHandler'
import { handleStatus } from './statusHandler'

const socket = ref<WebSocket | null>(null)

const connect = (pubsub: string) => {
  if (socket.value || !pubsub) return

  socket.value = new WebSocket(`${API_WS_URL}/subscribe/${pubsub}`)

  socket.value.onopen = () => {
    console.log('✅ WebSocket подключен')
    handleStatus('open')
  }

  socket.value.onmessage = (event) => {
    const data = JSON.parse(event.data)
    console.log('📩 Получено сообщение:', data)
    handleMessage(data)
  }

  socket.value.onclose = () => {
    console.log('❌ WebSocket отключен, пытаюсь переподключиться...')
    socket.value = null
    setTimeout(connect, 3000)
    handleStatus('closed')
  }

  socket.value.onerror = (error) => {
    console.error('⚠️ WebSocket ошибка:', error)
  }
}

const sendMessage = (message: object) => {
  if (socket.value?.readyState === WebSocket.OPEN) {
    socket.value.send(JSON.stringify(message))
  } else {
    console.warn('⚠️ WebSocket не подключен, сообщение не отправлено')
  }
}

export default { connect, sendMessage }
