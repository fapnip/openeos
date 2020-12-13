<template>
  <div :id="'oeos-overlay--' + id" class="oeos-overlay">
    <div ref="rootElement"></div>
  </div>
</template>
<script>
export default {
  props: {
    id: {
      type: String,
      default: 'none',
    },
  },
  data: () => ({
    publicPath: process.env.BASE_URL,
  }),
  mounted() {
    this.$emit('ready', this.$refs.rootElement)
  },
}
</script>
<style>
.oeos-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
}
.oeos-overlay > div {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
}
</style>
