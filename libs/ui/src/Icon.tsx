import React from 'react';
import Svg, { Path, Circle, Rect, Polyline } from 'react-native-svg';
import { colors } from '@coracure/brand';

/**
 * One icon family for the whole workspace: 24x24 grid, 1.8 stroke, round caps.
 * Adding an icon means adding a case here — never mixing in another set.
 *
 * The first block is the set the doctor app established, lifted unchanged so
 * the two apps cannot drift. The second block is what the patient screens
 * added.
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
  | 'chevronLeft'
  | 'chevronUp'
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
  | 'prescription'
  // -- added for the patient app ---------------------------------------------
  | 'heart'
  | 'heartPulse'
  | 'brain'
  | 'tooth'
  | 'bone'
  | 'eye'
  | 'sparkle'
  | 'activity'
  | 'chart'
  | 'pill'
  | 'upload'
  | 'refresh'
  | 'info'
  | 'check'
  | 'edit'
  | 'mapPin'
  | 'cross'
  | 'wifiOff';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  /** Fill variant for solid tab icons. */
  filled?: boolean;
};

export const Icon = ({ name, size = 22, color = colors.ink, filled = false }: Props) => {
  const s = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  const solid = filled ? color : 'none';
  /** Strokes drawn ON TOP of a filled shape have to invert or they vanish. */
  const onSolid = filled ? colors.white : color;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <Path
          d="M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1v-8.5z"
          {...s}
          fill={solid}
        />
      )}
      {name === 'calendar' && (
        <>
          <Rect x="3.5" y="5" width="17" height="15" rx="3" {...s} fill={solid} />
          <Path d="M8 3v4M16 3v4M3.5 10h17" {...s} stroke={onSolid} />
        </>
      )}
      {name === 'folder' && (
        <Path
          d="M3.5 7a2 2 0 012-2h3.4a2 2 0 011.5.7l1 1.3h7.1a2 2 0 012 2V17a2 2 0 01-2 2h-13a2 2 0 01-2-2V7z"
          {...s}
          fill={solid}
        />
      )}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} fill={solid} />
          <Path d="M12 7.5V12l3 2" {...s} stroke={onSolid} />
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
          <Path
            d="M19.4 14.5a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1v.3a2 2 0 11-4 0v-.2a1.6 1.6 0 00-2.8-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H3.4a2 2 0 110-4h.2a1.6 1.6 0 001.1-2.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 002.7-1.1V3.4a2 2 0 114 0v.2a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7h.3a2 2 0 110 4h-.2a1.6 1.6 0 00-1.5 1z"
            {...s}
          />
        </>
      )}
      {name === 'chevronRight' && <Path d="M9 5l7 7-7 7" {...s} />}
      {name === 'chevronDown' && <Path d="M5 9l7 7 7-7" {...s} />}
      {name === 'chevronLeft' && <Path d="M15 5l-7 7 7 7" {...s} />}
      {name === 'chevronUp' && <Path d="M5 15l7-7 7 7" {...s} />}
      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="6.5" {...s} />
          <Path d="M16 16l4 4" {...s} />
        </>
      )}
      {name === 'filter' && <Path d="M4 7h16M7 12h10M10 17h4" {...s} />}
      {name === 'video' && (
        <>
          <Rect x="3" y="6.5" width="12.5" height="11" rx="2.5" {...s} fill={solid} />
          <Path d="M15.5 11l5-2.8v7.6l-5-2.8z" {...s} fill={solid} />
        </>
      )}
      {name === 'phone' && (
        <Path
          d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2.2 2A17 17 0 014.5 5.7a2 2 0 012-2.2z"
          {...s}
          fill={solid}
        />
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
        <Path
          d="M12 4l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8L12 4z"
          {...s}
          fill={solid}
        />
      )}
      {name === 'shield' && (
        <Path
          d="M12 3l7.5 3.2V12c0 4.6-3.2 8.6-7.5 9.6C7.7 20.6 4.5 16.6 4.5 12V6.2L12 3z"
          {...s}
          fill={solid}
        />
      )}
      {name === 'shieldCheck' && (
        <>
          <Path
            d="M12 3l7.5 3.2V12c0 4.6-3.2 8.6-7.5 9.6C7.7 20.6 4.5 16.6 4.5 12V6.2L12 3z"
            {...s}
            fill={solid}
          />
          <Polyline points="8.8,12 11,14.2 15.3,9.9" {...s} stroke={onSolid} />
        </>
      )}
      {name === 'checkCircle' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} fill={solid} />
          <Polyline points="8.4,12.2 10.8,14.6 15.6,9.8" {...s} stroke={onSolid} />
        </>
      )}
      {name === 'alertCircle' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} fill={solid} />
          <Path d="M12 8v5" {...s} stroke={onSolid} />
          <Circle cx="12" cy="16" r="1" fill={onSolid} />
        </>
      )}
      {name === 'alertTriangle' && (
        <>
          <Path d="M12 4l8.5 15h-17L12 4z" {...s} fill={solid} />
          <Path d="M12 10v4" {...s} stroke={onSolid} />
          <Circle cx="12" cy="16.6" r="1" fill={onSolid} />
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
          <Rect x="4.5" y="10" width="15" height="10.5" rx="3" {...s} fill={solid} />
          <Path d="M8 10V7.5a4 4 0 118 0V10" {...s} />
        </>
      )}
      {name === 'logout' && (
        <Path
          d="M14 8V5.5a1.5 1.5 0 00-1.5-1.5h-6A1.5 1.5 0 005 5.5v13A1.5 1.5 0 006.5 20h6a1.5 1.5 0 001.5-1.5V16M10 12h10m0 0l-3-3m3 3l-3 3"
          {...s}
        />
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...s} />}
      {name === 'copy' && (
        <>
          <Rect x="8.5" y="8.5" width="11" height="11" rx="2.5" {...s} />
          <Path d="M15.5 8.5v-2a2 2 0 00-2-2h-7a2 2 0 00-2 2v7a2 2 0 002 2h2" {...s} />
        </>
      )}
      {name === 'trash' && (
        <Path
          d="M4.5 7h15M9.5 7V5.5a1.5 1.5 0 011.5-1.5h2a1.5 1.5 0 011.5 1.5V7m2 0v12a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 018 19V7"
          {...s}
        />
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
      {name === 'language' && (
        <Path
          d="M3.5 6h8M7.5 4v2M9.5 6c0 3.5-2.5 7-6 8.5M6 10c1 2 3 3.8 5 4.6M12.5 20l4-10 4 10M14 17h5"
          {...s}
        />
      )}
      {name === 'tag' && (
        <>
          <Path
            d="M4 11V5.5A1.5 1.5 0 015.5 4H11l8.5 8.5a2 2 0 010 2.8l-4.2 4.2a2 2 0 01-2.8 0L4 11z"
            {...s}
          />
          <Circle cx="8.5" cy="8.5" r="1.3" fill={color} stroke="none" />
        </>
      )}
      {name === 'document' && (
        <>
          <Path
            d="M6 3.5h7l5 5v12a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 015 20.5v-15A1.5 1.5 0 016.5 3.5z"
            {...s}
            fill={solid}
          />
          <Path d="M13 3.5v5h5M8.5 13h7M8.5 16.5h5" {...s} stroke={onSolid} />
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
      {name === 'message' && (
        <Path
          d="M20.5 12c0 4.1-3.8 7.5-8.5 7.5a10 10 0 01-2.8-.4L4.5 21l1.2-3.7A7 7 0 013.5 12C3.5 7.9 7.3 4.5 12 4.5s8.5 3.4 8.5 7.5z"
          {...s}
        />
      )}

      {/* -- patient additions ---------------------------------------------- */}
      {name === 'heart' && (
        <Path
          d="M12 20.3l-1.4-1.3C5.6 14.5 2.5 11.7 2.5 8.2A4.7 4.7 0 017.2 3.5c1.6 0 3.2.8 4.8 2.6 1.6-1.8 3.2-2.6 4.8-2.6a4.7 4.7 0 014.7 4.7c0 3.5-3.1 6.3-8.1 10.8L12 20.3z"
          {...s}
          fill={solid}
        />
      )}
      {name === 'heartPulse' && (
        <>
          <Path
            d="M12 20.3l-1.4-1.3C5.6 14.5 2.5 11.7 2.5 8.2A4.7 4.7 0 017.2 3.5c1.6 0 3.2.8 4.8 2.6 1.6-1.8 3.2-2.6 4.8-2.6a4.7 4.7 0 014.7 4.7c0 3.5-3.1 6.3-8.1 10.8L12 20.3z"
            {...s}
            fill={solid}
          />
          <Path d="M3.2 11.4h3.9l1.7-3 2.6 5.6 2-3.6h6.9" {...s} stroke={onSolid} />
        </>
      )}
      {name === 'brain' && (
        <>
          <Path
            d="M12 5.2a2.7 2.7 0 00-5 1.1 2.6 2.6 0 00-1.6 4.2A2.8 2.8 0 006 15.2a2.7 2.7 0 002.7 3.3c1.6 0 3.3-.9 3.3-2.6V5.2z"
            {...s}
          />
          <Path
            d="M12 5.2a2.7 2.7 0 015 1.1 2.6 2.6 0 011.6 4.2A2.8 2.8 0 0118 15.2a2.7 2.7 0 01-2.7 3.3c-1.6 0-3.3-.9-3.3-2.6"
            {...s}
          />
        </>
      )}
      {name === 'tooth' && (
        <Path
          d="M8 3.5c-2.4 0-3.8 1.9-3.8 4.6 0 2.1.7 3.4 1.2 5.6.4 1.7.4 3 .8 5 .2 1.1.7 1.8 1.5 1.8.9 0 1.3-.7 1.6-2.1l.8-3.6c.2-.8.6-1.2 1.4-1.2s1.2.4 1.4 1.2l.8 3.6c.3 1.4.7 2.1 1.6 2.1.8 0 1.3-.7 1.5-1.8.4-2 .4-3.3.8-5 .5-2.2 1.2-3.5 1.2-5.6 0-2.7-1.4-4.6-3.8-4.6-1.3 0-2.2.6-3.5.6S9.3 3.5 8 3.5z"
          {...s}
        />
      )}
      {name === 'bone' && (
        <Path
          d="M8.5 4.2A2.4 2.4 0 015 7.5a2.4 2.4 0 002.5 3.3l5 5A2.4 2.4 0 0015.5 19a2.4 2.4 0 003.5-3.3l-5-5A2.4 2.4 0 0011 5.2a2.4 2.4 0 00-2.5-1z"
          {...s}
        />
      )}
      {name === 'eye' && (
        <>
          <Path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" {...s} />
          <Circle cx="12" cy="12" r="3" {...s} />
        </>
      )}
      {name === 'sparkle' && (
        <>
          <Path
            d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7-4.7-1.8 4.7-1.8L12 3.5z"
            {...s}
            fill={solid}
          />
          <Path d="M18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" {...s} fill={solid} />
        </>
      )}
      {name === 'activity' && <Path d="M3 12h4l2.5-6 4 12 2.5-6h5" {...s} />}
      {name === 'chart' && (
        <>
          <Path d="M4 20V4M4 20h16" {...s} />
          <Rect x="7.5" y="12" width="3" height="5" rx="1" {...s} fill={solid} />
          <Rect x="12.5" y="8.5" width="3" height="8.5" rx="1" {...s} fill={solid} />
          <Rect x="17.5" y="10.5" width="3" height="6.5" rx="1" {...s} fill={solid} />
        </>
      )}
      {name === 'pill' && (
        <>
          <Rect
            x="2.6"
            y="8.6"
            width="18.8"
            height="6.8"
            rx="3.4"
            transform="rotate(-45 12 12)"
            {...s}
          />
          <Path d="M8.5 8.5l7 7" {...s} />
        </>
      )}
      {name === 'upload' && (
        <Path
          d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V16"
          {...s}
        />
      )}
      {name === 'refresh' && <Path d="M20 12a8 8 0 11-2.6-5.9M20 4v4.5h-4.5" {...s} />}
      {name === 'info' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...s} fill={solid} />
          <Path d="M12 11.5V16" {...s} stroke={onSolid} />
          <Circle cx="12" cy="8.3" r="1" fill={onSolid} />
        </>
      )}
      {name === 'check' && <Polyline points="5,12.5 9.5,17 19,7" {...s} />}
      {name === 'edit' && <Path d="M15.5 4.5l4 4L9 19l-5 1 1-5L15.5 4.5zM14 6l4 4" {...s} />}
      {name === 'mapPin' && (
        <>
          <Path d="M12 21.5s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" {...s} fill={solid} />
          <Circle cx="12" cy="10.2" r="2.6" {...s} stroke={onSolid} />
        </>
      )}
      {name === 'cross' && (
        <Path
          d="M9.6 3.5h4.8a1 1 0 011 1v4.1h4.1a1 1 0 011 1v4.8a1 1 0 01-1 1h-4.1v4.1a1 1 0 01-1 1H9.6a1 1 0 01-1-1v-4.1H4.5a1 1 0 01-1-1V9.6a1 1 0 011-1h4.1V4.5a1 1 0 011-1z"
          {...s}
          fill={solid}
        />
      )}
      {name === 'wifiOff' && (
        <>
          <Path
            d="M3 3l18 18M8.6 15.4a5 5 0 016.8 0M5.3 12.1a9.6 9.6 0 013.2-2.1m3.9-.6a9.6 9.6 0 015.9 2.7M2 8.8a15 15 0 015-3M11 5a15 15 0 0111 3.8"
            {...s}
          />
          <Circle cx="12" cy="19" r="1" fill={color} stroke="none" />
        </>
      )}
    </Svg>
  );
};

export default Icon;
