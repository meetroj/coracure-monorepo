import { Alert } from 'react-native';

/**
 * The one confirmation dialog.
 *
 * Native on each platform — an iOS alert, a Material dialog on Android — so a
 * destructive question reads as the system asking, not as another card. It is
 * always two buttons: a safe cancel and the action, named for what it does
 * ("Remove", "End consultation"), never a bare "OK".
 */
export const confirm = ({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}) =>
  Alert.alert(
    title,
    message,
    [
      { text: cancelLabel, style: 'cancel', onPress: onCancel },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ],
    { cancelable: true, onDismiss: onCancel }
  );

/** Asked before leaving a form whose edits would be lost. */
export const confirmDiscard = (onDiscard: () => void, what = 'your changes') =>
  confirm({
    title: 'Discard changes?',
    message: `You have unsaved changes. If you leave now, ${what} will be lost.`,
    confirmLabel: 'Discard',
    cancelLabel: 'Keep editing',
    destructive: true,
    onConfirm: onDiscard,
  });

export default confirm;
