const { cardStorage } = require('../../utils/storage')
const { getCardStatus, getLevelColor } = require('../../utils/review')
const { showLoading, hideLoading } = require('../../utils/util')

Page({
  data: {
    cards: [],
    filteredCards: [],
    tags: [],
    currentTag: '',
    keyword: '',
    showAddMenu: false,
    batchMode: false,
    selectedIds: []
  },

  onLoad() {
    this.loadCards()
  },

  onShow() {
    this.loadCards()
  },

  /**
   * 加载卡片数据
   */
  loadCards() {
    const allCards = cardStorage.getAll()
    const tags = cardStorage.getAllTags()

    // 为每张卡片添加状态信息
    const cardsWithStatus = allCards.map(card => {
      const status = getCardStatus(card)
      return {
        ...card,
        statusText: status.statusText,
        statusColor: status.status === 'overdue' ? '#ff6b6b' :
                     status.status === 'due' ? '#feca57' : '#999',
        nextReviewDate: card.nextReview || '',
        statusPriority: status.status === 'overdue' ? 0 :
                        status.status === 'due' ? 1 :
                        status.status === 'new' ? 3 : 2
      }
    })

    // 按优先级排序：过期 > 今天 > 未来 > 新卡片
    cardsWithStatus.sort((a, b) => {
      // 先按状态优先级排序
      if (a.statusPriority !== b.statusPriority) {
        return a.statusPriority - b.statusPriority
      }
      // 同状态按日期排序
      const dateA = a.nextReviewDate || ''
      const dateB = b.nextReviewDate || ''
      return dateA.localeCompare(dateB)
    })

    this.setData({
      cards: cardsWithStatus,
      filteredCards: cardsWithStatus,
      tags
    })

    // 恢复筛选条件
    this.applyFilter()
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({ keyword })
    this.applyFilter()
  },

  /**
   * 搜索确认
   */
  onSearch(e) {
    const keyword = e.detail.value
    this.setData({ keyword, currentTag: '' })
    this.applyFilter()
  },

  /**
   * 清除搜索
   */
  clearSearch() {
    this.setData({ keyword: '', currentTag: '' })
    this.applyFilter()
  },

  /**
   * 选择标签
   */
  selectTag(e) {
    const tag = e.currentTarget.dataset.tag
    this.setData({ currentTag: tag })
    this.applyFilter()
  },

  /**
   * 应用筛选
   */
  applyFilter() {
    let { cards, keyword, currentTag, selectedIds } = this.data

    // 关键词筛选
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      cards = cards.filter(card =>
        card.question.toLowerCase().includes(lowerKeyword) ||
        card.answer.toLowerCase().includes(lowerKeyword) ||
        (card.tags && card.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
      )
    }

    // 标签筛选
    if (currentTag) {
      cards = cards.filter(card =>
        card.tags && card.tags.includes(currentTag)
      )
    }

    // 更新 selected 标记
    cards = cards.map(card => ({
      ...card,
      selected: selectedIds.includes(card.id)
    }))

    // 筛选后重新排序
    cards.sort((a, b) => {
      // 先按状态优先级排序
      if (a.statusPriority !== b.statusPriority) {
        return a.statusPriority - b.statusPriority
      }
      // 同状态按日期排序
      const dateA = a.nextReviewDate || ''
      const dateB = b.nextReviewDate || ''
      return dateA.localeCompare(dateB)
    })

    this.setData({ filteredCards: cards })
  },

  /**
   * 显示添加菜单
   */
  showAddMenu() {
    this.setData({ showAddMenu: true })
  },

  /**
   * 隐藏添加菜单
   */
  hideAddMenu() {
    this.setData({ showAddMenu: false })
  },

  /**
   * 阻止冒泡
   */
  stopPropagation(e) {
    e.stopPropagation()
  },

  /**
   * 导入数据
   */
  goImport() {
    this.hideAddMenu()
    wx.navigateTo({
      url: '/pages/import/import'
    })
  },

  /**
   * 手动添加
   */
  addManual() {
    this.hideAddMenu()
    wx.navigateTo({
      url: '/pages/card-edit/card-edit'
    })
  },

  /**
   * 查看卡片
   */
  viewCard(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/card-edit/card-edit?id=${id}`
    })
  },

  /**
   * 编辑卡片
   */
  editCard(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/card-edit/card-edit?id=${id}`
    })
  },

  /**
   * 删除卡片
   */
  deleteCard(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张卡片吗？',
      success: (res) => {
        if (res.confirm) {
          cardStorage.delete(id)
          this.loadCards()
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 切换批量模式
   */
  toggleBatchMode() {
    const { batchMode, filteredCards } = this.data

    if (batchMode) {
      // 退出批量模式，清空选择
      this.setData({
        batchMode: false,
        selectedIds: [],
        filteredCards: filteredCards.map(card => ({ ...card, selected: false }))
      })
    } else {
      // 进入批量模式，初始化 selected 标记
      this.setData({
        batchMode: true,
        selectedIds: [],
        filteredCards: filteredCards.map(card => ({ ...card, selected: false }))
      })
    }
  },

  /**
   * 全选/取消全选
   */
  toggleSelectAll() {
    const { filteredCards, selectedIds } = this.data

    if (selectedIds.length === filteredCards.length) {
      // 取消全选
      this.setData({
        selectedIds: [],
        filteredCards: filteredCards.map(card => ({ ...card, selected: false }))
      })
    } else {
      // 全选
      const allIds = filteredCards.map(card => card.id)
      this.setData({
        selectedIds: allIds,
        filteredCards: filteredCards.map(card => ({ ...card, selected: true }))
      })
    }
  },

  /**
   * 选择/取消选择单个卡片
   */
  toggleSelectOne(e) {
    const id = e.currentTarget.dataset.id
    const { selectedIds, filteredCards } = this.data

    console.log('toggleSelectOne called, id:', id, 'current selectedIds:', selectedIds)

    const index = selectedIds.indexOf(id)
    if (index > -1) {
      // 取消选择
      selectedIds.splice(index, 1)
      console.log('取消选择，新 selectedIds:', selectedIds)
    } else {
      // 选择
      selectedIds.push(id)
      console.log('选择，新 selectedIds:', selectedIds)
    }

    // 更新 filteredCards 中每张卡片的 selected 标记
    const updatedCards = filteredCards.map(card => ({
      ...card,
      selected: selectedIds.includes(card.id)
    }))

    this.setData({
      selectedIds,
      filteredCards: updatedCards
    })
    console.log('setData 完成')
  },

  /**
   * 批量删除
   */
  batchDelete() {
    const { selectedIds } = this.data

    if (selectedIds.length === 0) {
      wx.showToast({
        title: '请选择要删除的卡片',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedIds.length} 张卡片吗？`,
      success: (res) => {
        if (res.confirm) {
          showLoading('删除中...')

          // 使用批量删除方法
          cardStorage.deleteBatch(selectedIds)

          this.loadCards()
          hideLoading()
          wx.showToast({
            title: `已删除 ${selectedIds.length} 张`,
            icon: 'success'
          })

          // 退出批量模式
          this.setData({
            batchMode: false,
            selectedIds: []
          })
        }
      }
    })
  },

  /**
   * 清空所有卡片
   */
  clearAllCards() {
    const { cards } = this.data

    if (cards.length === 0) {
      wx.showToast({
        title: '没有可清空的卡片',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '警告',
      content: `确定要清空所有 ${cards.length} 张卡片吗？此操作不可恢复！`,
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '清空中...',
            mask: true
          })

          // 清空所有卡片
          cardStorage.clear()

          wx.hideLoading()
          wx.showToast({
            title: `已清空 ${cards.length} 张`,
            icon: 'success'
          })

          this.loadCards()
        }
      }
    })
  }
})
