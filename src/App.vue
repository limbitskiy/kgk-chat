<template>
  <div class="cnt" style="height: 100dvh">
    <ChatContainer />
  </div>

  <!-- <q-dialog :model-value="true">
    <q-card style="display: flex; flex-direction: column; height: 600px">
      <q-card-section>
        <div class="text-h6">Chat</div>
      </q-card-section>

      <q-card-section class="q-pt-none" style="flex: 1">
        <ChatContainer />
      </q-card-section>
    </q-card>
  </q-dialog> -->
</template>

<script setup lang="ts">
import ChatContainer from 'src/components/ChatContainer.vue'
</script>
