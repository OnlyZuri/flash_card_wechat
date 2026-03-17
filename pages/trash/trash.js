const { trashStorage } = require('../../utils/storage')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    trashCards: [],
    groupedCards: [],
    selectedIds: [],
    batchMode: false
  },

  onLoad() {
    this.loadTrashCards()
  },

  onShow() {
    this.loadTrashCards()
  },

  onPullDownRefresh() {
    this.loadTrashCards(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 加载回收站卡片
   */
  loadTrashCards(callback) {
    const allTrash = trashStorage.getAll()

    // 为每张卡片添加格式化日期和 selected 标记
    const trashCards = allTrash.map(item => ({
      ...item,
      expireDate: this.calculateExpireDate(item.deletedAt, item.deletedDays),
      expireTimestamp: this.getExpireTimestamp(item.deletedAt, item.deletedDays),
      selected: false
    }))

    // 按过期时间排序（快到期的在前）
    trashCards.sort((a, b) => a.expireTimestamp - b.expireTimestamp)

    // 按过期时间分组
    const groupedCards = this.groupByExpireDate(trashCards)

    this.setData({
      trashCards,
      groupedCards,
      selectedIds: []
    })

    if (callback) {
      callback()
    }
  },

  /**
   * 计算过期时间戳
   */
  getExpireTimestamp(deletedAt, days) {
    if (!deletedAt || !days) return Date.now()
    const date = new Date(deletedAt)
    date.setDate(date.getDate() + days)
    return date.getTime()
  },

  /**
   * 计算过期日期字符串
   */
  calculateExpireDate(deletedAt, days) {
    if (!deletedAt || !days) return ''
    const date = new Date(deletedAt)
    date.setDate(date.getDate() + days)
    return formatDate(date)
  },

  /**
   * 按过期时间分组
   */
  groupByExpireDate(cards) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()

    const groups = {}

    cards.forEach(card => {
      const expireTime = card.expireTimestamp
      const expireDate = new Date(expireTime)
      const dateStr = formatDate(expireDate)

      // 计算分组 key 和显示文字
      let groupKey, dateDesc

      // 计算距离今天的天数
      const diffDays = Math.floor((expireTime - todayStart) / (24 * 60 * 60 * 1000))

      if (diffDays < 0) {
        // 已过期
        groupKey = 'expired'
        dateDesc = '已过期'
      } else if (diffDays === 0) {
        // 今天过期
        groupKey = dateStr
        dateDesc = '今天过期'
      } else if (diffDays === 1) {
        // 明天过期
        groupKey = dateStr
        dateDesc = '明天过期'
      } else {
        // 几天后过期
        groupKey = dateStr
        dateDesc = `${diffDays}天后过期`
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          date: dateStr,
          dateDesc,
          cards: [],
          sortTime: expireTime
        }
      }
      groups[groupKey].cards.push(card)
    })

    // 转换为数组并排序（已过期和最快到期的在前）
    const result = Object.values(groups)
    result.sort((a, b) => a.sortTime - b.sortTime)

    return result
  },

  /**
   * 点击卡片
   */
  onCardTap(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.batchMode) {
      this.toggleSelectOne({ currentTarget: { dataset: { id } } })
    }
  },

  /**
   * 切换批量模式
   */
  toggleBatchMode() {
    const { batchMode, trashCards } = this.data

    if (batchMode) {
      this.setData({
        batchMode: false,
        selectedIds: [],
        groupedCards: this.groupByExpireDate(trashCards.map(c => ({ ...c, selected: false })))
      })
    } else {
      this.setData({
        batchMode: true,
        selectedIds: [],
        groupedCards: this.groupByExpireDate(trashCards.map(c => ({ ...c, selected: false })))
      })
    }
  },

  /**
   * 选择/取消选择单个卡片
   */
  toggleSelectOne(e) {
    const id = e.currentTarget.dataset.id
    let { selectedIds, trashCards } = this.data

    const index = selectedIds.indexOf(id)
    if (index > -1) {
      selectedIds.splice(index, 1)
    } else {
      selectedIds.push(id)
    }

    // 更新 selected 标记
    trashCards = trashCards.map(card => ({
      ...card,
      selected: selectedIds.includes(card.id)
    }))

    // 重新分组
    const groupedCards = this.groupByExpireDate(trashCards)

    this.setData({
      selectedIds,
      trashCards,
      groupedCards
    })
  },

  /**
   * 全选/取消全选
   */
  toggleSelectAll() {
    const { selectedIds, trashCards } = this.data

    if (selectedIds.length === trashCards.length) {
      // 取消全选
      const updatedCards = trashCards.map(card => ({ ...card, selected: false }))
      this.setData({
        selectedIds: [],
        trashCards: updatedCards,
        groupedCards: this.groupByExpireDate(updatedCards)
      })
    } else {
      // 全选
      const allIds = trashCards.map(card => card.id)
      const updatedCards = trashCards.map(card => ({ ...card, selected: true }))
      this.setData({
        selectedIds: allIds,
        trashCards: updatedCards,
        groupedCards: this.groupByExpireDate(updatedCards)
      })
    }
  },

  /**
   * 批量恢复
   */
  batchRestore() {
    const { selectedIds } = this.data

    if (selectedIds.length === 0) {
      wx.showToast({ title: '请选择要恢复的卡片', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认恢复',
      content: `确定要恢复选中的 ${selectedIds.length} 张卡片吗？`,
      success: (res) => {
        if (res.confirm) {
          const result = trashStorage.restoreBatch(selectedIds)
          if (result.success) {
            wx.showToast({ title: `已恢复 ${result.count} 张`, icon: 'success' })
            this.loadTrashCards()
          }
        }
      }
    })
  },

  /**
   * 批量永久删除
   */
  batchPermanentlyDelete() {
    const { selectedIds } = this.data

    if (selectedIds.length === 0) {
      wx.showToast({ title: '请选择要删除的卡片', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要永久删除选中的 ${selectedIds.length} 张卡片吗？此操作不可恢复！`,
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          trashStorage.permanentlyDeleteBatch(selectedIds)
          wx.showToast({ title: `已删除 ${selectedIds.length} 张`, icon: 'success' })
          this.loadTrashCards()
        }
      }
    })
  },

  /**
   * 清空回收站
   */
  clearAll() {
    const { trashCards } = this.data

    if (trashCards.length === 0) {
      wx.showToast({ title: '回收站已空', icon: 'none' })
      return
    }

    wx.showModal({
      title: '警告',
      content: `确定要清空回收站吗？所有 ${trashCards.length} 张卡片将永久删除，此操作不可恢复！`,
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          trashStorage.clear()
          wx.showToast({ title: '已清空', icon: 'success' })
          this.loadTrashCards()
        }
      }
    })
  }
})
