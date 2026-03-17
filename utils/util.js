/**
 * 工具函数库
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取今天的日期字符串
 */
function getToday() {
  return formatDate(new Date())
}

/**
 * 计算 n 天后的日期
 */
function getFutureDate(days) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)  // 从今天 00:00:00 开始计算
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

/**
 * 比较两个日期是否是同一天
 */
function isSameDay(date1, date2) {
  return formatDate(date1) === formatDate(date2)
}

/**
 * 检查日期是否已过期（早于今天）
 */
function isPastDue(date) {
  const today = getToday()
  return formatDate(date) < today
}

/**
 * 计算相对日期描述
 */
function getRelativeDateDesc(date) {
  const today = getToday()
  const targetDate = formatDate(date)

  if (targetDate === today) {
    return '今天'
  }

  const diff = Math.ceil((new Date(targetDate) - new Date(today)) / (1000 * 60 * 60 * 24))

  if (diff === 1) {
    return '明天'
  } else if (diff === 2) {
    return '后天'
  } else if (diff > 0) {
    return `${diff}天后`
  } else if (diff === -1) {
    return '昨天'
  } else {
    return `${Math.abs(diff)}天前`
  }
}

/**
 * 解析 CSV 内容
 */
function parseCSV(content) {
  const lines = content.split(/\r?\n/)
  const result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // 简单 CSV 解析（不支持引号内含逗号的情况）
    const parts = line.split(',')
    if (parts.length >= 2) {
      result.push({
        question: parts[0].trim(),
        answer: parts[1].trim(),
        tags: parts[2] ? parts[2].split(/[,,]/).map(t => t.trim()).filter(t => t) : []
      })
    }
  }

  return result
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 显示加载提示
 */
function showLoading(title = '加载中') {
  wx.showLoading({
    title,
    mask: true
  })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示提示框
 */
function showToast(title, icon = 'none') {
  wx.showToast({
    title,
    icon,
    duration: 2000
  })
}

module.exports = {
  formatDate,
  getToday,
  getFutureDate,
  isSameDay,
  isPastDue,
  getRelativeDateDesc,
  parseCSV,
  generateId,
  showLoading,
  hideLoading,
  showToast
}
