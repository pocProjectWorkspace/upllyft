/** Unit-test config for the API (mirrors test/jest-e2e.json). */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.*\.spec\.ts$',
  transform: {
    '^.+\.(t|j)s$': ['ts-jest', { isolatedModules: true }],
  },
  transformIgnorePatterns: ['/node_modules/\.pnpm/(?!uuid@)'],
};
