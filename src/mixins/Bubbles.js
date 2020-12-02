let interactCounter = 0
let scrolling = false
let isScrolled = null

export default {
  data: () => ({
    bubbles: [],
    scrolledToBottom: true,
    bubbleHeight: 0,
    hideBubbles: false,
  }),
  methods: {
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
        if (end < 0) end = this.bubbles.length
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
      const index = this.bubbles.findIndex(i => i === item)
      if (index > -1) {
        this.bubbles.splice(index, 1)
      }
    },
    currentBubble() {
      return this.bubbles[this.bubbles.length - 1]
    },
    addBubble(type, item) {
      const currentBubble = this.currentBubble()
      if (
        currentBubble &&
        typeof currentBubble.item.setInactive === 'function'
      ) {
        currentBubble.item.setInactive()
      }
      const newBubble = {
        type: type,
        item: item,
        id: interactCounter++,
      }
      this.bubbles.push(newBubble)

      console.log('Adding ' + newBubble.type, newBubble, this.bubbles)
      this.$nextTick(() => {
        this.scrollToBottom()
      })
      return interactCounter
    },
    checkActionContainer() {
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
      // console.log(scrollTop, clientHeight, scrollHeight)
      this.bubbleHeight = oeosBottom.clientHeight
      let isAtBottom =
        oeosBottom.scrollTop + oeosBottom.clientHeight >=
        oeosBottom.scrollHeight
      if (isScrolled) clearTimeout(isScrolled)
      isScrolled = false
      if (!isAtBottom && this.scrolledToBottom) {
        isScrolled = setTimeout(() => {
          this.scrolledToBottom =
            oeosBottom.scrollTop + oeosBottom.clientHeight >=
            oeosBottom.scrollHeight
        }, 250)
      } else if (isAtBottom) {
        this.scrolledToBottom = isAtBottom
      }
    },
    scrollToBottom() {
      if (scrolling) return
      const oeosBottom = this.$refs.oeosBottom
      const lastItem = this.$refs.lastItem
      if (oeosBottom && lastItem) {
        const srollpx =
          oeosBottom.scrollHeight -
          (oeosBottom.scrollTop + oeosBottom.clientHeight)
        if (oeosBottom && lastItem) {
          if (srollpx > 0) {
            scrolling = true
            this.$scrollTo(lastItem, {
              container: oeosBottom,
              duration: 500,
              onDone: () => {
                scrolling = false
              },
              onCancel: () => {
                scrolling = false
              },
              // easing: 'ease-in',
              lazy: false,
            })
          }
        }
      }
    },
  },
}
