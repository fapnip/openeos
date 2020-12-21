<template>
  <div style="width:100%">
    <img :src="loadingImage" class="oeos-loader-center" />
    <div class="oeos-loader-center"><slot></slot></div>
  </div>
</template>
<script>
export default {
  data: () => ({
    loadingImage: 'https://i.ibb.co/54zVXjc/loading.gif',
    // loadingImage: `${process.env.BASE_URL}loading.gif`,
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
