const { cardStorage, studyLogStorage } = require('../../utils/storage')
const { getCardStatus, getLevelText, getLevelColor } = require('../../utils/review')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    stats: {
      continuousDays: 0,
      todayCount: 0,
      totalCount: 0
    },
    totalCards: 0,
    levelStats: [],
    statusStats: {
      overdue: 0,
      due: 0,
      scheduled: 0,
      new: 0
    },
    tags: [],
    recentLogs: []
  },

  onShow() {
    this.loadStats()
  },

  /**
   * 加载统计数据
   */
  loadStats() {
    // 学习统计数据
    const stats = studyLogStorage.getStats()

    // 卡片数据
    const allCards = cardStorage.getAll()
    const totalCards = allCards.length

    // 掌握程度分布
    const levelCounts = [0, 0, 0, 0]
    let overdueCount = 0
    let dueCount = 0
    let scheduledCount = 0
    let newCount = 0

    allCards.forEach(card => {
      // 掌握程度
      const level = card.level !== undefined ? card.level : 0
      if (level >= 0 && level <= 3) {
        levelCounts[level]++
      }

      // 卡片状态
      const status = getCardStatus(card)
      switch (status.status) {
        case 'overdue':
          overdueCount++
          break
        case 'due':
          dueCount++
          break
        case 'scheduled':
          scheduledCount++
          break
        case 'new':
          newCount++
          break
      }
    })

    // 计算百分比
    const maxCount = Math.max(...levelCounts, 1)
    const levelStats = [
      { label: '生疏', value: 0, color: '#ff6b6b', count: levelCounts[0], percent: (levelCounts[0] / maxCount) * 100 },
      { label: '模糊', value: 1, color: '#feca57', count: levelCounts[1], percent: (levelCounts[1] / maxCount) * 100 },
      { label: '熟悉', value: 2, color: '#48dbfb', count: levelCounts[2], percent: (levelCounts[2] / maxCount) * 100 },
      { label: '熟练', value: 3, color: '#1dd1a1', count: levelCounts[3], percent: (levelCounts[3] / maxCount) * 100 }
    ]

    // 标签统计
    const tags = cardStorage.getAllTags().sort((a, b) => b.count - a.count)

    // 最近学习记录
    const allLogs = studyLogStorage.getAll()
    const recentLogs = allLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10)
      .map(log => {
        const card = cardStorage.getById(log.cardId)
        return {
          ...log,
          question: card ? card.question : '已删除的卡片',
          levelText: getLevelText(log.level),
          levelColor: getLevelColor(log.level)
        }
      })

    this.setData({
      stats,
      totalCards,
      levelStats,
      statusStats: { overdue: overdueCount, due: dueCount, scheduled: scheduledCount, new: newCount },
      overdueCount,
      dueCount,
      scheduledCount,
      newCount,
      tags,
      recentLogs
    })
  }
})
