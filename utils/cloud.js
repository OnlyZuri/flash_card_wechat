/**
 * 云开发初始化引导
 *
 * 使用说明：
 * 1. 在微信开发者工具中开通云开发
 * 2. 创建云数据库集合
 * 3. 将云环境 ID 填入 app.js
 */

// 检查云开发状态
function checkCloudInit() {
  if (!wx.cloud) {
    console.warn('当前基础库版本不支持云开发，请升级基础库')
    return false
  }

  const env = wx.cloud.cloudId
  if (!env) {
    console.warn('云开发未初始化，请检查 app.js 中的配置')
    return false
  }

  console.log('云开发已初始化，环境 ID:', env)
  return true
}

// 创建云数据库集合（需要在微信开发者工具中手动操作或首次运行时调用）
async function initCloudDatabase() {
  if (!checkCloudInit()) {
    return
  }

  const db = wx.cloud.database()
  const collections = ['flash_cards', 'study_log', 'settings', 'recycle_bin']

  for (const name of collections) {
    try {
      // 检查集合是否存在
      await db.collection(name).limit(1).get()
      console.log(`集合 [${name}] 存在`)
    } catch (e) {
      console.log(`集合 [${name}] 不存在，需要在云开发控制台创建`)
    }
  }
}

module.exports = {
  checkCloudInit,
  initCloudDatabase
}
