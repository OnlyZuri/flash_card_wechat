# Auto Memory for 闪卡小程序

## 项目测试约定（重要）

**用户明确要求：每次代码更新后必须运行测试用例！**

这是为了防止引入新的问题。测试框架已配置完成，运行命令：

```bash
npm test
```

详见 `testing.md` 文件。

## 项目结构

- 微信小程序 - 闪卡学习应用
- 核心功能：卡片管理、艾宾浩斯复习、回收站、学习统计
- 云开发环境 ID：需在 app.js 中配置

## 文件约定

- `utils/util.js` - 通用工具函数
- `utils/review.js` - 复习算法
- `utils/storage.js` - 数据存储层
- `tests/__tests__/` - 测试用例目录
