import React from 'react';

import { useStore } from '../../../state/store';
import { signOut } from '../../../state/actions';
import { useVerification } from '../../../data/verification';
import { Screen } from '../../../components/ui';
import { SkeletonRowList } from '../../../components/skeletons';
import { TabHeader } from '../../navigation/TabHeader';
import { AccountStatusScreen, verificationItems } from './AccountStatusScreens';
import { ProfileScreen } from './ProfileScreen';

/**
 * Account Status first, then the profile.
 *
 * After creating a profile — or whenever an administrator changes the account
 * state — the Profile tab shows Account Status (under review, changes
 * required or approved) until the doctor continues with "Go to Dashboard".
 * From then on it shows the full profile, whatever the review status, with
 * Account Status one row away.
 *
 * The status is the server's (`GET /me/doctor/credentials`), with the store's
 * memory standing in only until it answers, and re-read each time the tab
 * comes back into view.
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

  const live = useVerification();
  // The server's answer when it has one; what the store remembers until then.
  const status = live.status ?? (verification.status === 'notSubmitted' ? 'pending' : verification.status);
  if (!verification.acknowledged) {
    if (live.showSkeleton) {
      return (
        <Screen testID="route-loading">
          <TabHeader />
          <SkeletonRowList rows={4} avatar="none" />
        </Screen>
      );
    }
    return (
      <AccountStatusScreen
        status={status}
        acknowledged={verification.acknowledged}
        submittedAt={verification.submittedAt}
        rejectionReason={live.rejectionReason}
        items={live.items}
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
