<template>
  <iframe class="oeos-hidden-embed" v-if="src" :src="src"></iframe>
</template>
<script>
export default {
  props: {
    src: {
      type: String,
      default: null,
    },
  },
}
</script>
<style>
.oeos-hidden-embed {
  position: fixed;
  left: 0;
  right: 0;
  width: 0;
  height: 0;
  display: hidden;
}
</style>
