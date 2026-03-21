const { recycleBinStorage, cardStorage } = require('../../utils/storage')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

Page({
  data: {
    recycleItems: [],
    selectedIds: [],
    batchMode: false,
    RETENTION_DAYS: 3
  },

  onLoad() {
    this.loadRecycleBin()
  },

  onShow() {
    this.loadRecycleBin()
  },

  onPullDownRefresh() {
    this.loadRecycleBin(() => {
      wx.stopPullDownRefresh()
    })
  },

  /**
   * 加载回收站数据
   */
  async loadRecycleBin(callback) {
    showLoading('加载中...')

    const items = await recycleBinStorage.getAll()

    // 清理过期项目
    const expiredCount = await recycleBinStorage.cleanExpired()
    if (expiredCount > 0) {
      console.log(`清理了 ${expiredCount} 个过期项目`)
    }

    // 计算剩余天数
    const itemsWithDays = items.map(item => {
      const now = new Date()
      const expireAt = item.expireAt ? new Date(item.expireAt) : null
      const diffTime = expireAt - now
      const remainDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      return {
        ...item,
        remainDays: remainDays > 0 ? remainDays : 0,
        deletedDate: item.deletedAt ? this.formatDate(item.deletedAt) : ''
      }
    })

    this.setData({
      recycleItems: itemsWithDays
    })

    hideLoading()

    if (callback) {
      callback()
    }
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    try {
      const date = new Date(dateStr)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    } catch (e) {
      return ''
    }
  },

  /**
   * 恢复卡片
   */
  async restoreCard(e) {
    const id = e.currentTarget.dataset.id

    wx.showLoading({ title: '恢复中...', mask: true })

    const result = await recycleBinStorage.restore(id)

    if (result) {
      wx.showToast({
        title: '已恢复',
        icon: 'success'
      })
      this.loadRecycleBin()
    } else {
      wx.showToast({
        title: '恢复失败',
        icon: 'none'
      })
    }
  },

  /**
   * 永久删除
   */
  permanentlyDeleteCard(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.recycleItems.find(i => i._id === id || i.id === id)
    const question = item ? (item.question || '这张卡片') : '该卡片'

    wx.showModal({
      title: '永久删除',
      content: `确定要永久删除「${question.substring(0, 20)}${question.length > 20 ? '...' : ''}」吗？此操作不可恢复！`,
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true })

          const result = await recycleBinStorage.permanentlyDelete(id)

          if (result) {
            wx.showToast({
              title: '已永久删除',
              icon: 'success'
            })
            this.loadRecycleBin()
          } else {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  /**
   * 批量恢复
   */
  async batchRestore() {
    const { selectedIds } = this.data

    if (selectedIds.length === 0) {
      wx.showToast({
        title: '请选择要恢复的卡片',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '批量恢复',
      content: `确定要恢复选中的 ${selectedIds.length} 张卡片吗？`,
      success: async (res) => {
        if (res.confirm) {
          showLoading('恢复中...')

          const restoredCount = await recycleBinStorage.restoreBatch(selectedIds)

          hideLoading()
          wx.showToast({
            title: `已恢复 ${restoredCount} 张`,
            icon: 'success'
          })

          this.setData({
            batchMode: false,
            selectedIds: []
          })
          this.loadRecycleBin()
        }
      }
    })
  },

  /**
   * 批量永久删除
   */
  async batchPermanentlyDelete() {
    const { selectedIds } = this.data

    if (selectedIds.length === 0) {
      wx.showToast({
        title: '请选择要删除的卡片',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '批量永久删除',
      content: `确定要永久删除选中的 ${selectedIds.length} 张卡片吗？此操作不可恢复！`,
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (res.confirm) {
          showLoading('删除中...')

          const deletedCount = await recycleBinStorage.permanentlyDeleteBatch(selectedIds)

          hideLoading()
          wx.showToast({
            title: `已永久删除 ${deletedCount} 张`,
            icon: 'success'
          })

          this.setData({
            batchMode: false,
            selectedIds: []
          })
          this.loadRecycleBin()
        }
      }
    })
  },

  /**
   * 清空回收站
   */
  clearRecycleBin() {
    const { recycleItems } = this.data

    if (recycleItems.length === 0) {
      wx.showToast({
        title: '回收站为空',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '清空回收站',
      content: `确定要清空回收站吗？${recycleItems.length} 张卡片将被永久删除！`,
      confirmColor: '#FF3B30',
      success: async (res) => {
        if (res.confirm) {
          showLoading('清空中...')

          await recycleBinStorage.clear()

          hideLoading()
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })

          this.loadRecycleBin()
        }
      }
    })
  },

  /**
   * 切换批量模式
   */
  toggleBatchMode() {
    const { batchMode } = this.data

    this.setData({
      batchMode: !batchMode,
      selectedIds: []
    })
  },

  /**
   * 全选/取消全选
   */
  toggleSelectAll() {
    const { selectedIds, recycleItems } = this.data

    if (selectedIds.length === recycleItems.length) {
      // 取消全选
      this.setData({ selectedIds: [] })
    } else {
      // 全选
      const allIds = recycleItems.map(item => item._id || item.id)
      this.setData({ selectedIds: allIds })
    }
  },

  /**
   * 选择/取消选择单个项目
   */
  toggleSelectOne(e) {
    const id = e.currentTarget.dataset.id
    const { selectedIds } = this.data

    const index = selectedIds.indexOf(id)
    if (index > -1) {
      selectedIds.splice(index, 1)
    } else {
      selectedIds.push(id)
    }

    this.setData({ selectedIds })
  },

  /**
   * 查看卡片详情
   */
  viewCard(e) {
    const id = e.currentTarget.dataset.originalId
    if (id) {
      wx.navigateTo({
        url: `/pages/card-edit/card-edit?id=${id}`
      })
    }
  }
})
