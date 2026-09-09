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
  | 'checkCircle'
  | 'alertCircle'
  | 'alertTriangle'
  | 'banCircle'
  | 'headset'
  | 'lock'
  | 'logout'
  | 'plus'
  | 'copy'
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
  | 'prescription';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Fill variant for solid tab icons. */
  filled?: boolean;
};

export const Icon = ({ name, size = 22, color = colors.ink, filled = false }: Props) => {
  const s = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
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
    </Svg>
  );
};

export default Icon;
