<template>
  <div class="chat-cnt" :class="$style['chat-cnt']">
    <!-- sidebar -->
    <div class="sidebar" :class="$style['sidebar']">
      <!-- search -->
      <!-- make into it's own component -->
      <div class="search" style="display: flex; gap: 0.5rem; padding: 1rem">
        <q-btn
          v-if="searchMode"
          flat
          rounded
          style="color: grey; padding-inline: 8px"
          size="15px"
          icon="arrow_back"
          @click="onContactMode"
        />
        <q-input
          v-model="contactSearchString"
          placeholder="Поиск.."
          style="width: 100%"
          debounce="1000"
          rounded
          outlined
          dense
          clearable
          @focus="onSearchFocus"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>

          <!-- <template v-slot:append>
            <q-icon name="close" class="cursor-pointer" />
          </template> -->
        </q-input>
      </div>

      <!-- contact list -->
      <!-- make into it's own component -->
      <div class="contact-list-cnt" style="flex: 1; overflow: auto">
        <!-- search results -->
        <q-list v-if="searchMode" class="search-results">
          <div
            v-if="!searchResults.length"
            class="nothing-found"
            style="padding-inline: 1rem; font-size: 12px; color: #4b4b4b"
          >
            <span>Ничего не найдено</span>
          </div>

          <q-item
            v-for="contact in searchResults"
            :key="contact.id"
            class="q-my-sm"
            clickable
            v-ripple
            @click="() => onStartChat(contact)"
          >
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white">
                {{ contact.name[0]?.toUpperCase() }}
              </q-avatar>
              <div
                v-if="contact.status === 'online'"
                class="online-status"
                :class="$style['online-indicator']"
              ></div>
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ contact.name }} {{ contact.surname }}</q-item-label>
              <!-- <q-item-label caption lines="1">{{ contact.email }}</q-item-label> -->
            </q-item-section>
          </q-item>
        </q-list>

        <!-- contact-list -->
        <q-list v-else class="contact-list">
          <q-item
            v-for="contact in contacts"
            :key="contact.id"
            class="q-my-sm"
            clickable
            v-ripple
            @click="() => onEnterChat(contact)"
          >
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white">
                {{ contact.name[0]?.toUpperCase() }}
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ contact.name }}</q-item-label>
              <!-- <q-item-label caption lines="1">{{ contact.email }}</q-item-label> -->
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <connection-status :status="connectionStatus" :ws="wsConnected" />
    </div>

    <transition name="chat-fade" mode="out-in">
      <!-- body -->
      <div v-if="isChatLoading" class="chat-loader" style="display: grid; place-items: center">
        <DialogLoader />
      </div>
      <div
        v-else-if="currentDialog"
        class="current-dialog-cnt"
        ref="dialogCnt"
        :class="$style['current-dialog-cnt']"
      >
        <div class="current-dialog-cnt__header" :class="$style['current-dialog-header']">
          <div class="start" style="display: flex; align-items: center; gap: 0.5rem">
            <q-avatar color="primary" text-color="white">
              {{ 'A' }}
            </q-avatar>
            <div class="dialog-data" style="display: flex; flex-direction: column">
              <span style="font-weight: 600">{{ chatHeaderData.title }}</span>
              <span style="font-size: 12px; color: grey">{{ chatHeaderData.subtitle }}</span>
            </div>
          </div>
        </div>

        <div class="current-dialog-cnt__messages" :class="$style['current-dialog-messages']">
          <q-virtual-scroll
            ref="virtualMessagesRef"
            :style="`height: ${dialogCntHeight - 137}px`"
            :items="messages"
            :virtual-scroll-item-size="72"
            v-slot="{ item }"
            @virtual-scroll="onVirtualScroll"
          >
            <ChatMessage :message="item" :user="cachedUsers[+item.sender_id]!" />
          </q-virtual-scroll>
        </div>

        <!-- dialog footer -->
        <div class="current-dialog-cnt__footer" :class="$style['current-dialog-footer']">
          <q-input
            v-model="message"
            rounded
            outlined
            dense
            @keypress.enter="onSendMessage"
          ></q-input>
        </div>
      </div>

      <!-- placeholder -->
      <div v-else class="chat-placeholder" :class="$style['chat-placeholder']">
        <span>Выберите чат</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts" module>
