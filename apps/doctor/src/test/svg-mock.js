/**
 * Jest mock for `*.svg` imports.
 *
 * Replaces `@nx/react-native/plugins/jest/svg-mock`, which does
 * `module.exports = 'SvgMock'` and then assigns `.ReactComponent` onto that
 * string — throwing "Cannot create property 'ReactComponent' on string".
 * Metro (via react-native-svg-transformer) is unaffected; this is test-only.
 */
const React = require('react');

const SvgMock = React.forwardRef((props, ref) =>
  React.createElement('SvgMock', { ...props, ref })
);
SvgMock.displayName = 'SvgMock';

module.exports = SvgMock;
module.exports.default = SvgMock;
module.exports.ReactComponent = SvgMock;
