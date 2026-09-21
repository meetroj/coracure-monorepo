/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: 'ui',
  preset: 'react-native',
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '^@coracure/brand$': '<rootDir>/../brand/src/index.ts',
  },
  transform: {
    '^.+[.](js|ts|tsx)$': [
      'babel-jest',
      { configFile: __dirname + '/../../apps/patient/.babelrc.js' },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/.+/node_modules/)?(react-native|@react-native(-community)?|react-native-svg|react-native-safe-area-context)/)',
  ],
  coverageDirectory: '../../coverage/libs/ui',
};
