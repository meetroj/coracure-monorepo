/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: 'patient',
  preset: 'react-native',
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // The per-TEST budget. The flow specs walk several screens, each with mocked
  // round trips; under parallel workers on a 4-core machine the whole walk can
  // pass 5s even though every individual wait resolves. Individual waits are
  // still capped at 5s by asyncUtilTimeout in test-setup.ts, so a genuinely
  // stuck test still fails fast at the wait, not after 20s of nothing.
  testTimeout: 20000,
  // Half the cores, not a fixed number: 2 workers on a 4-core laptop, 8 on a
  // 16-core CI runner. A cold transform cache (every CI run, and every time this
  // file changes) has each worker compile React Native from scratch, and on a
  // small machine a worker per core starves them all into timeouts.
  maxWorkers: '50%',
  moduleNameMapper: {
    '[.]svg$': '<rootDir>/../../libs/ui/testing/svg-mock.js',
    // The workspace libraries, mapped for Jest the way tsconfig.base.json maps
    // them for the compiler and withNxMetro maps them for the bundler.
    '^@coracure/brand$': '<rootDir>/../../libs/brand/src/index.ts',
    '^@coracure/ui$': '<rootDir>/../../libs/ui/src/index.ts',
    '^@coracure/api$': '<rootDir>/../../libs/api/src/index.ts',
  },
  transform: {
    '^.+[.](js|ts|tsx)$': [
      'babel-jest',
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
    '^.+[.](bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      'react-native/jest/assetFileTransformer.js'
    ),
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/.+/node_modules/)?(react-native|@react-native(-community)?|react-native-svg|react-native-safe-area-context)/)',
  ],
  coverageDirectory: '../../coverage/apps/patient'
};