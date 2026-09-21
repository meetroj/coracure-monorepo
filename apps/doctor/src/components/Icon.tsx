import React from 'react';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { colors } from '../theme/brand';

/**
 * One icon family for the whole app: 24x24 grid, 1.8 stroke, round caps.
 * Adding an icon means adding a case here — never mixing in another set.
 */
export type IconName =
  | 'home'
  | 'calendar'
  | 'folder'
  | 'clock'
  | 'hourglass'
  | 'user'
  | 'bell'
  | 'settings'
  | 'chevronRight'
  | 'chevronDown'
  | 'search'
  | 'filter'
  | 'video'
  | 'phone'
  | 'inPerson'
  | 'wallet'
  | 'star'
  | 'shield'
  | 'shieldCheck'
  | 'check'
  | 'checkCircle'
  | 'alertCircle'
  | 'alertTriangle'
  | 'banCircle'
  | 'headset'
  | 'lock'
  | 'logout'
  | 'plus'
  | 'copy'
  | 'pencil'
  | 'trash'
  | 'idCard'
  | 'stethoscope'
  | 'language'
  | 'tag'
  | 'document'
  | 'arrowRight'
  | 'arrowLeft'
  | 'close'
  | 'message'
  | 'prescription'
  | 'notes'
  | 'tools'
  | 'pause'
  | 'info'
  | 'heart'
  | 'thumbsUp'
  | 'bookmark'
  | 'flag'
  | 'trendUp'
  | 'sort'
  | 'more'
  | 'moreVertical'
  | 'userPlus'
  | 'signal'
  | 'switchCamera'
  | 'mic'
  | 'micOff'
  | 'videoOff'
  | 'phoneOff'
  | 'chevronLeft'
  | 'download'
  | 'barChart'
  | 'reroute'
  | 'reply'
  | 'brain'
  | 'moon'
  | 'leaf'
  | 'sparkle'
  | 'wind'
  | 'anchor'
  | 'checklist'
  | 'flask'
  | 'link'
  | 'externalLink'
  | 'faceSmile'
  | 'faceNeutral'
  | 'faceFrown'
  | 'siren'
  | 'refresh'
  | 'chevronUp'
  | 'pageFold'
  | 'eye'
  | 'clip'
  | 'upload'
  | 'mail'
  | 'expand'
  | 'collapse';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Fill variant for solid tab icons. */
  filled?: boolean;
  /** Stroke weight. Raise it where a glyph has to carry emphasis on its own. */
  weight?: number;
};

