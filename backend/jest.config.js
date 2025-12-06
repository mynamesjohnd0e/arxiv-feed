export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/__tests__/**'],
  coverageDirectory: 'coverage',
};
