import { useMainStore } from 'src/stores/main'

export const handleStatus = (status: string) => {
  switch (status) {
    case 'open': {
      useMainStore().setWsConnected(true)
      break
    }
    case 'closed': {
      useMainStore().setWsConnected(false)
      break
    }
  }
}
