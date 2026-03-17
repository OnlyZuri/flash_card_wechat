const { cardStorage, studyLogStorage } = require('../../utils/storage')
const { getCardStatus, getLevelColor } = require('../../utils/review')
const { getToday } = require('../../utils/util')

Page({
  data: {
    currentDate: '',
    greeting: '',
    dueCount: 0,
    overdueCount: 0,
    newCount: 0,
    continuousDays: 0,
    totalCount: 0,
    masteryLevels: [],
    recentCards: [],
    overdueCards: []
  },

  onLoad() {
    this.refreshData()
  },

  onShow() {
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 刷新数据
   */
  refreshData(callback) {
    const today = getToday()

    // 设置日期和问候语
    const dateObj = new Date()
    const hour = dateObj.getHours()
    const month = dateObj.getMonth() + 1
    const day = dateObj.getDate()
    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dateObj.getDay()]

    // 根据时间段设置问候语
    let greeting = '早上好'
    if (hour >= 11 && hour < 14) {
      greeting = '中午好'
    } else if (hour >= 14 && hour < 18) {
      greeting = '下午好'
    } else if (hour >= 18 && hour < 22) {
      greeting = '晚上好'
    } else if (hour >= 22 || hour < 6) {
      greeting = '夜深了'
    }

    this.setData({
      currentDate: `${month}月${day}日 ${weekDay}`,
      greeting: `${greeting}！`
    })

    // 获取所有卡片
    const allCards = cardStorage.getAll()
    const totalCards = allCards.length

    // 计算到期和过期卡片（包括新卡片）
    let dueCount = 0
    let overdueCount = 0
    let newCount = 0

    allCards.forEach(card => {
      const status = getCardStatus(card)
      if (status.status === 'overdue') {
        overdueCount++
      } else if (status.status === 'due') {
        dueCount++
      } else if (status.status === 'new') {
        newCount++  // 新卡片也可学习
      }
    })

    // 获取掌握程度分布
    const levelCounts = [0, 0, 0, 0]
    allCards.forEach(card => {
      const level = card.level !== undefined ? card.level : 0
      if (level >= 0 && level <= 3) {
        levelCounts[level]++
      }
    })

    const masteryLevels = [
      { label: '生疏', value: 0, color: '#FF3B30', count: levelCounts[0], percent: 0 },
      { label: '模糊', value: 1, color: '#FF9500', count: levelCounts[1], percent: 0 },
      { label: '熟悉', value: 2, color: '#5AC8FA', count: levelCounts[2], percent: 0 },
      { label: '熟练', value: 3, color: '#34C759', count: levelCounts[3], percent: 0 }
    ]

    // 计算百分比
    if (totalCards > 0) {
      masteryLevels.forEach(item => {
        item.percent = (item.count / totalCards) * 100
      })
    }

    // 获取最近添加的卡片（最近 5 条）
    const recentCards = [...allCards]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)

    // 获取学习数据
    const continuousDays = studyLogStorage.getContinuousDays()

    this.setData({
      totalCount: totalCards,
      dueCount,
      overdueCount,
      newCount,  // 添加新卡片数量
      continuousDays,
      masteryLevels,
      recentCards,
      overdueCards: allCards.filter(card => getCardStatus(card).status === 'overdue')
    })

    if (callback) {
      callback()
    }
  },

  /**
   * 开始复习
   */
  startReview() {
    const { dueCount, overdueCount, newCount, totalCount } = this.data

    if (dueCount + overdueCount + newCount === 0) {
      wx.showModal({
        title: '太棒了',
        content: '所有卡片都已复习完成！',
        showCancel: false,
        confirmText: '好的',
        success: () => {
          // 如果还有新卡片，可以继续学习
          if (totalCount > 0) {
            wx.setStorageSync('study_mode', 'all')
            wx.navigateTo({ url: '/pages/study/study' })
          } else {
            wx.switchTab({ url: '/pages/cards/cards' })
          }
        }
      })
      return
    }

    // 跳转到学习页
    wx.setStorageSync('study_mode', 'review')
    wx.navigateTo({
      url: '/pages/study/study'
    })
  },

  /**
   * 复习过期卡片
   */
  reviewOverdue() {
    wx.setStorageSync('study_mode', 'overdue')
    wx.navigateTo({
      url: '/pages/study/study'
    })
  },

  /**
   * 浏览卡片
   */
  browseCards() {
    wx.switchTab({
      url: '/pages/cards/cards'
    })
  },

  /**
   * 查看卡片详情
   */
  viewCard(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/card-edit/card-edit?id=${id}`
    })
  },

  /**
   * 去导入
   */
  goImport() {
    wx.navigateTo({
      url: '/pages/import/import'
    })
  },

  /**
   * 添加卡片
   */
  addCard() {
    wx.navigateTo({
      url: '/pages/card-edit/card-edit'
    })
  },

  /**
   * 跳转统计
   */
  goStats() {
    wx.navigateTo({
      url: '/pages/stats/stats'
    })
  }
})
