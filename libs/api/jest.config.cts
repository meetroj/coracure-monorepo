/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: 'api',
  preset: 'react-native',
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx'],
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
    'node_modules/(?!(.pnpm/.+/node_modules/)?(react-native|@react-native(-community)?)/)',
  ],
  coverageDirectory: '../../coverage/libs/api',
};
