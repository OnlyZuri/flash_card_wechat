App({
  onLaunch() {
    // 初始化云开发环境（如需使用）
    // wx.cloud.init({ env: 'your-env-id' })
  },

  globalData: {
    // 复习间隔配置（单位：天）
    reviewIntervals: [1, 2, 4, 7], // 生疏、模糊、熟悉、熟练
    // 掌握程度配置 - 苹果风格颜色
    masteryLevels: [
      { label: '生疏', value: 0, color: '#FF3B30' },
      { label: '模糊', value: 1, color: '#FF9500' },
      { label: '熟悉', value: 2, color: '#5AC8FA' },
      { label: '熟练', value: 3, color: '#34C759' }
    ]
  }
})
