/**
 * Jest 测试配置文件
 * 模拟微信小程序的全局 API
 */

// 模拟 wx 全局对象
global.wx = {
  // Storage 相关
  getStorageSync: jest.fn((key) => {
    if (!global.__mockStorage__) {
      global.__mockStorage__ = {}
    }
    return global.__mockStorage__[key] || null
  }),

  setStorageSync: jest.fn((key, value) => {
    if (!global.__mockStorage__) {
      global.__mockStorage__ = {}
    }
    global.__mockStorage__[key] = value
  }),

  removeStorageSync: jest.fn((key) => {
    if (!global.__mockStorage__) {
      global.__mockStorage__ = {}
    }
    delete global.__mockStorage__[key]
  }),

  // 页面导航
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  switchTab: jest.fn(),
  redirectTo: jest.fn(),

  // 交互反馈
  showToast: jest.fn(),
  hideToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showModal: jest.fn(),
  showActionSheet: jest.fn(),

  // 文件选择
  chooseMessageFile: jest.fn(),

  // 下载
  downloadFile: jest.fn(),

  // 云开发
  cloud: {
    init: jest.fn(),
    database: jest.fn()
  },

  // 获取系统信息
  getSystemInfoSync: jest.fn(() => ({
    model: 'iPhone 15',
    system: 'iOS 17.0',
    windowWidth: 375,
    windowHeight: 812
  })),

  // 其他 API
  request: jest.fn(),
  makePhoneCall: jest.fn(),
  addPhoneContact: jest.fn()
}

// 模拟 Page 函数
global.Page = jest.fn((options) => options)

// 模拟 App 函数
global.App = jest.fn((options) => options)

// 模拟 Component 函数
global.Component = jest.fn((options) => options)

// 模拟 getApp
global.getApp = jest.fn(() => ({
  globalData: {
    reviewIntervals: [1, 2, 4, 7],
    masteryLevels: [
      { label: '生疏', value: 0, color: '#FF3B30' },
      { label: '模糊', value: 1, color: '#FF9500' },
      { label: '熟悉', value: 2, color: '#5AC8FA' },
      { label: '熟练', value: 3, color: '#34C759' }
    ]
  }
}))

// 清除 mock 存储
beforeEach(() => {
  global.__mockStorage__ = {}
  jest.clearAllMocks()
})

// 导出以便测试文件使用
module.exports = {}
