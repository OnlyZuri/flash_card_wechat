const { cardStorage } = require('../../utils/storage')
const { showLoading, hideLoading, showToast } = require('../../utils/util')

Page({
  data: {
    previewData: [],
    duplicateOptions: ['跳过重复', '覆盖原有'],
    duplicateIndex: 0
  },

  onLoad() {
    // 检查是否支持文件选择
    if (!wx.chooseMessageFile) {
      showToast('当前版本不支持文件导入')
    }
  },

  /**
   * 选择文件
   */
  selectFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['.csv'],
      success: (res) => {
        const file = res.tempFiles[0]
        this.readFile(file)
      },
      fail: (err) => {
        if (err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({
            title: '选择文件失败',
            icon: 'none'
          })
        }
      }
    })
  },

  /**
   * 读取文件
   */
  readFile(file) {
    wx.showLoading({
      title: '读取文件中...',
      mask: true
    })

    const filePath = file.path
    const fileName = file.name

    if (fileName.endsWith('.csv')) {
      this.readCSV(filePath)
    } else {
      wx.hideLoading()
      wx.showToast({
        title: '不支持的文件格式',
        icon: 'none'
      })
    }
  },

  /**
   * 读取 CSV 文件
   */
  readCSV(filePath) {
    const fs = wx.getFileSystemManager()

    console.log('开始读取 CSV 文件:', filePath)

    // 用 UTF-8 编码读取为字符串
    fs.readFile({
      filePath,
      encoding: 'utf-8',
      success: (res) => {
        console.log('文件读取成功，内容长度:', res.data.length)

        let content = res.data
        console.log('前 100 字符:', content.substring(0, 100))

        // 简单检测：如果包含大量，说明 UTF-8 解码失败
        const replacementCount = (content.match(/[\uFFFD]/g) || []).length
        console.log('替换字符数量:', replacementCount)

        // 如果替换字符太多，说明文件不是 UTF-8 编码
        if (replacementCount > content.length * 0.1) {
          console.log('UTF-8 解码失败，可能是 GBK 编码文件')
          wx.hideLoading()
          wx.showModal({
            title: '编码格式提示',
            content: '检测到文件可能不是 UTF-8 编码，请使用 UTF-8 编码保存 CSV 文件后重新导入。或用 Excel/WPS 打开文件，另存为 CSV 时选择 UTF-8 编码。',
            showCancel: false,
            confirmText: '知道了'
          })
          return
        }

        try {
          const data = this.parseFileContent(content)
          console.log('解析后的数据条数:', data.length)

          wx.hideLoading()

          if (data.length === 0) {
            wx.showToast({ title: '文件内容为空或格式错误', icon: 'none' })
            return
          }

          this.setData({ previewData: data })
          wx.showToast({ title: `解析成功 ${data.length} 条`, icon: 'success' })
        } catch (err) {
          console.error('解析失败:', err)
          wx.hideLoading()
          wx.showToast({ title: '解析失败：' + err.message, icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('文件读取失败:', err)
        wx.hideLoading()
        wx.showToast({
          title: '读取文件失败：' + (err.errMsg || '未知错误'),
          icon: 'none'
        })
      }
    })
  },

  /**
   * 解析文件内容（支持多行单元格）
   */
  parseFileContent(content) {
    const data = []

    // 先处理多行内容：合并引号内的换行
    const lines = this.mergeMultilineCSV(content)

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // 跳过表头（如果第一行包含"问题"等字样）
      if (i === 0 && (line.includes('问题') || line.includes('question'))) {
        continue
      }

      // CSV 解析（支持引号内含逗号）
      const parts = this.parseCSVLine(line)

      if (parts.length >= 2 && parts[0].trim()) {
        const question = parts[0].trim()
        const answer = parts[1] ? parts[1].trim() : ''

        // 答案为空则跳过（没有答案的问题不是有效卡片）
        if (!answer) {
          console.log('跳过无效数据（无答案）:', question)
          continue
        }

        // 从第三列开始解析：标签、掌握程度、复习次数、上次复习、下次复习
        const tags = []
        let level = 0
        let reviewCount = 0
        let lastReview = ''
        let nextReview = ''

        // 导出格式：问题，答案，标签，掌握程度，复习次数，上次复习，下次复习
        for (let j = 2; j < parts.length; j++) {
          const part = parts[j].trim()

          // 检测是否是掌握程度（生疏、模糊、熟悉、熟练）
          if (['生疏', '模糊', '熟悉', '熟练'].includes(part)) {
            level = ['生疏', '模糊', '熟悉', '熟练'].indexOf(part)
            // 后面的列依次是复习次数、上次复习、下次复习
            if (j + 1 < parts.length) {
              reviewCount = parseInt(parts[j + 1]) || 0
            }
            if (j + 2 < parts.length) {
              lastReview = parts[j + 2].trim()
            }
            if (j + 3 < parts.length) {
              nextReview = parts[j + 3].trim()
            }
            break
          }

          // 否则作为标签处理（支持 | 分隔符和逗号分隔符）
          // 导出格式用 | 分隔多个标签，但也支持逗号分隔
          const tagParts = part.split(/[|,,]/).map(t => t.trim()).filter(t => t)
          tags.push(...tagParts)
        }

        const cardData = {
          question,
          answer,
          tags
        }

        // 如果有学习数据，加入卡片对象
        if (level > 0 || reviewCount > 0 || lastReview || nextReview) {
          cardData.level = level
          cardData.reviewCount = reviewCount
          cardData.lastReview = lastReview
          cardData.nextReview = nextReview
        }

        data.push(cardData)
      }
    }

    return data
  },

  /**
   * 合并多行 CSV 内容（处理引号内的换行符）
   */
  mergeMultilineCSV(content) {
    const lines = []
    let currentLine = ''
    let inQuotes = false

    for (let i = 0; i < content.length; i++) {
      const char = content[i]

      if (char === '"') {
        // 检查是否是转义的双引号
        if (inQuotes && i + 1 < content.length && content[i + 1] === '"') {
          currentLine += '""'
          i++
        } else {
          inQuotes = !inQuotes
          currentLine += char
        }
      } else if (char === '\n' && !inQuotes) {
        // 只有在引号外的换行才作为行分隔
        if (currentLine.trim()) {
          lines.push(currentLine.trim())
        }
        currentLine = ''
      } else if (char === '\r') {
        // 跳过回车符
        continue
      } else {
        currentLine += char
      }
    }

    // 添加最后一行
    if (currentLine.trim()) {
      lines.push(currentLine.trim())
    }

    return lines
  },

  /**
   * 解析 CSV 行（支持引号内含逗号，支持中文逗号分隔）
   * 例如："答案，包含逗号",标签 1，标签 2
   */
  parseCSVLine(line) {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        // 检查是否是转义的双引号（"" 表示一个双引号）
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // 跳过下一个双引号
        } else {
          inQuotes = !inQuotes
        }
      } else if ((char === ',' || char === ',') && !inQuotes) {
        // 支持英文逗号和中文逗号作为列分隔符
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }

    result.push(current)
    return result.map(item => item.trim())
  },

  /**
   * 重复数据处理方式
   */
  onDuplicateChange(e) {
    this.setData({
      duplicateIndex: parseInt(e.detail.value)
    })
  },

  /**
   * 确认导入
   */
  confirmImport() {
    const { previewData, duplicateIndex } = this.data

    if (previewData.length === 0) {
      wx.showToast({
        title: '没有可导入的数据',
        icon: 'none'
      })
      return
    }

    const skipDuplicate = duplicateIndex === 0

    wx.showModal({
      title: '确认导入',
      content: `将导入 ${previewData.length} 张卡片，${skipDuplicate ? '重复问题将跳过' : '重复问题将覆盖'}`,
      success: (res) => {
        if (res.confirm) {
          this.doImport(skipDuplicate)
        }
      }
    })
  },

  /**
   * 执行导入
   */
  doImport(skipDuplicate) {
    wx.showLoading({
      title: '导入中...',
      mask: true
    })

    const { previewData } = this.data
    const existingCards = cardStorage.getAll()
    const existingQuestions = new Set(existingCards.map(c => c.question))

    const newCards = previewData.filter(item => {
      if (skipDuplicate && existingQuestions.has(item.question)) {
        return false
      }
      return true
    })

    try {
      const importedCount = cardStorage.saveBatch(newCards)

      wx.hideLoading()
      wx.showToast({
        title: `成功导入 ${importedCount} 张`,
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      console.error('导入失败:', err)
      wx.hideLoading()
      wx.showModal({
        title: '导入失败',
        content: err.message || '未知错误',
        showCancel: false
      })
    }
  },

  /**
   * 下载模板
   */
  downloadTemplate() {
    // CSV 模板内容 - 完整格式（包含学习数据）
    const template = '问题，答案，标签，掌握程度，复习次数，上次复习，下次复习\n"Java 中==和 equals () 的区别？","==比较值或地址；equals() 可重写比较内容","Java 基础，面试高频",熟练，5,2026-03-15,2026-04-15\n"HashMap 的底层实现？","数组 + 链表 + 红黑树，jdk1.8 后链表长度>8 转红黑树",集合，熟悉，3,2026-03-10,2026-03-25'

    const fileName = '闪卡导入模板.csv'

    // 保存到临时文件
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

    fs.writeFile({
      filePath,
      data: template,
      encoding: 'utf-8',
      success: () => {
        wx.hideLoading()

        wx.showModal({
          title: '模板已生成',
          content: '模板包含完整格式（问题，答案，标签，掌握程度，复习次数，上次复习，下次复习）\n\n可以选择用其他应用打开或保存文件',
          showCancel: false,
          confirmText: '打开文件',
          success: () => {
            wx.openDocument({
              filePath,
              showMenu: true
            })
          }
        })
      },
      fail: (err) => {
        wx.showToast({
          title: '生成模板失败',
          icon: 'none'
        })
      }
    })
  }
})
