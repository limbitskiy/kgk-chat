<template>
  <div class="loader">
    <img style="scale: 3" :src="Spinner" />
    <!-- <span>Loading...</span> -->
  </div>
</template>

<script setup lang="ts">
import Spinner from './loader.svg'
</script>