import { useTemplateRef, ref, watch, nextTick, onMounted } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useAuthStore } from 'src/stores/auth'
import { useMainStore } from 'src/stores/main'
import { storeToRefs } from 'pinia'
import ChatMessage from 'src/components/ChatMessage.vue'
import ConnectionStatus from 'src/components/ConnectionStatus.vue'
import type { Contact } from 'src/types'
import DialogLoader from 'src/components/DialogLoader/DialogLoader.vue'
import { truncate } from 'fs/promises'

const authStore = useAuthStore()
const mainStore = useMainStore()

const {
  contacts,
  currentDialog,
  messages,
  wsConnected,
  isChatLoading,
  cachedUsers,
  chatHeaderData,
} = storeToRefs(mainStore)
const {
  fetchContacts,
  loadMessages,
  searchContact,
  setChatLoading,
  setChatHeaderData,
  sendMsg,
  createPrivateChat,
  setCurrentDialog,
} = mainStore

const dialogCnt = useTemplateRef('dialogCnt')

const { height: dialogCntHeight } = useElementSize(dialogCnt)

const searchMode = ref(false)
const searchResults = ref<Contact[]>([])
const connectionStatus = ref<'connecting' | 'connected' | 'error'>('connecting')
const connected = ref(false)
const contactSearchString = ref('')
const message = ref('')

const virtualMessagesRef = ref()
const virtualListIndex = ref(0)

const onVirtualScroll = ({ index }: { index: number }) => {
  virtualListIndex.value = index
}

const onEnterChat = ({ id, name }: { id: number; name: string }) => {
  setChatLoading(true)
  loadMessages(id)
  setChatHeaderData({ title: name })
}

const onStartChat = ({ id, name }: { id: number; name: string }) => {
  setChatLoading(true)
  createPrivateChat(id)
  setChatHeaderData({ title: name })
}

const onSearchFocus = () => {
  searchMode.value = true
}

const onContactMode = () => {
  contactSearchString.value = ''
  searchMode.value = false
}

const onSendMessage = () => {
  sendMsg(message.value)
  message.value = ''
}

const init = () => {
  connectionStatus.value = 'connecting'
  void authStore
    .appLogin()
    .then(() => {
      connectionStatus.value = 'connected'
      connected.value = true

      if (!contacts.value.length) {
        fetchContacts()
      }
    })
    .catch((err) => {
      connectionStatus.value = 'error'

      setTimeout(() => {
        init()
      }, 5000)
    })
}

init()

watch(contactSearchString, async (val) => {
  if (val?.length) {
    const results = await searchContact(val)
    searchResults.value = results
  } else {
    searchResults.value = []
  }
})

onMounted(() => {
  watch(
    messages,
    async () => {
      if (!currentDialog.value) return

      const length = currentDialog.value.messages.length
      await nextTick()
      setTimeout(() => {
        // virtualMessagesRef.value.scrollTo(length - 1, 'start')
      }, 100)
    },
    { deep: true },
  )
})
</script>

<style lang="scss" module>
.chat-cnt {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(300px, 1fr) minmax(400px, 3fr);
}

.sidebar {
  background-color: var(--grey-bg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.current-dialog-cnt {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.current-dialog-header {
  display: flex;
  justify-content: space-between;
  background-color: var(--grey-bg);
  padding: 0.5rem;
}

.current-dialog-messages {
  padding: 0.5rem;
}

.current-dialog-footer {
  padding: 0.5rem 1rem;
}

.chat-placeholder {
  display: grid;
  place-items: center;
}

.online-indicator {
  position: absolute;
  display: block;
  border-radius: 50%;
  border: 2px solid var(--surface-color);
  background-color: #44f744;
  width: 10px;
  height: 10px;
  left: 43px;
  top: 2.4375rem;
  border: 1px solid #d6d6d6;
}
</style>
