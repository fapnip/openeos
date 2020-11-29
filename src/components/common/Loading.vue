<template>
  <div style="width:100%">
    <img :src="`${publicPath}loading.gif`" class="oeos-loader-center" />
    <div class="oeos-loader-center"><slot></slot></div>
  </div>
</template>
<script>
export default {
  data: () => ({
    publicPath: process.env.BASE_URL,
  }),
}
</script>
<style scoped>
.oeos-loader-center {
  text-align: center;
  object-fit: contain;
  width: 300px;
  display: block;
  margin-left: auto;
  margin-right: auto;
}
</style>
