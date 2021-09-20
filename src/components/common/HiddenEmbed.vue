<template>
  <iframe class="oeos-i-embed" v-if="src" :src="src"></iframe>
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
.oeos-i-embed {
  position: absolute;
  left: 0;
  right: 0;
  width: 300px;
  height: 240px;
  display: block;
}
</style>
