import React from 'react';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { colors } from '@coracure/brand';

export type IconName =
  | 'home' | 'calendar' | 'folder' | 'clock' | 'user' | 'bell' | 'settings'
  | 'chevronRight' | 'chevronDown' | 'search' | 'filter' | 'video' | 'phone'
  | 'inPerson' | 'wallet' | 'star' | 'shield' | 'shieldCheck' | 'checkCircle'
  | 'alertCircle' | 'alertTriangle' | 'banCircle' | 'headset' | 'lock' | 'logout'
  | 'plus' | 'copy' | 'trash' | 'idCard' | 'stethoscope' | 'language' | 'tag'
  | 'document' | 'arrowRight' | 'arrowLeft' | 'close' | 'message' | 'prescription'
  | 'heart' | 'globe' | 'clipboard' | 'camera' | 'mic' | 'refresh' | 'info'
  | 'mapPin' | 'send' | 'eye' | 'eyeOff' | 'check' | 'x' | 'menu' | 'edit'
  | 'download' | 'upload' | 'share' | 'emergency' | 'chat' | 'wifiOff' | 'chevronUp' | 'sparkles';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
};

export const Icon = ({ name, size = 22, color = colors.ink, filled = false }: Props) => {
  const s = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const solid = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8.5z" {...s} fill={solid} />}
      {name === 'calendar' && (
        <>
          <Rect x="3.5" y="5" width="17" height="15" rx="3" {...s} fill={solid} />
          <Path d="M8 3v4M16 3v4M3.5 10h17" {...s} stroke={filled ? colors.white : color} />
        </>
      )}
      {name === 'folder' && <Path d="M3.5 7a2 2 0 012-2h3.4a2 2 0 011.5.7l1 1.3h7.1a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2V7z" {...s} fill={solid} />}
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
      {name === 'bell' && <Path d="M18 16V11a6 6 0 10-12 0v5l-1.5 2.5h15L18 16zM10 20.5a2 2 0 004 0" {...s} />}
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
      {name === 'phone' && <Path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2.2 2A17 17 0 014.5 5.7a2 2 0 012-2.2z" {...s} />}
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
      {name === 'star' && <Path d="M12 4l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8L12 4z" {...s} fill={solid} />}
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

      {/* New patient icons */}
      {name === 'heart' && <Path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.8 7.8 7.8-7.7 1-1a5.5 5.5 0 000-7.8z" {...s} fill={solid} />}
      {name === 'globe' && (
        <>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" {...s} />
        </>
      )}
      {name === 'clipboard' && (
        <>
          <Path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" {...s} />
          <Rect x="8" y="2" width="8" height="4" rx="1" {...s} />
        </>
      )}
      {name === 'camera' && (
        <>
          <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" {...s} />
          <Circle cx="12" cy="13" r="4" {...s} />
        </>
      )}
      {name === 'mic' && (
        <>
          <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" {...s} />
          <Path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" {...s} />
        </>
      )}
      {name === 'refresh' && (
        <>
          <Path d="M23 4v6h-6M1 20v-6h6" {...s} />
          <Path d="M3.5 9a9 9 0 0114.8-3L23 10M1 14l4.6 4a9 9 0 0014.9-3" {...s} />
        </>
      )}
      {name === 'info' && (
        <>
          <Circle cx="12" cy="12" r="10" {...s} />
          <Path d="M12 16v-4M12 8h.01" {...s} />
        </>
      )}
      {name === 'mapPin' && (
        <>
          <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" {...s} />
          <Circle cx="12" cy="10" r="3" {...s} />
        </>
      )}
      {name === 'send' && <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...s} />}
      {name === 'eye' && (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" {...s} />
          <Circle cx="12" cy="12" r="3" {...s} />
        </>
      )}
      {name === 'eyeOff' && (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" {...s} />
          <Path d="M1 1l22 22" {...s} />
        </>
      )}
      {name === 'check' && <Path d="M20 6L9 17l-5-5" {...s} />}
      {name === 'x' && <Path d="M18 6L6 18M6 6l12 12" {...s} />}
      {name === 'menu' && <Path d="M3 12h18M3 6h18M3 18h18" {...s} />}
      {name === 'edit' && <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" {...s} />}
      {name === 'download' && <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" {...s} />}
      {name === 'upload' && <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" {...s} />}
      {name === 'share' && (
        <>
          <Circle cx="18" cy="5" r="3" {...s} />
          <Circle cx="6" cy="12" r="3" {...s} />
          <Circle cx="18" cy="19" r="3" {...s} />
          <Path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" {...s} />
        </>
      )}
      {name === 'emergency' && (
        <>
          <Path d="M12 2L2 22h20L12 2z" {...s} />
          <Path d="M12 9v4M12 17h.01" {...s} />
        </>
      )}
      {name === 'chat' && (
        <Path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" {...s} />
      )}
      {name === 'chevronUp' && <Path d="M18 15l-6-6-6 6" {...s} />}
      {name === 'sparkles' && (
        <>
          <Path d="M12 3l1.9 4.8L19 10l-4.1 3.2L16 18l-4-2.8L8 18l1.1-4.8L5 10l5.1-2.2L12 3z" {...s} fill={solid} />
          <Path d="M19 3l.7 1.8L21 5.5l-1.3 1L20 8l-1-1-1 1 .3-1.5-1.3-1 1.3-.7L19 3z" {...s} fill={solid} />
        </>
      )}
      {name === 'wifiOff' && (
        <>
          <Path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.58 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" {...s} />
        </>
      )}
    </Svg>
  );
};

export default Icon;
