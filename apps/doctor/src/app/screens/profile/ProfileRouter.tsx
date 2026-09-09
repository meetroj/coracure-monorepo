import React from 'react';

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
  if (status === 'pending') return <PendingStatusScreen onContact={onContactAdmin} />;
  if (status === 'rejected') return <RejectedStatusScreen onResubmit={onResubmit} onContact={onContactAdmin} />;
  if (!acknowledged) return <ApprovedStatusScreen onAcknowledge={onAcknowledge} />;
  return <ProfileScreen onLogout={onLogout} onOpen={onOpen} />;
};

export default ProfileRouter;
