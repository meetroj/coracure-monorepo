import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Renders overlays — bottom sheets, action menus — at the root of the app,
 * above the navigator and the tab bar.
 *
 * Sheets used to be native `Modal`s. On iOS a native modal is its own view
 * controller, and a confirmation alert raised while one is closing is dropped
 * or dismissed with it; an overlay in the root view has no such race, so a
 * "Remove medicine?" confirm from a menu always appears.
 *
 * Outside a provider (a screen rendered on its own in a test) the content
 * renders in place, so nothing needs the provider to work.
 */
type PortalApi = { mount: (key: string, node: ReactNode) => void; unmount: (key: string) => void };

const PortalContext = createContext<PortalApi | null>(null);

export const PortalProvider = ({ children }: { children: ReactNode }) => {
  const [nodes, setNodes] = useState<[string, ReactNode][]>([]);

  const api = useMemo<PortalApi>(
    () => ({
      mount: (key, node) =>
        setNodes((list) => {
          const i = list.findIndex(([k]) => k === key);
          if (i === -1) return [...list, [key, node]];
          const next = list.slice();
          next[i] = [key, node];
          return next;
        }),
      unmount: (key) => setNodes((list) => list.filter(([k]) => k !== key)),
    }),
    []
  );

  return (
    <PortalContext.Provider value={api}>
      {children}
      {nodes.length > 0 && (
        // VoiceOver must not read the screen underneath an open sheet
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none" accessibilityViewIsModal>
          {nodes.map(([key, node]) => (
            <React.Fragment key={key}>{node}</React.Fragment>
          ))}
        </View>
      )}
    </PortalContext.Provider>
  );
};

let seq = 0;

export const Portal = ({ children }: { children: ReactNode }) => {
  const api = useContext(PortalContext);
  const key = useRef(`portal-${++seq}`).current;

  useEffect(() => {
    api?.mount(key, children);
  });

  useEffect(
    () => () => {
      api?.unmount(key);
    },
    [api, key]
  );

  return api ? null : <>{children}</>;
};

export default Portal;
