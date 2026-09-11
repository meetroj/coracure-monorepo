/**
 * Jest mock for `*.svg` imports.
 *
 * Replaces `@nx/react-native/plugins/jest/svg-mock`, which does
 * `module.exports = 'SvgMock'` and then assigns `.ReactComponent` onto that
 * string — throwing "Cannot create property 'ReactComponent' on string".
 * Metro (via react-native-svg-transformer) is unaffected; this is test-only.
 *
 * `apps/doctor` already carries an identical copy at `src/test/svg-mock.js`.
 * This is the shared home for it; that one can point here whenever its owner
 * wants, and then there is only one.
 */
const React = require('react');

const SvgMock = React.forwardRef((props, ref) =>
  React.createElement('SvgMock', { ...props, ref })
);
SvgMock.displayName = 'SvgMock';

module.exports = SvgMock;
module.exports.default = SvgMock;
module.exports.ReactComponent = SvgMock;
