let interactCounter = 0
// let scrolling = false
let isScrolled = null
let scrollCheckTimer

export default {
  data: () => ({
    bubbles: [],
    scrolledToBottom: true,
    bubbleHeight: 0,
    hideBubbles: false,
    scrolling: false,
  }),
  methods: {
    insertBubbleAt(bubble, index) {
      if (index < 0) index = 0
      const maxIndex = this.bubbles.length
      if (index > maxIndex) index = maxIndex
      this.bubbles.splice(maxIndex - index, 0, bubble)
    },
    bubbleClass(bubbles) {
      const item = bubbles.item || {}
      const result = {
        'oeos-bubble': true,
      }
      result[`oeos-${bubbles.type}-item`] = true
      result['oeos-align-' + (item.align || 'center')] = true
      return result
    },
    purgePageBubbles(keep) {
      if (keep) {
        let end = this.bubbles.length - keep
        if (end < 0) end = 0
        this.bubbles.splice(0, end)
      } else {
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
          if (!this.bubbles[i].persist) {
            this.bubbles.splice(i, 1)
          }
        }
      }
    },
    removeBubble(item) {
      const index = this.bubbles.findIndex(
        i => i === item || (i && i.item === item)
      )
      this.debug('removing bubble', item, index)
      if (index > -1) {
        this.bubbles.splice(index, 1)
      }
    },
    currentBubble() {
      return this.bubbles[this.bubbles.length - 1]
    },
    setBubbleCommon(item, optProps) {
      for (const k of Object.keys(optProps)) {
        const val = optProps[k]
        if (k === 'label') {
          this.$set(item, k, this.sanitizeHtml(val)) // make reactive
        } else if (typeof val !== 'object' || val === null) {
          this.$set(item, k, val) // make reactive
        } else {
          item[k] = val
        }
      }
      item.insertAt = parseInt(item.insertAt, 10)
      if (isNaN(item.insertAt)) {
        item.insertAt = 0
      }
    },
    addBubble(type, item) {
      const currentBubble = this.currentBubble() || { item: {} }
      if (
        typeof currentBubble.item.setInactive === 'function' &&
        !currentBubble.item.lock
      ) {
        if (!item.insertAt) currentBubble.item.setInactive()
      }
      const newBubble = {
        type: type,
        item: item,
        id: interactCounter++,
      }
      if (item.insertAt || currentBubble.item.lock) {
        this.insertBubbleAt(newBubble, item.insertAt || 1)
      } else {
        this.bubbles.push(newBubble)
      }

      this.debug('Adding ' + newBubble.type, newBubble, this.bubbles)
      setTimeout(() => {
        this.scrollToBottom()
      }, 0)
      return interactCounter
    },
    checkBubbleScroll() {
      const oeosBottom = this.$refs.oeosBottom
      if (oeosBottom) {
        this.setScrollToBottom(oeosBottom)
      }
    },
    clickLastSayBubble(e) {
      const li = this.currentBubble()
      if (li && li.type === 'say' && li.item.active) {
        const ref = this.$refs['say_' + li.id]
        if (ref) {
          ref[0].$el.click()
        }
      }
    },
    setScrollToBottom(oeosBottom) {
      this.doSetScrollToBottom(oeosBottom)
      clearTimeout(scrollCheckTimer)
      scrollCheckTimer = setTimeout(
        () => this.doSetScrollToBottom(oeosBottom),
        100
      )
    },
    doSetScrollToBottom(e) {
      this.bubbleHeight = e.clientHeight
      let isAtBottom = e.scrollHeight - e.scrollTop - e.clientHeight < 1
      // console.log(
      //   'Check scroll to bottom:',
      //   isAtBottom,
      //   e.scrollHeight - e.scrollTop - e.clientHeight,
      //   e.scrollHeight,
      //   e.scrollTop,
      //   e.clientHeight
      // )
      if (isScrolled) clearTimeout(isScrolled)
      isScrolled = false
      if (!isAtBottom && this.scrolledToBottom) {
        isScrolled = setTimeout(() => {
          this.scrolledToBottom =
            e.scrollHeight - e.scrollTop - e.clientHeight < 1
        }, 250)
      } else if (isAtBottom) {
        this.scrolledToBottom = isAtBottom
      }
    },
    scrollToBottom() {
      if (this.scrolling) return
      const oeosBottom = this.$refs.oeosBottom
      if (!oeosBottom) return
      this.doSetScrollToBottom(oeosBottom)
      const lastItem = this.$refs.lastItem
      if (oeosBottom && lastItem) {
        const srollpx =
          oeosBottom.scrollHeight -
          (oeosBottom.scrollTop + oeosBottom.clientHeight)
        if (oeosBottom && lastItem) {
          if (srollpx > 0) {
            this.debug('Scrolling to bottom')
            this.scrolling = true
            this.$scrollTo(lastItem, {
              container: oeosBottom,
              duration: 800,
              onDone: () => {
                this.checkBubbleScroll()
                this.scrolling = false
              },
              onCancel: () => {
                this.scrolling = false
              },
              // easing: 'ease-in',
              lazy: false,
              force: true,
            })
          }
        }
      }
    },
  },
}
