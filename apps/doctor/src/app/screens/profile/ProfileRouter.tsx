import React, { useState } from 'react';

import type { VerificationStatus } from '../../../data/doctor';
import { PendingStatusScreen, RejectedStatusScreen, ApprovedStatusScreen } from './AccountStatusScreens';
import { ProfileScreen } from './ProfileScreen';

/**
 * Verification gate for the Profile tab.
 *
 *   pending                      -> Pending Account Status
 *   rejected                     -> Rejected Account Status
 *   approved + !acknowledged     -> Account Approved (shown once)
 *   approved + acknowledged      -> full Profile
 *
 * The Profile tab stays selected for every one of these — the status screens
 * live inside the Profile flow, not as separate destinations.
 */
export const ProfileRouter = ({
  status,
  acknowledged,
  onAcknowledge,
  onLogout,
  onOpen,
  onContactAdmin,
  onResubmit,
}: {
  status: VerificationStatus;
  acknowledged: boolean;
  onAcknowledge: () => void;
  onLogout: () => void;
  onOpen: (key: string) => void;
  onContactAdmin: () => void;
  onResubmit: () => void;
}) => {
  // The status tabs are a preview control: they swap the state on screen so the
  // three account states can be reviewed without a backend. `status` remains
  // the real value and is what the app lands on.
  const [preview, setPreview] = useState<VerificationStatus | null>(null);
  const shown = preview ?? status;

  if (shown === 'pending') {
    return <PendingStatusScreen onContact={onContactAdmin} onSelectPhase={setPreview} />;
  }
  if (shown === 'rejected') {
    return (
      <RejectedStatusScreen
        onResubmit={onResubmit}
        onContact={onContactAdmin}
        onSelectPhase={setPreview}
      />
    );
  }
  if (!acknowledged || preview === 'approved') {
    return <ApprovedStatusScreen onAcknowledge={onAcknowledge} onSelectPhase={setPreview} />;
  }
  return <ProfileScreen onLogout={onLogout} onOpen={onOpen} />;
};

export default ProfileRouter;
