/**
 * Jest 配置文件
 * 用于微信小程序的单元测试
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: ['**/tests/__tests__/**/*.test.js'],

  // 测试覆盖率配置
  collectCoverageFrom: [
    'utils/**/*.js',
    '!**/__tests__/**'
  ],

  coverageDirectory: 'coverage',

  // 测试前执行
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 忽略的目录
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // 支持的文件扩展
  moduleFileExtensions: ['js', 'json'],

  // verbose 输出
  verbose: true
}
