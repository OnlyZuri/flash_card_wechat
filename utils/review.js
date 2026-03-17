/**
 * 艾宾浩斯复习算法 - 天级别
 *
 * 基于掌握程度安排复习间隔：
 * - 生疏 (0): 1 天后复习
 * - 模糊 (1): 2 天后复习
 * - 熟悉 (2): 4 天后复习
 * - 熟练 (3): 7 天后复习
 */

const { getFutureDate } = require('../utils/util')

// 复习间隔配置（单位：天）
const REVIEW_INTERVALS = [1, 2, 4, 7]

/**
 * 根据掌握程度获取复习间隔天数
 */
function getReviewInterval(level) {
  if (level < 0 || level >= REVIEW_INTERVALS.length) {
    return REVIEW_INTERVALS[0]
  }
  return REVIEW_INTERVALS[level]
}

/**
 * 计算下次复习日期
 * @param {number} level - 掌握程度 (0-3)
 * @param {string} baseDate - 基准日期，默认为今天
 * @returns {string} 下次复习日期 (YYYY-MM-DD)
 */
function calculateNextReview(level, baseDate = null) {
  const days = getReviewInterval(level)

  if (baseDate) {
    // 基于指定日期计算
    const date = new Date(baseDate)
    date.setDate(date.getDate() + days)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 基于今天计算
  return getFutureDate(days)
}

/**
 * 处理卡片复习
 * @param {object} card - 卡片对象
 * @param {number} level - 用户评分的掌握程度
 * @returns {object} 更新后的卡片对象
 */
function processReview(card, level) {
  const now = new Date().toISOString()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // 计算下次复习日期
  const nextReview = calculateNextReview(level)

  return {
    ...card,
    level,
    lastReview: todayStr,
    nextReview,
    reviewCount: (card.reviewCount || 0) + 1,
    updatedAt: now
  }
}

/**
 * 获取卡片当前状态描述
 * @param {object} card - 卡片对象
 * @returns {object} 状态信息
 */
function getCardStatus(card) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const nextReview = card.nextReview || todayStr
  // 将下次复习日期也转换为当天零点，避免时区导致的计算偏差
  const nextReviewDate = new Date(nextReview)
  nextReviewDate.setHours(0, 0, 0, 0)
  const diffTime = nextReviewDate - today
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  let status = 'new'
  let statusText = '新卡片'

  if (card.reviewCount > 0) {
    if (diffDays < 0) {
      status = 'overdue'
      statusText = `已过期 ${Math.abs(diffDays)} 天`
    } else if (diffDays === 0) {
      status = 'due'
      statusText = '今天复习'
    } else if (diffDays === 1) {
      status = 'soon'
      statusText = '明天复习'
    } else {
      status = 'scheduled'
      statusText = `${diffDays} 天后复习`
    }
  }

  return {
    status,
    statusText,
    nextReview,
    reviewCount: card.reviewCount || 0,
    level: card.level !== undefined ? card.level : 0
  }
}

/**
 * 获取掌握程度的文字描述
 */
function getLevelText(level) {
  const levels = ['生疏', '模糊', '熟悉', '熟练']
  return levels[level] || '未知'
}

/**
 * 获取掌握程度的颜色
 */
function getLevelColor(level) {
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1']
  return colors[level] || '#999999'
}

/**
 * 智能建议掌握程度
 * 根据卡片的历史复习情况，给出建议的掌握程度
 */
function suggestLevel(card) {
  if (!card || card.reviewCount === 0) {
    return 0 // 新卡片默认生疏
  }

  // 根据复习次数和上次等级建议
  const { reviewCount, level: lastLevel } = card

  if (reviewCount >= 7 && lastLevel === 3) {
    return 3 // 连续 7 次熟练，保持熟练
  } else if (reviewCount >= 4 && lastLevel >= 2) {
    return Math.min(lastLevel + 1, 3)
  } else if (reviewCount >= 2) {
    return Math.max(lastLevel - 1, 0)
  }

  return lastLevel || 0
}

module.exports = {
  getReviewInterval,
  calculateNextReview,
  processReview,
  getCardStatus,
  getLevelText,
  getLevelColor,
  suggestLevel
}
