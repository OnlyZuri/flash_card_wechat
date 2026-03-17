const { cardStorage } = require('../../utils/storage')
const { getLevelText, getLevelColor } = require('../../utils/review')
const { formatDate } = require('../../utils/util')

Page({
  data: {
    cardId: '',
    isEdit: false,
    question: '',
    answer: '',
    tagInput: '',
    tags: [],
    cardInfo: null
  },

  onLoad(options) {
    if (options.id) {
      // 编辑模式
      this.setData({
        cardId: options.id,
        isEdit: true
      })
      this.loadCard(options.id)
    }
  },

  /**
   * 返回
   */
  goBack() {
    wx.navigateBack()
  },

  /**
   * 加载卡片数据
   */
  loadCard(id) {
    const card = cardStorage.getById(id)

    if (!card) {
      wx.showToast({
        title: '卡片不存在',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    const tagInput = card.tags ? card.tags.join(', ') : ''

    const cardInfo = {
      createdAt: formatDate(card.createdAt),
      reviewCount: card.reviewCount || 0,
      levelText: getLevelText(card.level !== undefined ? card.level : 0),
      levelColor: getLevelColor(card.level !== undefined ? card.level : 0),
      nextReview: card.nextReview ? formatDate(card.nextReview) : '未安排'
    }

    this.setData({
      question: card.question || '',
      answer: card.answer || '',
      tagInput,
      tags: card.tags || [],
      cardInfo
    })
  },

  /**
   * 问题输入
   */
  onQuestionInput(e) {
    this.setData({
      question: e.detail.value
    })
  },

  /**
   * 答案输入
   */
  onAnswerInput(e) {
    this.setData({
      answer: e.detail.value
    })
  },

  /**
   * 标签输入
   */
  onTagInput(e) {
    const value = e.detail.value
    this.setData({ tagInput: value })

    // 实时解析标签
    if (value.includes(',') || value.includes(',')) {
      const tags = value
        .split(/[,,]/)
        .map(t => t.trim())
        .filter(t => t)

      if (tags.length > 0) {
        this.setData({ tags })
      }
    } else if (value.trim() === '') {
      this.setData({ tags: [] })
    }
  },

  /**
   * 移除标签
   */
  removeTag(e) {
    const index = e.currentTarget.dataset.index
    const tags = [...this.data.tags]
    tags.splice(index, 1)

    this.setData({
      tags,
      tagInput: tags.join(', ')
    })
  },

  /**
   * 保存卡片
   */
  saveCard() {
    const { question, answer, tags, cardId, isEdit } = this.data

    // 验证
    if (!question.trim()) {
      wx.showToast({ title: '请输入问题', icon: 'none' })
      return
    }

    if (!answer.trim()) {
      wx.showToast({ title: '请输入答案', icon: 'none' })
      return
    }

    // 检查重复（仅新增时）
    if (!isEdit) {
      const existing = cardStorage.getAll().find(c => c.question === question.trim())
      if (existing) {
        wx.showModal({
          title: '提示',
          content: '已存在相同问题的卡片，是否继续保存？',
          success: (res) => {
            if (res.confirm) {
              this.doSave()
            }
          }
        })
        return
      }
    }

    this.doSave()
  },

  /**
   * 执行保存
   */
  doSave() {
    const { cardId, question, answer, tags } = this.data

    const card = {
      id: cardId || 'card_' + Date.now(),
      question: question.trim(),
      answer: answer.trim(),
      tags: [...tags],
      level: 0,
      nextReview: new Date().toISOString().split('T')[0],
      lastReview: null,
      reviewCount: 0
    }

    cardStorage.save(card)

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })

    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  /**
   * 删除卡片
   */
  deleteCard() {
    const { cardId } = this.data

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张卡片吗？此操作不可恢复',
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          cardStorage.delete(cardId)
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      }
    })
  }
})
