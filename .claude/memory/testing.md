# 项目测试约定

## 重要规矩

**每次代码更新后必须运行测试用例！**

这是用户的明确要求，用于防止引入新的问题。

## 测试框架配置

- 测试框架：Jest
- 测试目录：`tests/__tests__/`
- 配置文件：`jest.config.js`
- Setup 文件：`tests/setup.js`

## 运行测试命令

```bash
npm test                    # 运行所有测试
npm run test:coverage       # 生成覆盖率报告
npm run test:watch          # 监听模式
```

## 现有测试用例

1. `util.test.js` - 工具函数测试（日期、CSV、ID 生成等）
2. `review.test.js` - 艾宾浩斯复习算法测试
3. `storage.test.js` - 存储层测试（卡片、学习记录、回收站、设置）
4. `integration.test.js` - 集成测试（完整业务流程）

## 工作流程

1. 修改代码前：先了解相关测试用例
2. 修改代码后：运行 `npm test` 确保所有测试通过
3. 如有失败：修复代码直到测试通过
4. 新增功能：同时新增对应的测试用例

## 测试文件位置

```
E:\闪卡小程序/
├── tests/
│   ├── setup.js
│   └── __tests__/
│       ├── util.test.js
│       ├── review.test.js
│       ├── storage.test.js
│       └── integration.test.js
├── utils/
│   ├── util.js
│   ├── review.js
│   └── storage.js
├── jest.config.js
└── package.json
```

## 注意事项

- 测试使用 Jest 框架，模拟了微信小程序的 wx API
- 每个测试前会清空 mock 存储数据
- 测试文件命名规范：`*.test.js`
