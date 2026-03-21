# 闪卡小程序 - 测试框架使用说明

## 测试框架

本项目使用 **Jest** 作为单元测试框架，针对微信小程序的特殊环境进行了模拟配置。

## 目录结构

```
闪卡小程序/
├── utils/                 # 工具函数
│   ├── util.js           # 通用工具（日期、CSV 解析等）
│   ├── review.js         # 艾宾浩斯复习算法
│   └── storage.js        # 数据存储层
├── pages/                 # 页面
├── tests/
│   ├── setup.js          # Jest 配置文件（模拟 wx API）
│   └── __tests__/        # 测试用例
│       ├── util.test.js      - 工具函数测试
│       ├── review.test.js    - 复习算法测试
│       ├── storage.test.js   - 存储层测试
│       └── integration.test.js - 集成测试
├── jest.config.js        # Jest 配置
└── package.json
```

## 安装依赖

首次使用前，请安装测试依赖：

```bash
npm install
```

## 运行测试

### 运行所有测试
```bash
npm test
```

### 运行测试并生成覆盖率报告
```bash
npm run test:coverage
```

### 监听模式（文件改动自动重新运行）
```bash
npm run test:watch
```

## 测试统计

- **测试套件**: 4 个
- **测试用例**: 99 个
- **覆盖率**: 核心模块全覆盖

## 测试覆盖的模块

### 1. util.test.js - 工具函数测试
- `formatDate` - 日期格式化
- `getToday` - 获取今天日期
- `getFutureDate` - 计算未来日期
- `isSameDay` - 日期比较
- `isPastDue` - 检查日期是否过期
- `getRelativeDateDesc` - 相对日期描述
- `parseCSV` - CSV 解析
- `generateId` - ID 生成

### 2. review.test.js - 复习算法测试
- `getReviewInterval` - 获取复习间隔
- `calculateNextReview` - 计算下次复习日期
- `processReview` - 处理卡片复习
- `getCardStatus` - 获取卡片状态
- `getLevelText` - 掌握程度文字描述
- `getLevelColor` - 掌握程度颜色
- `suggestLevel` - 智能建议掌握程度

### 3. storage.test.js - 存储层测试
- `cardStorage` - 卡片增删改查
- `studyLogStorage` - 学习记录
- `trashStorage` - 回收站
- `settingsStorage` - 设置

### 4. integration.test.js - 集成测试
- 完整学习流程
- 导入导出流程
- 复习调度验证
- 标签功能
- 搜索功能
- 学习统计

## 新增测试用例

在 `tests/__tests__/` 目录下创建新的 `.test.js` 文件：

```javascript
describe('模块名 - 测试描述', () => {
  describe('函数名 - 功能描述', () => {
    test('测试场景描述', () => {
      // 测试代码
      expect(实际值).toBe(期望值)
    })
  })
})
```

## 持续集成约定

**重要：** 根据项目约定，每次代码更新后应运行测试用例。

运行命令：
```bash
npm test
```

## Mock 说明

测试框架已模拟以下微信小程序 API：
- `wx.getStorageSync` / `wx.setStorageSync` / `wx.removeStorageSync`
- `wx.navigateTo` / `wx.navigateBack` / `wx.switchTab`
- `wx.showToast` / `wx.showLoading` / `wx.showModal`
- `wx.cloud` - 云开发 API

所有 Mock 数据存储在 `global.__mockStorage__` 中，每个测试前会自动清空。
