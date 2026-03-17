const { cardStorage, studyLogStorage } = require('../../utils/storage')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    stats: {
      continuousDays: 0,
      todayCount: 0,
      totalCount: 0
    }
  },

  onShow() {
    this.loadStats()
  },

  /**
   * 加载统计数据
   */
  loadStats() {
    const stats = studyLogStorage.getStats()
    this.setData({ stats })
  },

  /**
   * 跳转学习统计
   */
  goStats() {
    wx.navigateTo({
      url: '/pages/stats/stats'
    })
  },

  /**
   * 导出数据
   */
  goExport() {
    this.exportData()
  },

  /**
   * 导入数据
   */
  goImport() {
    wx.navigateTo({
      url: '/pages/import/import'
    })
  },

  /**
   * 跳转回收站
   */
  goTrash() {
    wx.navigateTo({
      url: '/pages/trash/trash'
    })
  },

  /**
   * 导出数据
   */
  exportData() {
    wx.showLoading({ title: '生成文件中...' })

    const cards = cardStorage.getAll()

    if (cards.length === 0) {
      wx.hideLoading()
      wx.showToast({ title: '没有可导出的数据', icon: 'none' })
      return
    }

    // 生成 CSV 内容
    let csvContent = '问题，答案，标签，掌握程度，复习次数，上次复习，下次复习\n'

    cards.forEach(card => {
      const levelText = ['生疏', '模糊', '熟悉', '熟练'][card.level || 0]
      const tags = (card.tags || []).join('|')
      const lastReview = card.lastReview || ''
      const nextReview = card.nextReview || ''

      // 处理可能包含逗号的内容
      const question = `"${(card.question || '').replace(/"/g, '""')}"`
      const answer = `"${(card.answer || '').replace(/"/g, '""')}"`

      csvContent += `${question},${answer},${tags},${levelText},${card.reviewCount || 0},${lastReview},${nextReview}\n`
    })

    const fs = wx.getFileSystemManager()
    const fileName = `闪卡数据_${formatDate(new Date())}.csv`
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

    fs.writeFile({
      filePath,
      data: csvContent,
      encoding: 'utf-8',
      success: () => {
        wx.hideLoading()

        wx.showModal({
          title: '导出成功',
          content: '文件已生成，请选择保存位置或用其他应用打开',
          showCancel: false,
          confirmText: '打开文件',
          success: () => {
            wx.openDocument({
              filePath,
              showMenu: true
            })
          }
        })
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ title: '导出失败：' + JSON.stringify(err), icon: 'none' })
      }
    })
  },

  /**
   * 清空所有数据
   */
  clearAll() {
    wx.showModal({
      title: '高危操作',
      content: '确定要清空所有数据吗？包括所有卡片和学习记录，此操作不可恢复！',
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '再次确认',
            content: '真的要清空吗？请三思！',
            confirmColor: '#ff6b6b',
            success: (res2) => {
              if (res2.confirm) {
                cardStorage.clear()
                studyLogStorage.clear()
                wx.showToast({ title: '已清空', icon: 'success' })
                setTimeout(() => {
                  this.loadStats()
                }, 1500)
              }
            }
          })
        }
      }
    })
  },

  /**
   * 显示关于
   */
  showAbout() {
    wx.showModal({
      title: '关于 Java 面试闪卡',
      content: '版本：v1.0.0\n\n基于艾宾浩斯遗忘曲线的闪卡学习工具，帮助你高效记忆 Java 面试知识点。\n\n开发日期：2026 年',
      showCancel: false
    })
  },

  /**
   * 跳转设置
   */
  goSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  }
})
