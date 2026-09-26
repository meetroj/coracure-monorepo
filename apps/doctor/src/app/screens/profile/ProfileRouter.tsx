import React from 'react';

import { useStore } from '../../../state/store';
import { signOut } from '../../../state/actions';
import { demoRegistration } from '../../../data/registration';
import { AccountStatusScreen, verificationItems } from './AccountStatusScreens';
import { ProfileScreen } from './ProfileScreen';

/**
 * Account Status first, then the profile.
 *
 * After creating a profile — or whenever an administrator changes the account
 * state — the Profile tab shows Account Status (under review, changes
 * required or approved) until the doctor continues with "Go to Dashboard".
 * From then on it shows the full profile, whatever the review status, with
 * Account Status one row away. In this frontend-only build the review is not
 * enforced; gating features on it is for the backend integration.
 *
 * The state comes from the store only. Testers move an account between states
 * with the hidden demo tools on the wordmark.
 */
export const ProfileRouter = ({
  onOpen,
  onAcknowledge,
  onGetSupport,
  onResubmit,
}: {
  onOpen: (key: ProfileDestination) => void;
  onAcknowledge: () => void;
  onGetSupport: () => void;
  onResubmit: () => void;
}) => {
  const verification = useStore((s) => s.verification);
  const submission = useStore((s) => s.submission);
  const mobile = useStore((s) => s.session.mobile);

  const status = verification.status === 'notSubmitted' ? 'pending' : verification.status;
  if (!verification.acknowledged) {
    return (
      <AccountStatusScreen
        status={status}
        acknowledged={verification.acknowledged}
        submittedAt={verification.submittedAt}
        items={verificationItems(status, submission ?? demoRegistration(mobile))}
        onAcknowledge={onAcknowledge}
        onGetSupport={onGetSupport}
        onResubmit={onResubmit}
        onLogout={signOut}
      />
    );
  }
  return <ProfileScreen onOpen={onOpen} />;
};

export type ProfileDestination =
  | 'accountStatus'
  | 'profileDetails'
  | 'requestChanges'
  | 'fee'
  | 'duration'
  | 'availability'
  | 'earnings'
  | 'reviews'
  | 'bank'
  | 'notifications'
  | 'help'
  | 'privacy';

export default ProfileRouter;
