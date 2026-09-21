import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * How much of the screen the keyboard is covering, in points. `0` when closed.
 *
 * `android:windowSoftInputMode="adjustResize"` is set in the manifest, but the
 * app draws edge to edge, and an edge-to-edge window is not resized — so
 * `KeyboardAvoidingView` has nothing to react to on Android and a composer or
 * a focused field simply ends up underneath the keyboard.
 *
 * Measuring is the reliable way out: keyboard heights differ by IME, by
 * language, and by whether a suggestion strip is showing, so the number has to
 * come from the event rather than a constant.
 *
 * iOS listens to the `Will` events so the lift animates with the keyboard
 * rather than snapping after it.
 */
export const useKeyboardHeight = () => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setHeight(e.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
};
