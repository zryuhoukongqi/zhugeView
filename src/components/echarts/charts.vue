<template>
  <div class="zg-charts" :style="style" v-resize="onResize">
    <div class="zg-charts-main" ref="toChart"></div>
    <div v-show="!chartStore.series.length" :style="{'line-height': height + 'px'}" class="zg-charts-empty">暂无数据</div>
  </div>
</template>

<script>
  import echarts from 'echarts'
  import {util} from '../../utils'
  export default {
    name: 'zgCharts',
    props: {
      /**
       * @description 图表宽度，默认自适应
       */
      width: {
        type: Number
      },
      /**
       * @description 图表高度
       */
      height: {
        type: Number,
        default: 400
      },
      /**
       * @description 图表类型
       */
      type: {
        type: String,
        default: 'bar',
        validator (value) {
          return ['bar', 'line', 'area'].includes(value)
        }
      },
      /**
       * @description 图表数据源
       */
      store: {
        type: Object,
        validator (store) {
          return store && util.isArray(store.series) && util.isArray(store.x_axis)
        }
      },
      /**
       * @description 是否启用双Y轴，为true时，yAxis为必传项
       */
      doubleY: {
        type: Boolean,
        default: false
      },
      /**
       * @description doubleY启用时，为必传项
       * @tip rules为对象，key与series中的names相对应，names为数组，则通过join('-')转为字符串,value中，type如果不传，则默认值与type参数一致
       */
      yAxisRule: {
        type: Object,
        validator (rules) {
          for (const key in rules) {
            const rule = rules[key]
            // value格式为：{type: 'bar/line/eg...', index: 0, option: {}} option为echarts中yAxis的标准配置
            if (!rule.hasOwnProperty('index')) {
              return false
            }
          }
          return true
        }
      },
      /**
       * @description tooltip自定义显示
       */
      tooltipFormatter: {
        type: Function,
        default (params) {
          let xLabel = params[0].name
          if (/^\d{4}-\d{2}-\d{2}$/.test(xLabel)) { // 处理日期
            xLabel = xLabel.replace(/\d{4}-/, '')
          } else if (/^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(xLabel)) { // 周、月日期
            let dates = xLabel.match(/\d{4}-\d{2}-\d{2}/g)
            xLabel = dates[0].replace(/\d{4}-/, '') + '~' + dates[1].replace(/\d{4}-/, '')
          }
          return `<span>${xLabel}</span><br>` + params.map(item => {
            return `${item.marker}${item.seriesName}: <span style="color:#66ccff;">${util.toThousands(item.value)}</span>`
          }).join('<br>')
        }
      },
      yAxisFormatter: {
        type: Function,
        default (value) {
          if (parseFloat(value) >= 1000) {
            return util.toThousands((value / 1000).toFixed(1)) + 'k'
          } else {
            return value
          }
        }
      },
      xAxisFormatter: {
        type: Function,
        default (label) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(label)) { // 处理日期
            return label.replace(/\d{4}-/, '')
          } else if (/^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(label)) { // 周、月日期
            let dates = label.match(/\d{4}-\d{2}-\d{2}/g)
            return dates[0].replace(/\d{4}-/, '') + '~' + dates[1].replace(/\d{4}-/, '')
          } else {
            return label
          }
        }
      },
      legendFormatter: {
        type: Function,
        default (label) {
          return label
        }
      },
      /**
       * @description 显示数据项（从store中过滤），对应series中的names字段
       * @格式[['group', 'item1'], ['group', 'item2']]或['item1', 'item2']
       */
      showList: {
        type: Array
      },
      /**
       * @description 是否将series中每项数据的names转为新的x轴
       * @tip 目前只有柱状图时有效
       */
      reverseXAxis: {
        type: Boolean,
        default: false
      },
      /**
       * @description reverseXAxis为true时，该项必填
       */
      seriesName: {
        type: String
      },
      colors: {
        type: Array,
        default () {
          return [
            '#00a0e9', '#f4b93b', '#85bd41', '#f29c9f', '#8f82bc',
            '#0068b7', '#f29b76', '#13b5b1', '#ea68a2', '#fff100',
            '#1ec0ff', '#f9a11b', '#8cd790', '#40ccca', '#aaabd3',
            '#2b90d9', '#ec7a4a', '#f29b76', '#ea68a2', '#ffdd38'
          ]
        }
      },
      /**
       * @description 当以堆叠柱状图展示的话，series的values元素，需要为对象形式
       * @tip 该属性只对柱形图有效
       */
      stack: {
        type: Array,
        validator (stack) {
          // demo
          // stack = [
          //   {
          //     field: 'percent',
          //     name: '百分比',
          //     option: null // series原生配置
          //   },
          //   {
          //     field: 'value',
          //     name: '人数'
          //   }
          // ]
          return util.isArray(stack)
        }
      },
      /**
       * @description 标记线
       * @tip 数组元素如果为字符串类型，则进行值匹配，如果为数字类型，则当做下标处理
       */
      markLine: {
        type: Array
      },
      /**
       * @description series包装器，用来series的自定义配置
       */
      seriesWrapper: {
        type: Function,
        default (series) {
          return series
        }
      }
    },
    data () {
      return {
        chart: null
      }
    },
    computed: {
      chartStore () {
        if (this.reverseXAxis) {
          let series = {
            names: [this.seriesName],
            values: []
          }
          let store = {
            series: [series],
            x_axis: []
          }
          this.store.series.forEach(seriesItem => {
            store.x_axis.push(seriesItem.names.join('-'))
            series.values.push(seriesItem.values[0])
          })
          return store
        } else {
          return this.store
        }
      },
      showListMap () {
        let map = {}
        if (util.isArray(this.showList)) {
          this.showList.forEach(item => {
            if (util.isArray(item)) {
              map[item.join('-')] = true
            } else if (util.isString(item)) {
              map[item] = true
            }
          })
        }
        return map
      },
      style () {
        let style = {
          height: this.height + 'px'
        }
        if (this.width) style.width = `${this.width}px`
        return style
      },
      option () {
        let option = {
          color: this.colors,
          backgroundColor: 'white',
          grid: {
            containLabel: false,
            show: false,
            borderColor: 'red'
          },
          legend: this.getLegend(),
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: this.getAxisPointerType(),
              lineStyle: {
                color: '#999',
                width: 2,
                type: 'solid'
              }
            },
            formatter: this.tooltipFormatter
          },
          xAxis: {
            data: this.getXAxis(),
            boundaryGap: this.getBoundaryGap(), // 判断是否有柱状图，包含柱状图为true，其它为false
            axisLabel: {
              textStyle: {
                color: '#404245'
              },
              formatter: this.xAxisFormatter
            },
            splitArea: {
              show: false
            },
            splitLine: {
              show: Boolean(this.markLine),
              interval: this.markLine ? 0 : 'auto',
              lineStyle: {
                color: this.getMarkLine()
              }
            },
            axisTick: {
              show: false
            },
            axisLine: {
              show: false
            }
          },
          yAxis: this.getYAxis(),
          series: this.getSeries()
        }
        return option
      }
    },
    watch: {
      option () {
        this.setOption(this.option)
      }
    },
    mounted () {
      this.chart = echarts.init(this.$refs.toChart)
      this.setOption(this.option)
    },
    beforeDestroy () {
      if (!this.chart) return
      this.chart.dispose()
      this.chart = null
    },
    methods: {
      /**
       * @description 获取x轴数据
       */
      getXAxis () {
        return (this.reverseXAxis && this.showList) ? this.showList : this.chartStore.x_axis
      },
      /**
       * @description 获取标记线的颜色组
       */
      getMarkLine () {
        if (!this.markLine) return []
        let arr = []
        let xMap = {}
        this.getXAxis().forEach((label, i) => {
          xMap[label] = i
          arr[i] = 'none'
        })
        this.markLine.forEach(item => {
          if (util.isString(item)) {
            arr[xMap[item]] = 'rgb(254,177,177)'
          } else if (util.isNumber(item)) {
            arr[item] = 'rgb(254,177,177)'
          }
        })
        return arr
      },
      /**
       * @description 判断是否有柱状图，包含柱状图为true，其它为false
       */
      getBoundaryGap () {
        const likeBarTypes = ['bar']
        let boundaryGap = this.type ? likeBarTypes.includes(this.type) : false
        if (this.yAxisRule) {
          for (const key in this.yAxisRule) {
            const item = this.yAxisRule[key]
            if (likeBarTypes.includes(item.type)) {
              boundaryGap = true
            }
          }
        }
        return boundaryGap
      },
      getYAxis () {
        const axis = {
          splitNumber: 5,
          axisTick: {
            show: false
          },
          axisLabel: {
            formatter: this.yAxisFormatter,
            textStyle: {
              color: '#75787D'
            }
          },
          splitLine: {
            lineStyle: {
              color: '#ddd',
              width: 1,
              type: 'dotted'
            }
          },
          type: 'value',
          axisLine: {
            show: false
          }
        }
        if (this.doubleY) {
          let result = []
          for (let key in this.yAxisRule) {
            const rule = this.yAxisRule[key]
            result[rule.index] = util.mergeObject(axis, util.clone(rule.option || {}))
          }
          return result
        }
        return axis
      },
      getSeries () {
        let seriesList = []
        let context = this
        this.each(function (name, series) {
          seriesList.push((() => {
            const type = context.doubleY ? (context.yAxisRule[name].type || context.type) : context.type
            let seriesItem = null
            switch (type) {
              case 'bar':
                seriesItem = context.getBarSeries(name, series)
                break
              case 'line':
                seriesItem = context.getLineSeries(name, series)
                break
              case 'area':
                seriesItem = context.getAreaSeries(name, series)
                break
              default:
                console.error('未支持的图表类型', context.type)
            }
            return this.seriesWrapper(seriesItem)
          })())
        })
        return seriesList
      },
      getLegend () {
        let legendList = []
        this.each(function (name) {
          legendList.push({
            name
          })
        })
        return {
          type: 'scroll',
          data: legendList,
          borderColor: 'red',
          borderWidth: 0,
          width: '60%',
          show: legendList.length > 1,
          formatter: this.legendFormatter
        }
      },
      getBarSeries (name, series) {
        let result = null
        if (this.reverseXAxis) {
          result = {
            name,
            type: 'bar',
            barMaxWidth: 35,
            data: (() => {
              let data = []
              series.values.forEach((value, index) => {
                if (this.reverseXAxis &&
                  this.showList &&
                  !this.showListMap[this.store.series[index].names.join('-')]) return
                data.push({
                  name: this.chartStore.x_axis[index],
                  value: value,
                  itemStyle: {
                    normal: {
                      color: this.colors[data.length]
                    }
                  }
                })
              })
              return data
            })(),
            yAxisIndex: this.doubleY ? this.yAxisRule[name].index : 0
          }
        } else {
          result = {
            name,
            type: 'bar',
            barMaxWidth: 35,
            data: series.values,
            yAxisIndex: this.doubleY ? this.yAxisRule[name].index : 0
          }
        }
        if (series.stack) {
          result.stack = series.stack
          result = util.mergeObject(series.option, result)
        }
        return result
      },
      getLineSeries (name, series) {
        return {
          name,
          type: 'line',
          data: series.values,
          symbol: 'circle',
          symbolSize: 5,
          showAllSymbol: false,
          yAxisIndex: this.doubleY ? this.yAxisRule[name].index : 0,
          itemStyle: {
            normal: {
              lineStyle: {width: 1}
            }
          }
        }
      },
      getAreaSeries (name, series) {
        return {
          name,
          type: 'line',
          data: series.values,
          symbol: 'circle',
          symbolSize: 0,
          showAllSymbol: false,
          yAxisIndex: this.doubleY ? this.yAxisRule[name].index : 0,
          stack: 'area',
          areaStyle: {
            normal: {
              opacity: 0.3
            }
          },
          itemStyle: {
            normal: {
              lineStyle: {width: 1}
            }
          }
        }
      },
      each (handle) {
        this.chartStore.series.forEach((series, index) => {
          const name = series.names.join('-')
          if (util.isArray(this.showList) && !this.showListMap[name] && !this.reverseXAxis) return

          if (this.stack && this.type === 'bar') {
            this.stack.forEach(stack => {
              handle.call(this, `${name} ${stack.name}`, {
                names: series.names.concat([stack.name]),
                values: series.values.map(v => {
                  return v[stack.field]
                }),
                stack: `stack-${index}`,
                option: stack.option
              })
            })
          } else {
            handle.call(this, name, series)
          }
        })
      },
      getAxisPointerType () {
        let type = 'shadow'
        switch (this.type) {
          case 'bar':
            type = 'shadow'
            break
          case 'line':
          case 'area':
            type = 'line'
            break
          default:
            console.error('未支持的图表类型', this.type)
        }
        return type
      },
      setOption (option) {
        this.chart.setOption(this.resizeGrid(util.clone(option)))
      },
      /**
       * @description 对图像大小间距进行调整
       * @param option
       */
      resizeGrid (option) {
        const containerWidth = this.$refs.toChart.offsetWidth
        const containerHeight = this.chart.getHeight()
        const legendHeight = option.legend.show ? 24 : 0
        const margin = {
          top: 20,
          right: 40,
          bottom: 10,
          left: 0
        }
        const xAxisHeight = 24 // todo x轴条目太多，则进行x轴文本旋转处理，旋转后高度需计算
        const yAxisWidth = 80
        option.grid.width = containerWidth - yAxisWidth * (this.doubleY ? 2 : 1) - margin.left - margin.right
        option.grid.top = legendHeight + margin.top
        option.grid.left = yAxisWidth
        option.grid.height = containerHeight - option.grid.top - xAxisHeight - margin.bottom
        return option
      },
      onResize () {
        if (!this.chart) return
        this.setOption(this.option)
        this.$nextTick(() => {
          this.chart.resize()
        })
      }
    }
  }
</script>

<style lang="sass">
@import "styles/charts"
</style>
