<template>
  <div class="zg-scroll-container" @scroll="onScroll" v-resize="onScroll" ref="panel">
    <slot></slot>
  </div>
</template>
<script>
import {util} from '../../utils'
import {emitter} from '../../mixins/main'
let timer = null
export default {
  name: 'zgScrollContainer',
  mixins: [emitter],
  props: {
    /**
     * @description 纵向滚动检测比例值，当scrollBottom在总高度*bottomRatio范围时，触发bottom（触底）事件
     */
    bottomRatio: {
      type: Number,
      default: 0.05
    }
  },
  data () {
    return {
      scrollBottom: 0
    }
  },
  methods: {
    onScroll () {
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => {
        let lazyPanels = this.children('zgScrollLazyPanel')
        lazyPanels.forEach && lazyPanels.forEach(item => {
          if (item && item.$el && util.isFunction(item.updateStatus)) {
            item.updateStatus()
          }
        })
      }, 100)

      this.checkInBottom()
    },
    /**
     * @description 检测是否滚动到了容器底部
     */
    checkInBottom () {
      const panel = this.$refs.panel
      const height = panel.getBoundingClientRect().height

      const canScrollHeight = panel.scrollHeight - height // 可滚动的总高度
      const scrollBottom = canScrollHeight - panel.scrollTop // 未滚动的高度

      if (scrollBottom <= Math.max(canScrollHeight * this.bottomRatio, height / 2)) {
        this.$emit('bottom')
      }
    }
  }
}
</script>
<style lang="sass">
.zg-scroll-container
  position: relative
  height: 100%
  overflow: auto
</style>
