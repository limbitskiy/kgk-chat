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
          :debounce="settings.contactSearchDebounce"
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
            :active="contact.id === selectedSearchResultId"
            clickable
            v-ripple
            @click="() => onSearchResultClick(contact)"
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
            :active="contact.id === selectedContactId"
            clickable
            v-ripple
            @click="() => onContactClick(contact)"
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
              <q-item-label>{{ contact.name }}</q-item-label>
              <!-- <q-item-label caption lines="1">{{ contact.email }}</q-item-label> -->
            </q-item-section>

            <q-item-section v-if="contact.unread_msgs_count" avatar>
              <q-badge rounded color="blue" :label="contact.unread_msgs_count" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div
        class="bottom-statusbar"
        style="
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding-inline: 0.5rem;
          background-color: #e3e3e3;
        "
      >
        <connection-status :status="loginStatus" :ws="wsConnectionStatus" />
        <span style="font-size: 12px">v.{{ version }}</span>
      </div>
    </div>

    <transition name="chat-fade" mode="out-in">
      <!-- body -->

      <div v-if="isChatLoading" class="chat-loader" style="display: grid; place-items: center">
        <DialogLoader />
      </div>
      <div
        v-else-if="currentDialog.data"
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
            ref="virtualScrollerRef"
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

    <q-dialog :model-value="!!error" position="top" seamless>
      <q-card style="width: 350px; background-color: #b73d3d; color: white">
        <!-- <q-linear-progress :value="0.6" color="pink" /> -->

        <q-card-section class="row items-center no-wrap">
          <div>
            <div class="text-weight-bold">{{ error }}</div>
            <!-- <div class="text-grey">Fitz & The Tantrums</div> -->
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts" module>
import { useTemplateRef, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import { storeToRefs } from 'pinia'

import ChatMessage from 'src/components/ChatMessage.vue'
import ConnectionStatus from 'src/components/ConnectionStatus.vue'
import DialogLoader from 'src/components/DialogLoader/DialogLoader.vue'

import { useMainStore } from 'src/stores/main'
import { version } from '../../package.json'

import type { Contact, User } from 'src/types'

const store = useMainStore()

const { wsConnectionStatus, chatHeaderData, error, loginStatus } = storeToRefs(store)
const { init, setChatHeaderData } = store
// @ts-expect-error error
const { contacts, currentDialog, messages, isChatLoading, cachedUsers } = storeToRefs(store.chat)
const {
  getMessages,
  searchContact,
  setChatLoading,
  sendMessage,
  createPrivateChat,
  fetchContacts,
} = store.chat

const dialogCnt = useTemplateRef('dialogCnt')

const { height: dialogCntHeight } = useElementSize(dialogCnt)

const settings = ref({
  contactSearchDebounce: 1000,
})

const searchMode = ref(false)
const searchResults = ref<User[]>([])

const contactSearchString = ref('')
const message = ref('')

const virtualScrollerRef = ref()
const virtualListIndex = ref(0)

const selectedContactId = ref()
const selectedSearchResultId = ref()

const onVirtualScroll = ({ index, direction }: { index: number; direction: string }) => {
  // if just loaded
  if (index === 0 && direction === 'increase') {
    virtualScrollerRef.value?.scrollTo(messages?.value.length - 1, 'start')
  }
  virtualListIndex.value = index
}

const onSearchResultClick = (searchResult: User) => {
  // console.log(searchResult)
  // console.log(contacts?.value)

  setChatLoading()

  selectedSearchResultId.value = searchResult.id

  const contact = getContactByUser(searchResult)

  if (contact) {
    console.log(`enter existing chat with a guy`)
    getMessages(contact)
  } else {
    console.log(`create a new chat with a guy`)
    createPrivateChat(contact.id)
  }

  setChatHeaderData({ title: searchResult.name })
}

const onContactClick = (contact: Contact) => {
  setChatLoading()
  getMessages(contact)
  selectedContactId.value = contact.id
  setChatHeaderData({ title: contact.name })
}

const onSearchFocus = () => {
  searchMode.value = true
}

const onContactMode = () => {
  contactSearchString.value = ''
  searchMode.value = false
  fetchContacts()
}

const onSendMessage = () => {
  sendMessage(message.value)
  message.value = ''
}

const isUser = (data: User | Contact) => {
  if ('profile' in data) {
    return true
  }
  return false
}

const getContactByUser = (user: User) => {
  return contacts?.value
    .filter((contact: Contact) => contact.chat_type === 'private')
    .find((contact: Contact) => contact.priv_id === user.id)
}

void init()

watch(contactSearchString, async (val) => {
  if (val?.length) {
    const results = await searchContact(val)
    searchResults.value = results
  } else {
    searchResults.value = []
  }
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
