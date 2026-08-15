// babel-preset-taro 更多选项和默认值：
// https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md
module.exports = {
  presets: [
    ['taro', {
      framework: 'vue3',
      ts: true,
      compiler: 'vite',
      // TaroElement 依赖父类 accessor；loose 模式会把 super setter 错误转换成自身赋值。
      loose: false
    }]
  ]
}