export const Icon = ({ name, size = 22, color = colors.surfie, filled = false, weight = 1.8 }: Props) => {
  const s = { stroke: color, strokeWidth: weight, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const solid = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <Path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8.5z" {...s} fill={solid} />
      )}
      {name === 'calendar' && (
        <>
          <Rect x="3.5" y="5" width="17" height="15" rx="3" {...s} fill={solid} />
          <Path d="M8 3v4M16 3v4M3.5 10h17" {...s} stroke={filled ? colors.white : color} />
        </>
      )}
      {name === 'folder' && (
        <Path d="M3.5 7a2 2 0 012-2h3.4a2 2 0 011.5.7l1 1.3h7.1a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2V7z" {...s} fill={solid} />
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} fill={solid} />
          <Path d="M12 7.5V12l3 2" {...s} stroke={filled ? colors.white : color} />
        </>
      )}
      {/* The waiting-to-start counterpart of `clock`: money that has not begun
          moving yet, rather than money already in transit. */}
      {name === 'hourglass' && (
        <>
          <Path d="M7 3.5h10M7 20.5h10" {...s} />
          <Path d="M8 3.5v3.2a4 4 0 001.5 3.1L12 12l-2.5 2.2A4 4 0 008 17.3v3.2" {...s} />
          <Path d="M16 3.5v3.2a4 4 0 01-1.5 3.1L12 12l2.5 2.2a4 4 0 011.5 3.1v3.2" {...s} />
        </>
      )}
      {name === 'user' && (
        <>
          <Circle cx="12" cy="8" r="3.8" {...s} fill={solid} />
          <Path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" {...s} fill={solid} />
        </>
      )}
      {name === 'bell' && (
        <Path d="M18 16V11a6 6 0 10-12 0v5l-1.5 2.5h15L18 16zM10 20.5a2 2 0 004 0" {...s} />
      )}
      {name === 'settings' && (
        <>
          <Circle cx="12" cy="12" r="3" {...s} />
          <Path d="M19.4 14.5a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1v.3a2 2 0 11-4 0v-.2a1.6 1.6 0 00-2.8-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H3.4a2 2 0 110-4h.2a1.6 1.6 0 001.1-2.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 002.7-1.1V3.4a2 2 0 114 0v.2a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7h.3a2 2 0 110 4h-.2a1.6 1.6 0 00-1.5 1z" {...s} />
        </>
      )}
      {name === 'chevronRight' && <Path d="M9 5l7 7-7 7" {...s} />}
      {name === 'chevronDown' && <Path d="M5 9l7 7 7-7" {...s} />}
      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="6.5" {...s} />
          <Path d="M16 16l4 4" {...s} />
        </>
      )}
      {name === 'filter' && <Path d="M4 7h16M7 12h10M10 17h4" {...s} />}
      {name === 'video' && (
        <>
          <Rect x="3" y="6.5" width="12.5" height="11" rx="2.5" {...s} />
          <Path d="M15.5 11l5-2.8v7.6l-5-2.8z" {...s} />
        </>
      )}
      {name === 'phone' && (
        <Path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2.2 2A17 17 0 014.5 5.7a2 2 0 012-2.2z" {...s} />
      )}
      {name === 'inPerson' && (
        <>
          <Circle cx="9" cy="8" r="3.2" {...s} />
          <Path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" {...s} />
          <Path d="M16 8.2a3 3 0 010 5.6M18 19c0-2.2-.7-3.9-2-5" {...s} />
        </>
      )}
      {name === 'wallet' && (
        <>
          <Rect x="3.5" y="6" width="17" height="13" rx="3" {...s} />
          <Path d="M3.5 10h17M16.5 14.5h1.5" {...s} />
        </>
      )}
      {name === 'star' && (
        <Path d="M12 4l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8L12 4z" {...s} fill={solid} />
      )}
      {name === 'shield' && <Path d="M12 3l7.5 3.2V12c0 4.6-3.2 8.6-7.5 9.6C7.7 20.6 4.5 16.6 4.5 12V6.2L12 3z" {...s} fill={solid} />}
      {name === 'shieldCheck' && (
        <>
          <Path d="M12 3l7.5 3.2V12c0 4.6-3.2 8.6-7.5 9.6C7.7 20.6 4.5 16.6 4.5 12V6.2L12 3z" {...s} />
          <Polyline points="8.8,12 11,14.2 15.3,9.9" {...s} />
        </>
      )}
      {/* Bare tick, no enclosing circle — for use inside a container that
          already draws its own ring, where `checkCircle` would double up. */}
      {name === 'check' && <Polyline points="5,12.5 9.5,17 19,7.5" {...s} />}
      {name === 'checkCircle' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} fill={solid} />
          <Polyline points="8.4,12.2 10.8,14.6 15.6,9.8" {...s} stroke={filled ? colors.white : color} />
        </>
      )}
      {name === 'alertCircle' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} fill={solid} />
          <Path d="M12 8v5" {...s} stroke={filled ? colors.white : color} />
          <Circle cx="12" cy="16" r="1" fill={filled ? colors.white : color} />
        </>
      )}
      {name === 'alertTriangle' && (
        <>
          <Path d="M12 4l8.5 15h-17L12 4z" {...s} fill={solid} />
          <Path d="M12 10v4" {...s} stroke={filled ? colors.white : color} />
          <Circle cx="12" cy="16.6" r="1" fill={filled ? colors.white : color} />
        </>
      )}
      {name === 'banCircle' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} />
          <Path d="M6.2 6.2l11.6 11.6" {...s} />
        </>
      )}
      {name === 'headset' && (
        <>
          <Path d="M4.5 14v-2a7.5 7.5 0 0115 0v2" {...s} />
          <Rect x="3" y="13.5" width="4" height="6" rx="2" {...s} />
          <Rect x="17" y="13.5" width="4" height="6" rx="2" {...s} />
          <Path d="M19 19.5v.5a2 2 0 01-2 2h-2.5" {...s} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x="4.5" y="10" width="15" height="10.5" rx="3" {...s} />
          <Path d="M8 10V7.5a4 4 0 118 0V10" {...s} />
        </>
      )}
      {name === 'logout' && <Path d="M14 8V5.5a1.5 1.5 0 00-1.5-1.5h-6A1.5 1.5 0 005 5.5v13A1.5 1.5 0 006.5 20h6a1.5 1.5 0 001.5-1.5V16M10 12h10m0 0l-3-3m3 3l-3 3" {...s} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...s} />}
      {name === 'copy' && (
        <>
          <Rect x="8.5" y="8.5" width="11" height="11" rx="2.5" {...s} />
          <Path d="M15.5 8.5v-2a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2h2" {...s} />
        </>
      )}
      {name === 'trash' && <Path d="M4.5 7h15M9.5 7V5.5a1.5 1.5 0 011.5-1.5h2a1.5 1.5 0 011.5 1.5V7m2 0v12a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 018 19V7" {...s} />}
      {name === 'pencil' && (
        <Path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4.5 1 1-4.5L16.5 3.5z" {...s} fill={solid} />
      )}
      {name === 'idCard' && (
        <>
          <Rect x="3" y="5.5" width="18" height="13" rx="3" {...s} />
          <Circle cx="8.5" cy="11" r="2.2" {...s} />
          <Path d="M5.5 16c.5-1.6 1.7-2.4 3-2.4s2.5.8 3 2.4M14.5 10h4M14.5 13.5h3" {...s} />
        </>
      )}
      {name === 'stethoscope' && (
        <>
          <Path d="M6 3.5v5a4 4 0 008 0v-5" {...s} />
          <Path d="M10 16.5v-4" {...s} />
          <Circle cx="17.5" cy="15" r="2.5" {...s} />
          <Path d="M10 16.5a5 5 0 005 5c1.6 0 2.5-1.4 2.5-3.5" {...s} />
        </>
      )}
      {name === 'language' && <Path d="M3.5 6h8M7.5 4v2M9.5 6c0 3.5-2.5 7-6 8.5M6 10c1 2 3 3.8 5 4.6M12.5 20l4-10 4 10M14 17h5" {...s} />}
      {name === 'tag' && (
        <>
          <Path d="M4 11V5.5A1.5 1.5 0 015.5 4H11l8.5 8.5a2 2 0 010 2.8l-4.2 4.2a2 2 0 01-2.8 0L4 11z" {...s} />
          <Circle cx="8.5" cy="8.5" r="1.3" fill={color} stroke="none" />
        </>
      )}
      {name === 'document' && (
        <>
          <Path d="M6 3.5h7l5 5v12a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 015 20.5v-15A1.5 1.5 0 016.5 3.5z" {...s} />
          <Path d="M13 3.5v5h5M8.5 13h7M8.5 16.5h5" {...s} />
        </>
      )}
      {name === 'prescription' && (
        <>
          <Path d="M6 20V5h4.5a3.2 3.2 0 010 6.5H6" {...s} />
          <Path d="M10 11.5L18 20M18 12l-6.5 8" {...s} />
        </>
      )}
      {name === 'arrowRight' && <Path d="M5 12h13M13 6l6 6-6 6" {...s} />}
      {name === 'arrowLeft' && <Path d="M19 12H6M11 18l-6-6 6-6" {...s} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...s} />}
      {name === 'message' && <Path d="M20.5 12c0 4.1-3.8 7.5-8.5 7.5a10 10 0 01-2.8-.4L4.5 21l1.2-3.7A7 7 0 013.5 12C3.5 7.9 7.3 4.5 12 4.5s8.5 3.4 8.5 7.5z" {...s} />}
      {name === 'brain' && (
        <>
          <Path d="M12 5.5a3 3 0 00-5.5 1.7A2.8 2.8 0 004.5 10a2.8 2.8 0 001.4 2.4A2.8 2.8 0 007 17c.6.7 1.6 1.1 2.6.9A2.6 2.6 0 0012 19V5.5z" {...s} />
          <Path d="M12 5.5a3 3 0 015.5 1.7A2.8 2.8 0 0119.5 10a2.8 2.8 0 01-1.4 2.4A2.8 2.8 0 0117 17c-.6.7-1.6 1.1-2.6.9A2.6 2.6 0 0112 19" {...s} />
        </>
      )}
      {name === 'moon' && (
        <>
          <Path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z" {...s} />
          <Path d="M17 4.5v3M15.5 6h3" {...s} />
        </>
      )}
      {name === 'leaf' && (
        <>
          <Path d="M5 19c0-7 4.5-11 14-11 0 8-4 12-9.5 12A4.5 4.5 0 015 19z" {...s} />
          <Path d="M12 12.5c-2.5 1.7-4.5 4-5.5 6.5" {...s} />
        </>
      )}
      {name === 'sparkle' && (
        <>
          <Path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4z" {...s} />
          <Path d="M18 16l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z" {...s} />
        </>
      )}
      {name === 'wind' && <Path d="M4 9h9a2.5 2.5 0 10-2.5-2.5M4 13h13a2.5 2.5 0 11-2.5 2.5M4 17h6.5a2 2 0 112 2" {...s} />}
      {name === 'anchor' && (
        <>
          <Circle cx="12" cy="5.5" r="2" {...s} />
          <Path d="M12 7.5V20M8.5 11h7" {...s} />
          <Path d="M4.5 14.5a7.5 7.5 0 0015 0" {...s} />
        </>
      )}
      {name === 'checklist' && (
        <>
          <Polyline points="3.5,7 5,8.5 7.5,5.5" {...s} />
          <Polyline points="3.5,13 5,14.5 7.5,11.5" {...s} />
          <Polyline points="3.5,19 5,20.5 7.5,17.5" {...s} />
          <Path d="M11 7h9M11 13h9M11 19h9" {...s} />
        </>
      )}
      {name === 'clip' && (
        <Path d="M20 11.5l-8.2 8.2a4.5 4.5 0 01-6.4-6.4l8.5-8.5a3 3 0 014.3 4.3l-8.5 8.5a1.5 1.5 0 01-2.2-2.2l7.8-7.8" {...s} />
      )}
      {name === 'upload' && (
        <>
          <Path d="M12 16V4.5M8 8l4-3.5L16 8" {...s} />
          <Path d="M4.5 15v3a2 2 0 002 2h11a2 2 0 002-2v-3" {...s} />
        </>
      )}
      {name === 'mail' && (
        <>
          <Rect x="3" y="5.5" width="18" height="13" rx="2.5" {...s} fill={solid} />
          <Path d="M4 7l8 6 8-6" {...s} stroke={filled ? colors.white : color} />
        </>
      )}
      {name === 'expand' && (
        <>
          <Path d="M8 3H5a2 2 0 00-2 2v3" {...s} />
          <Path d="M21 8V5a2 2 0 00-2-2h-3" {...s} />
          <Path d="M3 16v3a2 2 0 002 2h3" {...s} />
          <Path d="M16 21h3a2 2 0 002-2v-3" {...s} />
        </>
      )}
      {name === 'collapse' && (
        <>
          <Path d="M8 3v3a2 2 0 01-2 2H3" {...s} />
          <Path d="M21 8h-3a2 2 0 01-2-2V3" {...s} />
          <Path d="M3 16h3a2 2 0 012 2v3" {...s} />
          <Path d="M16 21v-3a2 2 0 012-2h3" {...s} />
        </>
      )}
      {name === 'flask' && (
        <>
          <Path d="M10 3.5h4M10.5 3.5v6L5.5 18a2 2 0 001.8 3h9.4a2 2 0 001.8-3l-5-8.5v-6" {...s} />
          <Path d="M7.8 14.5h8.4" {...s} />
        </>
      )}
      {name === 'link' && (
        <Path d="M10 13.5a3.5 3.5 0 005 0l3-3a3.5 3.5 0 10-5-5l-1.2 1.2M14 10.5a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 105 5l1.2-1.2" {...s} />
      )}
      {name === 'externalLink' && (
        <>
          {/* box with its top-right corner open, and the arrow leaving through it */}
          <Path d="M13.5 4.5H5.5a1.5 1.5 0 00-1.5 1.5v12a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-8" {...s} />
          <Path d="M20 4l-8 8M14.5 4H20v5.5" {...s} />
        </>
      )}
      {(name === 'faceSmile' || name === 'faceNeutral' || name === 'faceFrown') && (
        <>
          {/* one face family: only the mouth changes, so the three states read
              as a scale rather than three unrelated glyphs */}
          <Circle cx="12" cy="12" r="8.5" {...s} />
          <Circle cx="9.2" cy="10" r="0.9" fill={color} stroke="none" />
          <Circle cx="14.8" cy="10" r="0.9" fill={color} stroke="none" />
          {name === 'faceSmile' && <Path d="M8.4 14a4.4 4.4 0 007.2 0" {...s} />}
          {name === 'faceNeutral' && <Path d="M8.8 14.6h6.4" {...s} />}
          {name === 'faceFrown' && <Path d="M8.4 15.6a4.4 4.4 0 017.2 0" {...s} />}
        </>
      )}
      {name === 'siren' && (
        <>
          <Path d="M7.5 15.5a4.5 4.5 0 019 0" {...s} />
          <Rect x="5" y="15.5" width="14" height="4" rx="1.6" {...s} />
          <Path d="M12 6.5V4.5M5.6 9.1L4.2 7.7M18.4 9.1l1.4-1.4" {...s} />
        </>
      )}
      {name === 'refresh' && (
        <>
          <Path d="M20 12a8 8 0 10-2.4 5.7" {...s} />
          <Path d="M20 6.5V12h-5.5" {...s} />
        </>
      )}
      {name === 'chevronUp' && <Polyline points="6,15 12,9 18,15" {...s} />}
      {name === 'pageFold' && (
        <>
          {/* a sheet with its top-right corner turned down */}
          <Path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" {...s} fill={solid} />
          <Path d="M14 3v5h5" {...s} stroke={filled ? colors.white : color} />
        </>
      )}
      {name === 'eye' && (
        <>
          <Path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" {...s} />
          <Circle cx="12" cy="12" r="2.8" {...s} />
        </>
      )}
      {name === 'reroute' && (
        <>
          <Circle cx="4.5" cy="12" r="1.8" fill={color} stroke="none" />
          <Path d="M6.5 12h3.5c2 0 3-2.5 5-2.5h4M6.5 12h3.5c2 0 3 2.5 5 2.5h4" {...s} />
          <Path d="M16.5 6.5L19.5 9.5 16.5 12.5" {...s} />
        </>
      )}
      {name === 'reply' && (
        <>
          <Path d="M9.5 7L4.5 12l5 5" {...s} />
          <Path d="M5 12h7.2c4.1 0 6.8 2.1 7.3 6-.1-6.2-3.1-9-7.3-9H9.5" {...s} />
        </>
      )}
      {name === 'pause' && (
        <>
          <Rect x="8" y="5.5" width="3" height="13" rx="1.5" fill={color} stroke="none" />
          <Rect x="13" y="5.5" width="3" height="13" rx="1.5" fill={color} stroke="none" />
        </>
      )}
      {name === 'info' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} />
          <Path d="M12 11v5" {...s} />
          <Circle cx="12" cy="8" r="1" fill={color} stroke="none" />
        </>
      )}
      {name === 'heart' && (
        <Path
          d="M12 20.3C6.6 16.6 3.6 13.5 3.6 10a4.4 4.4 0 018.4-1.7A4.4 4.4 0 0120.4 10c0 3.5-3 6.6-8.4 10.3z"
          {...s}
          fill={solid}
        />
      )}
      {name === 'thumbsUp' && (
        <Path
          d="M7.5 10.5L11 4.8c.5-.8 1.7-.5 1.8.4l.2 3.3h4.5a2 2 0 011.9 2.6l-1.8 6.2a2 2 0 01-1.9 1.4H7.5M4 10.5h3.5v8H4z"
          {...s}
          fill={solid}
        />
      )}
      {name === 'bookmark' && (
        <Path d="M6.5 4.5a2 2 0 012-2h7a2 2 0 012 2v17l-5.5-3.6-5.5 3.6z" {...s} fill={solid} />
      )}
      {name === 'flag' && (
        <>
          <Path d="M6 21V4" {...s} />
          <Path d="M6 4.8h10.5l-1.8 3.6 1.8 3.6H6" {...s} fill={solid} />
        </>
      )}
      {name === 'userPlus' && (
        <>
          <Circle cx="9.5" cy="8" r="3.6" {...s} />
          <Path d="M3 20c0-3.6 2.9-5.8 6.5-5.8s6.5 2.2 6.5 5.8" {...s} />
          <Path d="M18.5 7.5v6M15.5 10.5h6" {...s} />
        </>
      )}
      {name === 'signal' && (
        <>
          <Rect x="3.5" y="15" width="3" height="5" rx="1.2" fill={color} stroke="none" />
          <Rect x="9" y="11" width="3" height="9" rx="1.2" fill={color} stroke="none" />
          <Rect x="14.5" y="7" width="3" height="13" rx="1.2" fill={color} stroke="none" />
          <Rect x="20" y="4" width="3" height="16" rx="1.2" fill={color} stroke="none" opacity={0.3} />
        </>
      )}
      {name === 'switchCamera' && (
        <>
          <Path d="M3.5 9.5A2.5 2.5 0 016 7h2l1.4-2h5.2L16 7h2a2.5 2.5 0 012.5 2.5v7A2.5 2.5 0 0118 19H6a2.5 2.5 0 01-2.5-2.5z" {...s} />
          <Path d="M9.6 13a2.6 2.6 0 014.3-2M14.4 13a2.6 2.6 0 01-4.3 2" {...s} />
          <Path d="M13.9 9.2h1.6v1.6M10.1 16.8H8.5v-1.6" {...s} />
        </>
      )}
      {name === 'mic' && (
        <>
          <Rect x="9" y="3" width="6" height="10.5" rx="3" {...s} />
          <Path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" {...s} />
        </>
      )}
      {name === 'micOff' && (
        <>
          <Path d="M15 5.6A3 3 0 009 6v5M9 12.6a3 3 0 004.6 1.9" {...s} />
          <Path d="M5.5 11.5a6.5 6.5 0 009.6 5.7M18.5 11.5a6.4 6.4 0 01-.5 2.5M12 18v3" {...s} />
          <Path d="M4 3.5l16 17" {...s} />
        </>
      )}
      {name === 'videoOff' && (
        <>
          <Path d="M3 8.6a2 2 0 012-2h7.4M15.5 6.6h.5a2 2 0 011.5.7" {...s} />
          <Path d="M17 11l3.5-2.5v7.2" {...s} />
          <Path d="M17 15.4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V12" {...s} />
          <Path d="M4 3.5l16 17" {...s} />
        </>
      )}
      {name === 'phoneOff' && (
        <>
          <Path d="M4.2 14.6a15.6 15.6 0 01-1.6-2.5c-.6-1.3-.2-2.5.9-3.2A16.5 16.5 0 0112 6.6c.9 0 1.8.1 2.7.2" {...s} />
          <Path d="M18.4 8.2c.9.4 1.7.9 2.5 1.4 1.1.7 1.5 1.9.9 3.2-.3.6-.7 1.3-1.1 1.9" {...s} />
          <Path d="M8.6 11.9l-.5 2.4a1.3 1.3 0 01-1.6 1l-1.6-.4M15.4 11.9l.5 2.4a1.3 1.3 0 001.6 1l1.6-.4" {...s} />
          <Path d="M4 4.5l16 15" {...s} />
        </>
      )}
      {name === 'more' && (
        <>
          <Circle cx="5.5" cy="12" r="1.6" fill={color} stroke="none" />
          <Circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
          <Circle cx="18.5" cy="12" r="1.6" fill={color} stroke="none" />
        </>
      )}
      {/* Wrench — the self-help "tools" tab. */}
      {name === 'tools' && (
        <Path
          d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.8-3.8a6 6 0 01-7.9 7.9l-6.9 6.9a2.1 2.1 0 01-3-3l6.9-6.9a6 6 0 017.9-7.9l-3.8 3.8z"
          {...s}
          fill={solid}
        />
      )}
      {/* Notepad — ruled page, for "load from template". */}
      {name === 'notes' && (
        <>
          <Rect x="4.5" y="3.5" width="15" height="17" rx="2.5" {...s} fill={solid} />
          <Path d="M8 8.5h8M8 12h8M8 15.5h5" {...s} stroke={filled ? colors.white : color} />
        </>
      )}
      {name === 'moreVertical' && (
        <>
          <Circle cx="12" cy="5.5" r="1.6" fill={color} stroke="none" />
          <Circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
          <Circle cx="12" cy="18.5" r="1.6" fill={color} stroke="none" />
        </>
      )}
      {name === 'chevronLeft' && <Path d="M15 5l-7 7 7 7" {...s} />}
      {name === 'download' && (
        <>
          <Path d="M12 4v11M8 11.5l4 4 4-4" {...s} />
          <Path d="M4.5 18.5v1.2a1.3 1.3 0 001.3 1.3h12.4a1.3 1.3 0 001.3-1.3v-1.2" {...s} />
        </>
      )}
      {name === 'barChart' && (
        <>
          <Rect x="4" y="12.5" width="3.6" height="7" rx="1.4" fill={color} stroke="none" />
          <Rect x="10.2" y="5.5" width="3.6" height="14" rx="1.4" fill={color} stroke="none" />
          <Rect x="16.4" y="9.5" width="3.6" height="10" rx="1.4" fill={color} stroke="none" />
        </>
      )}
      {name === 'sort' && (
        <>
          <Path d="M7.5 20V4.8M7.5 4.8L4 8.3M7.5 4.8L11 8.3" {...s} />
          <Path d="M16.5 4v15.2M16.5 19.2L13 15.7M16.5 19.2L20 15.7" {...s} />
        </>
      )}
      {name === 'trendUp' && (
        <>
          <Path d="M4 16.5l5.2-5.2 3.2 3.2L20 7.5" {...s} />
          <Path d="M15 7.5h5v5" {...s} />
        </>
      )}
    </Svg>
  );
};

export default Icon;
