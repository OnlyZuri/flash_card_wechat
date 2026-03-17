/**
 * 数据存储层 - 基于微信 Storage
 */
const { generateId, getToday, getFutureDate, formatDate } = require('../utils/util')

const STORAGE_KEYS = {
  CARDS: 'flash_cards',        // 卡片数据
  STUDY_LOG: 'study_log',      // 学习记录
  SETTINGS: 'settings',        // 设置
  TRASH: 'trash_cards'         // 回收站数据
}

// 回收站保留天数
const TRASH_RETENTION_DAYS = 3

/**
 * 卡片数据操作
 */
export const cardStorage = {
  /**
   * 获取所有卡片
   */
  getAll() {
    const data = wx.getStorageSync(STORAGE_KEYS.CARDS)
    return data || []
  },

  /**
   * 根据 ID 获取卡片
   */
  getById(id) {
    const cards = this.getAll()
    return cards.find(card => card.id === id)
  },

  /**
   * 保存卡片（新增或更新）
   */
  save(card) {
    const cards = this.getAll()
    const index = cards.findIndex(c => c.id === card.id)

    if (index >= 0) {
      cards[index] = { ...card, updatedAt: new Date().toISOString() }
    } else {
      cards.push({
        ...card,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }

    wx.setStorageSync(STORAGE_KEYS.CARDS, cards)
    return card
  },

  /**
   * 批量保存卡片
   */
  saveBatch(cards) {
    const allCards = this.getAll()
    const today = getToday()

    cards.forEach(card => {
      const index = allCards.findIndex(c => c.id === card.id || c.question === card.question)
      const newCard = {
        ...card,
        id: card.id || generateId(),
        level: card.level !== undefined ? card.level : 0,
        nextReview: today,  // 新导入的卡片默认今天可学习
        lastReview: null,   // 新卡片没有学习过
        reviewCount: 0,     // 复习次数归零
        createdAt: card.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (index >= 0) {
        allCards[index] = newCard
      } else {
        allCards.push(newCard)
      }
    })

    wx.setStorageSync(STORAGE_KEYS.CARDS, allCards)
    return allCards.length
  },

  /**
   * 删除卡片（移动到回收站）
   */
  delete(id) {
    const cards = this.getAll()
    const card = cards.find(c => c.id === id)

    if (card) {
      // 将卡片移动到回收站
      trashStorage.moveToTrash(card)

      // 从原卡片列表中移除
      const filtered = cards.filter(c => c.id !== id)
      wx.setStorageSync(STORAGE_KEYS.CARDS, filtered)
      return filtered.length
    }
    return cards.length
  },

  /**
   * 批量删除卡片（移动到回收站）
   */
  deleteBatch(ids) {
    const cards = this.getAll()
    const deletedCards = cards.filter(card => ids.includes(card.id))

    if (deletedCards.length > 0) {
      // 将卡片移动到回收站
      trashStorage.moveToTrashBatch(deletedCards)

      // 从原卡片列表中移除
      const filtered = cards.filter(card => !ids.includes(card.id))
      wx.setStorageSync(STORAGE_KEYS.CARDS, filtered)
      return filtered.length
    }
    return cards.length
  },

  /**
   * 获取今日需要复习的卡片
   */
  getDueToday() {
    const cards = this.getAll()
    const today = getToday()
    return cards.filter(card => card.nextReview <= today)
  },

  /**
   * 获取过期未复习的卡片
   */
  getOverdue() {
    const cards = this.getAll()
    const today = getToday()
    return cards.filter(card => card.nextReview < today && card.nextReview !== null)
  },

  /**
   * 根据标签筛选卡片
   */
  getByTag(tag) {
    const cards = this.getAll()
    if (!tag) return cards
    return cards.filter(card => card.tags && card.tags.includes(tag))
  },

  /**
   * 获取所有标签
   */
  getAllTags() {
    const cards = this.getAll()
    const tagMap = {}

    cards.forEach(card => {
      if (card.tags) {
        card.tags.forEach(tag => {
          tagMap[tag] = (tagMap[tag] || 0) + 1
        })
      }
    })

    return Object.entries(tagMap).map(([name, count]) => ({ name, count }))
  },

  /**
   * 搜索卡片
   */
  search(keyword) {
    const cards = this.getAll()
    if (!keyword) return cards

    const lowerKeyword = keyword.toLowerCase()
    return cards.filter(card =>
      card.question.toLowerCase().includes(lowerKeyword) ||
      card.answer.toLowerCase().includes(lowerKeyword) ||
      (card.tags && card.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
    )
  },

  /**
   * 导出所有卡片
   */
  exportAll() {
    return this.getAll()
  },

  /**
   * 清空所有卡片
   */
  clear() {
    wx.removeStorageSync(STORAGE_KEYS.CARDS)
  }
}

/**
 * 学习记录操作
 */
export const studyLogStorage = {
  /**
   * 获取学习记录
   */
  getAll() {
    const data = wx.getStorageSync(STORAGE_KEYS.STUDY_LOG)
    return data || []
  },

  /**
   * 添加学习记录
   */
  add(cardId, level, tags = []) {
    const logs = this.getAll()
    const today = getToday()

    logs.push({
      cardId,
      level,
      tags,
      date: today,
      timestamp: new Date().toISOString()
    })

    wx.setStorageSync(STORAGE_KEYS.STUDY_LOG, logs)
  },

  /**
   * 获取某天的学习记录
   */
  getByDate(date) {
    const logs = this.getAll()
    return logs.filter(log => log.date === date)
  },

  /**
   * 获取连续学习天数
   */
  getContinuousDays() {
    const logs = this.getAll()
    if (logs.length === 0) return 0

    // 去重获取有学习的日期
    const uniqueDates = [...new Set(logs.map(log => log.date))]
    uniqueDates.sort((a, b) => b.localeCompare(a)) // 从近到远排序

    let continuous = 1
    const today = getToday()

    // 检查今天是否有学习
    if (uniqueDates[0] !== today) {
      // 检查昨天是否有学习
      const yesterday = getFutureDate(-1)
      if (uniqueDates[0] !== yesterday) {
        return 0
      }
    }

    // 计算连续天数
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1])
      const currDate = new Date(uniqueDates[i])
      const diff = Math.ceil((prevDate - currDate) / (1000 * 60 * 60 * 24))

      if (diff === 1) {
        continuous++
      } else {
        break
      }
    }

    return continuous
  },

  /**
   * 获取学习统计
   */
  getStats() {
    const logs = this.getAll()
    const today = getToday()

    // 今日学习数
    const todayCount = logs.filter(log => log.date === today).length

    // 总计学习次数
    const totalCount = logs.length

    // 按掌握程度统计
    const levelStats = [0, 0, 0, 0]
    logs.forEach(log => {
      if (log.level >= 0 && log.level <= 3) {
        levelStats[log.level]++
      }
    })

    return {
      todayCount,
      totalCount,
      levelStats,
      continuousDays: this.getContinuousDays()
    }
  },

  /**
   * 清空学习记录
   */
  clear() {
    wx.removeStorageSync(STORAGE_KEYS.STUDY_LOG)
  }
}

/**
 * 回收站操作
 */
export const trashStorage = {
  /**
   * 获取所有回收站卡片
   */
  getAll() {
    const data = wx.getStorageSync(STORAGE_KEYS.TRASH)
    if (!data) return []

    // 清理过期的卡片
    const cleaned = this.cleanExpired()
    return cleaned
  },

  /**
   * 获取回收站统计
   */
  getStats() {
    const all = this.getAll()
    const today = getToday()

    return {
      totalCount: all.length,
      willExpireCount: all.filter(card => {
        // 计算过期日期：删除日期 + 保留天数
        const deleteDate = new Date(card.deletedAt)
        deleteDate.setDate(deleteDate.getDate() + (card.deletedDays || TRASH_RETENTION_DAYS))
        const expireDateStr = formatDate(deleteDate)
        return expireDateStr <= today
      }).length
    }
  },

  /**
   * 清理过期卡片
   */
  cleanExpired() {
    const data = wx.getStorageSync(STORAGE_KEYS.TRASH)
    if (!data) return []

    const today = getToday()
    const filtered = data.filter(item => {
      // 根据删除日期计算是否过期
      const deleteDate = new Date(item.deletedAt)
      deleteDate.setDate(deleteDate.getDate() + (item.deletedDays || TRASH_RETENTION_DAYS))
      const expireDateStr = formatDate(deleteDate)
      return expireDateStr > today
    })

    // 如果有过期，更新存储
    if (filtered.length !== data.length) {
      wx.setStorageSync(STORAGE_KEYS.TRASH, filtered)
    }

    return filtered
  },

  /**
   * 将卡片移入回收站
   */
  moveToTrash(card) {
    const items = this.getAll()

    items.push({
      ...card,
      deletedAt: new Date().toISOString(),
      deletedDays: TRASH_RETENTION_DAYS
    })

    wx.setStorageSync(STORAGE_KEYS.TRASH, items)
  },

  /**
   * 批量将卡片移入回收站
   */
  moveToTrashBatch(cards) {
    const items = this.getAll()
    const deletedAt = new Date().toISOString()

    cards.forEach(card => {
      items.push({
        ...card,
        deletedAt,
        deletedDays: TRASH_RETENTION_DAYS
      })
    })

    wx.setStorageSync(STORAGE_KEYS.TRASH, items)
  },

  /**
   * 恢复卡片（回滚）
   */
  restore(id) {
    const items = this.getAll()
    const itemIndex = items.findIndex(item => item.id === id)

    if (itemIndex === -1) {
      return { success: false, message: '卡片不存在' }
    }

    const item = items[itemIndex]

    // 恢复到卡片列表
    cardStorage.save(item)

    // 从回收站移除
    items.splice(itemIndex, 1)
    wx.setStorageSync(STORAGE_KEYS.TRASH, items)

    return { success: true, card: item }
  },

  /**
   * 批量恢复卡片
   */
  restoreBatch(ids) {
    const items = this.getAll()
    const toRestore = items.filter(item => ids.includes(item.id))

    if (toRestore.length === 0) {
      return { success: false, message: '没有可恢复的卡片' }
    }

    // 批量恢复到卡片列表
    cardStorage.saveBatch(toRestore)

    // 从回收站移除
    const remaining = items.filter(item => !ids.includes(item.id))
    wx.setStorageSync(STORAGE_KEYS.TRASH, remaining)

    return { success: true, count: toRestore.length }
  },

  /**
   * 永久删除卡片（彻底删除）
   */
  permanentlyDelete(id) {
    const items = this.getAll()
    const filtered = items.filter(item => item.id !== id)
    wx.setStorageSync(STORAGE_KEYS.TRASH, filtered)
    return filtered.length
  },

  /**
   * 批量永久删除
   */
  permanentlyDeleteBatch(ids) {
    const items = this.getAll()
    const filtered = items.filter(item => !ids.includes(item.id))
    wx.setStorageSync(STORAGE_KEYS.TRASH, filtered)
    return filtered.length
  },

  /**
   * 清空回收站
   */
  clear() {
    wx.removeStorageSync(STORAGE_KEYS.TRASH)
  }
}

/**
 * 设置操作
 */
export const settingsStorage = {
  /**
   * 获取设置
   */
  get() {
    const data = wx.getStorageSync(STORAGE_KEYS.SETTINGS)
    return {
      dailyReminder: true, // 每日提醒
      reminderTime: '09:00', // 提醒时间
      maxLearnCount: 20,   // 每次最多学习张数
      ...data
    }
  },

  /**
   * 保存设置
   */
  save(settings) {
    wx.setStorageSync(STORAGE_KEYS.SETTINGS, {
      ...this.get(),
      ...settings
    })
  },

  /**
   * 获取某项设置
   */
  getOne(key) {
    const settings = this.get()
    return settings[key]
  }
}

module.exports = {
  cardStorage,
  studyLogStorage,
  settingsStorage,
  trashStorage
}
