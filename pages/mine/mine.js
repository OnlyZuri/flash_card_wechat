const { cardStorage, studyLogStorage } = require('../../utils/storage')
const { formatDate } = require('../../utils/util')
const { getCardStatus } = require('../../utils/review')

Page({
  data: {
    userInfo: null,
    userName: '学习冲冲冲',
    signature: '每天进步一点点',
    stats: {
      continuousDays: 0,
      todayCount: 0,
      totalCount: 0
    },
    // 导出相关
    showExportModal: false,
    exportType: 'all', // all, favorite, review
    totalCount: 0,
    favoriteCount: 0,
    reviewCount: 0
  },

  onShow() {
    this.loadUserInfo()
    this.loadSignature()
    this.loadStats()
    this.loadExportCounts()
  },

  /**
   * 加载用户头像和昵称
   */
  loadUserInfo() {
    const that = this
    // 尝试获取用户头像
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          userName: res.userInfo.nickName
        })
        // 缓存用户信息
        wx.setStorageSync('userInfo', res.userInfo)
      },
      fail: () => {
        // 如果用户拒绝，尝试从缓存读取
        const cachedUserInfo = wx.getStorageSync('userInfo')
        if (cachedUserInfo) {
          this.setData({
            userInfo: cachedUserInfo,
            userName: cachedUserInfo.nickName
          })
        }
      }
    })
  },

  /**
   * 加载签名
   */
  loadSignature() {
    const signature = wx.getStorageSync('userSignature')
    if (signature) {
      this.setData({ signature })
    }
  },

  /**
   * 编辑签名
   */
  editSignature(e) {
    const signature = e.detail.value.trim()
    wx.setStorageSync('userSignature', signature)
    this.setData({ signature })
  },

  /**
   * 加载统计数据
   */
  loadStats() {
    const stats = studyLogStorage.getStats()
    this.setData({ stats })
  },

  /**
   * 加载导出数量统计
   */
  loadExportCounts() {
    const cards = cardStorage.getAll()
    const favoriteCount = cards.filter(c => c.isFavorite).length
    const reviewCount = cards.filter(c => {
      const status = getCardStatus(c)
      return status.status === 'due' || status.status === 'overdue' || status.status === 'new'
    }).length

    this.setData({
      totalCount: cards.length,
      favoriteCount,
      reviewCount
    })
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
   * 导出数据 - 显示选择弹窗
   */
  goExport() {
    if (this.data.totalCount === 0) {
      wx.showToast({ title: '没有可导出的数据', icon: 'none' })
      return
    }
    this.setData({
      showExportModal: true,
      exportType: 'all'
    })
  },

  /**
   * 选择导出类型
   */
  selectExportType(e) {
    this.setData({
      exportType: e.currentTarget.dataset.type
    })
  },

  /**
   * 取消导出
   */
  cancelExport() {
    this.setData({
      showExportModal: false
    })
  },

  /**
   * 确认导出
   */
  confirmExport() {
    const { exportType } = this.data
    const allCards = cardStorage.getAll()
    let cardsToExport = []

    switch (exportType) {
      case 'all':
        cardsToExport = allCards
        break
      case 'favorite':
        cardsToExport = allCards.filter(c => c.isFavorite)
        break
      case 'review':
        cardsToExport = allCards.filter(c => {
          const status = getCardStatus(c)
          return status.status === 'due' || status.status === 'overdue' || status.status === 'new'
        })
        break
    }

    if (cardsToExport.length === 0) {
      wx.showToast({ title: '该分类下没有卡片', icon: 'none' })
      this.setData({ showExportModal: false })
      return
    }

    this.exportCards(cardsToExport)
  },

  /**
   * 导出卡片
   */
  exportCards(cards) {
    wx.showLoading({ title: '生成文件中...' })

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

        // 检查是否支持分享文件到聊天
        const canShareFile = wx.shareFileMessage

        wx.showModal({
          title: '导出成功',
          content: `已导出 ${cards.length} 张卡片`,
          showCancel: true,
          cancelText: '稍后发送',
          confirmText: '发送文件',
          success: (res) => {
            if (res.confirm && canShareFile) {
              // 直接分享文件到微信聊天（可选择文件传输助手）
              wx.shareFileMessage({
                filePath,
                fileName,
                success: () => {
                  wx.showToast({ title: '已选择发送', icon: 'success' })
                },
                fail: () => {
                  // 分享失败，打开文件
                  wx.openDocument({
                    filePath,
                    showMenu: true
                  })
                }
              })
            } else {
              // 取消分享或不支持分享，打开文件
              wx.openDocument({
                filePath,
                showMenu: true
              })
            }
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
