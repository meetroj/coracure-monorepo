import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * How much of the window the keyboard covers, measured from its top edge to
 * the bottom of the window.
 *
 * The event's `height` is not enough on Android: an edge-to-edge window (the
 * default from Android 15) runs under the navigation bar, and the reported
 * height leaves that bar out — so a composer lifted by `height` alone still
 * sits a bar's height under the keys. The keyboard's top edge (`screenY`) is
 * exact on both platforms; `height` is the fallback when it is missing.
 *
 * iOS listens to the `Will` events so the lift animates with the keyboard
 * rather than snapping after it.
 */
export const keyboardOverlap = (e: KeyboardEvent) => {
  const end = e.endCoordinates;
  if (!end) return 0;
  if (typeof end.screenY === 'number' && end.screenY > 0) {
    return Math.max(0, Math.round(Dimensions.get('window').height - end.screenY));
  }
  return end.height ?? 0;
};

export const useKeyboardHeight = () => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setHeight(keyboardOverlap(e))
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
};
