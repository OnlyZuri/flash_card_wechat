const { settingsStorage } = require('../../utils/storage')

Page({
  data: {
    settings: {
      maxLearnCount: 20
    },
    originalSettings: null,
    inputValue: ''
  },

  onLoad() {
    this.loadSettings()
  },

  /**
   * 加载设置
   */
  loadSettings() {
    const settings = settingsStorage.get()
    this.setData({
      settings,
      originalSettings: { ...settings },
      inputValue: String(settings.maxLearnCount)
    })
  },

  /**
   * 手动输入
   */
  onManualInput(e) {
    const value = e.detail.value.trim()
    this.setData({ inputValue: value })
  },

  /**
   * 减少数量
   */
  decreaseCount() {
    const count = parseInt(this.data.inputValue) || 20
    if (count > 5) {
      const newCount = count - 1
      this.setData({
        inputValue: String(newCount),
        'settings.maxLearnCount': newCount
      })
    } else {
      wx.showToast({
        title: '最少 5 张',
        icon: 'none'
      })
    }
  },

  /**
   * 增加数量
   */
  increaseCount() {
    const count = parseInt(this.data.inputValue) || 20
    if (count < 100) {
      const newCount = count + 1
      this.setData({
        inputValue: String(newCount),
        'settings.maxLearnCount': newCount
      })
    } else {
      wx.showToast({
        title: '最多 100 张',
        icon: 'none'
      })
    }
  },

  /**
   * 保存设置
   */
  saveSettings() {
    const count = parseInt(this.data.inputValue)

    // 验证输入
    if (isNaN(count) || count < 5) {
      wx.showToast({
        title: '最少 5 张',
        icon: 'none'
      })
      return
    }

    if (count > 100) {
      wx.showToast({
        title: '最多 100 张',
        icon: 'none'
      })
      return
    }

    const { originalSettings } = this.data

    // 检查是否有修改
    if (count === originalSettings.maxLearnCount) {
      wx.showToast({
        title: '无修改',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
      return
    }

    settingsStorage.save({
      maxLearnCount: count
    })

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  /**
   * 恢复默认设置
   */
  resetSettings() {
    wx.showModal({
      title: '恢复默认',
      content: '确定要恢复所有设置为默认值吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            inputValue: '20',
            'settings.maxLearnCount': 20
          })
          wx.showToast({
            title: '已恢复默认',
            icon: 'success'
          })
        }
      }
    })
  }
})
