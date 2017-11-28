import './assets/styles/reset.sass'
import './assets/icons/iconfont.css'
import Button from './components/button/index.js'
import ZgInput from './components/input/index'
import ZgCheckbox from './components/checkbox/index'
import {zgSelector, ZgOption, ZgOptGroup} from './components/selector/index'
import {dataGrid, gridColumn} from './components/dataGrid/index'
import tooltip from './components/tooltip/index'
import badge from './components/badge/index'
import loading from './components/loading/index'
import {tabs, tabPanel} from './components/tab/index'
import dialog from './components/dialog'
import reload from './components/reload'

import {charts} from './components/echarts'

import msg from './components/message'

import directives from './directives/main'

const components = [
  Button,
  ZgInput,
  zgSelector,
  ZgOption,
  ZgOptGroup,
  ZgCheckbox,
  dataGrid,
  gridColumn,
  tooltip,
  badge,
  loading,
  tabs,
  tabPanel,
  dialog,
  reload,

  charts
]

const install = function (Vue) {
  // directives
  for (let key in directives) {
    let directive = directives[key]
    Vue.directive(key, directive)
  }

  // components
  components.forEach((component) => {
    component.install(Vue)
  })

  // plugins
  Vue.prototype.$message = msg
}
/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  install(window.Vue)
}

export default {
  install
}
