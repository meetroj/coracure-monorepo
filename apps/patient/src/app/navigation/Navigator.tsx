import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BackHandler, Platform } from 'react-native';

import {
  PUBLIC_ROUTES,
  isTabRoute,
  type Route,
  type RouteName,
  type RouteParams,
} from './routes';

/**
 * The navigator: a typed history stack with an auth gate.
 *
 * `navigate` pushes, `replace` swaps the top (used by the auth flow so nobody
 * can back into the OTP screen after signing in), `reset` starts a new stack,
 * and `back` pops. Android's hardware back button is wired to `back` so it
 * behaves the way the platform expects rather than closing the app from a
 * nested screen.
 */

type NavigatorValue = {
  route: Route;
  stack: readonly Route[];
  canGoBack: boolean;
  navigate: <K extends RouteName>(name: K, params?: RouteParams[K]) => void;
  replace: <K extends RouteName>(name: K, params?: RouteParams[K]) => void;
  reset: <K extends RouteName>(name: K, params?: RouteParams[K]) => void;
  back: () => boolean;
};

const NavigatorContext = createContext<NavigatorValue | null>(null);

export const useNavigator = (): NavigatorValue => {
  const ctx = useContext(NavigatorContext);
  if (!ctx) throw new Error('useNavigator must be used inside <NavigatorProvider>');
  return ctx;
};

/** The current route's params, typed to the route you name. */
export const useRouteParams = <K extends RouteName>(_name: K): RouteParams[K] => {
  const { route } = useNavigator();
  return route.params as RouteParams[K];
};

export const NavigatorProvider = ({
  initial = 'splash',
  isAuthenticated,
  children,
}: {
  initial?: RouteName;
  /**
   * The gate. A protected route is refused while this is false, which is what
   * stops a deep link or a stale stack from putting an unauthenticated user on
   * the dashboard.
   */
  isAuthenticated: boolean;
  children: ReactNode;
}) => {
  const [stack, setStack] = useState<Route[]>([
    { name: initial, params: undefined } as Route,
  ]);

  // Read inside callbacks that must not be re-created when auth flips.
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  const guard = useCallback(<K extends RouteName>(name: K): RouteName => {
    if (authRef.current) return name;
    if (PUBLIC_ROUTES.includes(name)) return name;
    // Refused rather than silently allowed. Sending them to the start of the
    // sign-in flow is the only safe destination.
    return 'login';
  }, []);

  const navigate = useCallback(
    <K extends RouteName>(name: K, params?: RouteParams[K]) => {
      const target = guard(name);
      setStack((s) => {
        const top = s[s.length - 1];
        // Re-tapping the active tab should not stack a duplicate.
        if (top?.name === target && isTabRoute(target)) return s;
        return [...s, { name: target, params } as Route];
      });
    },
    [guard],
  );

  const replace = useCallback(
    <K extends RouteName>(name: K, params?: RouteParams[K]) => {
      const target = guard(name);
      setStack((s) => [...s.slice(0, -1), { name: target, params } as Route]);
    },
    [guard],
  );

  const reset = useCallback(
    <K extends RouteName>(name: K, params?: RouteParams[K]) => {
      const target = guard(name);
      setStack([{ name: target, params } as Route]);
    },
    [guard],
  );

  const back = useCallback(() => {
    let popped = false;
    setStack((s) => {
      if (s.length <= 1) return s;
      popped = true;
      return s.slice(0, -1);
    });
    return popped;
  }, []);

  // Android: returning false lets the OS close the app, which is right only at
  // the root of the stack.
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) return false;
      setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
      return true;
    });
    return () => sub.remove();
  }, [stack.length]);

  const value = useMemo<NavigatorValue>(
    () => ({
      route: stack[stack.length - 1]!,
      stack,
      canGoBack: stack.length > 1,
      navigate,
      replace,
      reset,
      back,
    }),
    [stack, navigate, replace, reset, back],
  );

  return <NavigatorContext.Provider value={value}>{children}</NavigatorContext.Provider>;
};
