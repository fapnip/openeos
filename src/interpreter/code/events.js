// eslint-disable-next-line no-unused-vars
function Event(type, value) {
  this.type = type
  this.value = value
  this.timeStamp = Date.now()
  this.cancelable = false
}
