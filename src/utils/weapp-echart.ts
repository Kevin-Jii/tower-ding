import Taro from '@tarojs/taro'
import * as echarts from 'echarts/core'
import { LineChart, PieChart, RadarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  RadarComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

let registered = false

function ensureRegistered() {
  if (registered) return
  echarts.use([
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    RadarComponent,
    LineChart,
    PieChart,
    RadarChart,
    CanvasRenderer
  ])
  registered = true
}

/** 微信小程序 `canvas type="2d"` + ECharts 5 */
export function initWeappCanvasChart(
  canvasId: string,
  option: Record<string, unknown>,
  /** Vue 页面实例：`getCurrentInstance()?.proxy` */
  scope?: unknown
): Promise<ReturnType<typeof echarts.init> | null> {
  ensureRegistered()
  const tryInit = (useScope: boolean) =>
    new Promise<ReturnType<typeof echarts.init> | null>((resolve) => {
      const query = Taro.createSelectorQuery()
      if (useScope && scope) (query as any).in(scope)
      query
        .select(`#${canvasId}`)
        .fields({ node: true, size: true })
        .exec((res: any) => {
          const r0 = res?.[0]
          if (!r0?.node) {
            resolve(null)
            return
          }
          const canvas = r0.node as any
          const w = Number(r0.width) || 300
          const h = Number(r0.height) || 220
          const dpr = Taro.getSystemInfoSync().pixelRatio || 2
          // 某些机型需显式设置画布像素尺寸，避免白屏
          canvas.width = Math.floor(w * dpr)
          canvas.height = Math.floor(h * dpr)
          const chart = echarts.init(canvas, undefined as any, {
            width: w,
            height: h,
            devicePixelRatio: dpr
          })
          chart.setOption(option as any, true)
          resolve(chart)
        })
    })

  return new Promise((resolve) => {
    void tryInit(true).then((c1) => {
      if (c1) {
        resolve(c1)
        return
      }
      // 作用域查询失败时回退全局查询
      void tryInit(false).then(resolve)
    })
  })
}
