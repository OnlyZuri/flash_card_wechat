const { cardStorage, studyLogStorage, settingsStorage } = require('../../utils/storage')
const { processReview, getCardStatus, getLevelText, getLevelColor } = require('../../utils/review')

Page({
  data: {
    cards: [],           // 待学习卡片列表
    currentIndex: 0,     // 当前卡片索引
    flipped: false,      // 是否已翻转
    isComplete: false,   // 是否完成学习
    masteryLevels: [],   // 掌握程度选项
    currentCard: null,   // 当前卡片
    totalCount: 0,       // 总卡片数
    studyMode: 'review', // 学习模式：review(复习), overdue(过期), all(全部), random(随机)
    showExitButton: false, // 显示退出按钮
    maxLearnCount: 20,   // 每次最多学习 20 张（默认值）
    // 学习统计
    sessionStats: {
      totalCount: 0,
      levelCounts: [0, 0, 0, 0] // 生疏、模糊、熟悉、熟练
    }
  },

  onLoad() {
    // 获取全局数据
    const app = getApp()
    this.setData({
      masteryLevels: app.globalData.masteryLevels.map(level => ({
        ...level,
        interval: app.globalData.reviewIntervals[level.value]
      }))
    })

    // 从设置中读取每次学习数量
    const settings = settingsStorage.get()
    this.setData({ maxLearnCount: settings.maxLearnCount || 20 })

    // 获取学习模式
    const studyMode = wx.getStorageSync('study_mode') || 'review'
    this.setData({ studyMode })

    this.initCards(studyMode)
  },

  /**
   * 初始化卡片列表
   */
  initCards(mode) {
    const allCards = cardStorage.getAll()
    let cards = []

    switch (mode) {
      case 'overdue':
        // 过期卡片优先
        cards = allCards.filter(card => {
          const status = getCardStatus(card)
          return status.status === 'overdue'
        })
        // 如果过期卡片学完了，加入今日到期卡片
        if (cards.length === 0) {
          cards = allCards.filter(card => {
            const status = getCardStatus(card)
            return status.status === 'due' || status.status === 'new'
          })
        }
        break

      case 'review':
        // 今日到期卡片 + 新卡片（最多 20 张）
        cards = allCards.filter(card => {
          const status = getCardStatus(card)
          return status.status === 'due' || status.status === 'overdue' || status.status === 'new'
        })
        // 按过期优先排序
        cards.sort((a, b) => {
          const statusA = getCardStatus(a)
          const statusB = getCardStatus(b)
          const priority = { 'overdue': 0, 'due': 1, 'new': 2 }
          return priority[statusA.status] - priority[statusB.status]
        })
        // 限制最多 20 张
        if (cards.length > this.data.maxLearnCount) {
          cards = cards.slice(0, this.data.maxLearnCount)
        }
        break

      case 'all':
        // 全部卡片（最多 20 张）
        cards = [...allCards]
        if (cards.length > this.data.maxLearnCount) {
          cards = cards.slice(0, this.data.maxLearnCount)
        }
        break

      case 'random':
        // 随机 20 张
        cards = [...allCards].sort(() => Math.random() - 0.5).slice(0, 20)
        break

      default:
        cards = allCards
    }

    // 如果卡片超过 20 张，显示退出按钮
    const totalAvailable = mode === 'review' || mode === 'all'
      ? (mode === 'review' ? allCards.filter(c => {
          const s = getCardStatus(c)
          return s.status === 'due' || s.status === 'overdue' || s.status === 'new'
        }).length : allCards.length)
      : cards.length

    // 初始化学习统计
    this.sessionStats = {
      totalCount: 0,
      levelCounts: [0, 0, 0, 0]
    }

    // 如果没有卡片
    if (cards.length === 0) {
      this.setData({
        totalCount: 0,
        isComplete: true,
        sessionStats: {
          totalCount: 0,
          levelCounts: [0, 0, 0, 0]
        }
      })
      return
    }

    this.setData({
      cards,
      totalCount: cards.length,
      currentIndex: 0,
      currentCard: cards[0],
      flipped: false,
      isComplete: false,
      showExitButton: totalAvailable > this.data.maxLearnCount
    })
  },

  /**
   * 翻转卡片
   */
  toggleFlip() {
    this.setData({
      flipped: !this.flipped
    })
  },

  /**
   * 选择掌握程度
   */
  selectLevel(e) {
    const level = e.currentTarget.dataset.level
    const currentCard = this.data.currentCard

    if (!currentCard) return

    // 处理复习
    const updatedCard = processReview(currentCard, level)
    cardStorage.save(updatedCard)

    // 记录学习日志
    studyLogStorage.add(currentCard.id, level, currentCard.tags || [])

    // 记录本次学习统计
    this.sessionStats.totalCount++
    this.sessionStats.levelCounts[level]++

    // 移动到下一张
    this.nextCard()
  },

  /**
   * 下一张卡片
   */
  nextCard() {
    const { currentIndex, cards } = this.data

    if (currentIndex >= cards.length - 1) {
      // 学习完成，生成统计数据
      this.showSessionStats()
      return
    }

    this.setData({
      currentIndex: currentIndex + 1,
      currentCard: cards[currentIndex + 1],
      flipped: false
    })
  },

  /**
   * 显示学习统计
   */
  showSessionStats() {
    const { sessionStats, masteryLevels, totalCount } = this.data

    // 计算各等级的百分比
    const levelStats = masteryLevels.map((item, index) => ({
      ...item,
      count: this.sessionStats.levelCounts[index],
      percent: this.sessionStats.totalCount > 0
        ? (this.sessionStats.levelCounts[index] / this.sessionStats.totalCount) * 100
        : 0
    }))

    // 计算掌握率（熟悉和熟练的比例）
    const masteredCount = this.sessionStats.levelCounts[2] + this.sessionStats.levelCounts[3]
    const masteryRate = this.sessionStats.totalCount > 0
      ? Math.round((masteredCount / this.sessionStats.totalCount) * 100)
      : 0

    this.setData({
      isComplete: true,
      flipped: false,
      sessionStats: {
        totalCount: this.sessionStats.totalCount,
        levelCounts: this.sessionStats.levelCounts
      },
      levelStats,
      masteryRate
    })
  },

  /**
   * 跳过卡片
   */
  skipCard() {
    this.nextCard()
  },

  /**
   * 收藏/取消收藏
   */
  toggleFavorite() {
    const currentCard = this.data.currentCard
    if (!currentCard) return

    const isFavorite = !currentCard.isFavorite
    cardStorage.save({
      ...currentCard,
      isFavorite
    })

    this.setData({
      'currentCard.isFavorite': isFavorite
    })

    wx.showToast({
      title: isFavorite ? '已收藏' : '已取消收藏',
      icon: 'none'
    })
  },

  /**
   * 关闭学习
   */
  closeStudy() {
    const { currentIndex, sessionStats } = this.data
    const learnedCount = sessionStats.totalCount

    if (learnedCount > 0) {
      wx.showModal({
        title: '退出学习',
        content: `已学习 ${learnedCount} 张卡片，确定要退出吗？`,
        confirmText: '退出',
        confirmColor: '#FF3B30',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  /**
   * 显示剩余卡片提示
   */
  showRemainingCards() {
    const { totalCount, currentIndex } = this.data
    const remaining = totalCount - currentIndex - 1
    if (remaining > 0) {
      wx.showToast({
        title: `剩余 ${remaining} 张`,
        icon: 'none',
        duration: 1500
      })
    }
  },

  /**
   * 返回首页
   */
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },

  /**
   * 浏览卡片
   */
  browseCards() {
    wx.switchTab({
      url: '/pages/cards/cards'
    })
  }
})
