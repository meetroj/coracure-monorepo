import { useState } from 'react';

import type { Doctor, ProviderCategory, VerificationStatus } from '../../api/types';
import { StatusBadge, type BadgeTone } from '../../ui';

/**
 * Provider vocabulary shared by every provider screen (requirements §19, §20).
 *
 * The backend's verification enum keeps its own names; the panel shows the
 * spec's words. `pending` reads as Submitted and `verified` as Approved.
 */
export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  pending: 'Submitted',
  under_review: 'Under review',
  changes_required: 'Changes required',
  verified: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

const VERIFICATION_TONE: Record<VerificationStatus, BadgeTone> = {
  pending: 'warning',
  under_review: 'info',
  changes_required: 'warning',
  verified: 'positive',
  rejected: 'danger',
  suspended: 'danger',
};

export const VERIFICATION_OPTIONS = (Object.keys(VERIFICATION_LABEL) as VerificationStatus[]).map((v) => ({
  value: v,
  label: VERIFICATION_LABEL[v],
}));

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <StatusBadge status={status} tone={VERIFICATION_TONE[status]} label={VERIFICATION_LABEL[status]} />;
}

/** §19: Active / Inactive / Suspended, derived from verification and listing. */
export type AccountStatus = 'active' | 'inactive' | 'suspended';

export const accountOf = (d: Pick<Doctor, 'verificationStatus' | 'isListed'>): AccountStatus =>
  d.verificationStatus === 'suspended' ? 'suspended' : d.isListed ? 'active' : 'inactive';

export const ACCOUNT_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export function AccountBadge({ doctor }: { doctor: Pick<Doctor, 'verificationStatus' | 'isListed'> }) {
  const a = accountOf(doctor);
  return <StatusBadge status={a} tone={a === 'active' ? 'positive' : a === 'suspended' ? 'danger' : 'neutral'} />;
}

export const CATEGORY_LABEL: Record<ProviderCategory, string> = {
  doctor: 'Doctor',
  paramedical: 'Paramedical professional',
  veterinary: 'Veterinary specialist',
};

/** Non-doctor providers do not get doctor-only wording or the signature step (§8, §17). */
export const isDoctor = (d: Pick<Doctor, 'category'>): boolean => (d.category ?? 'doctor') === 'doctor';

export const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
];

export const inr = (n?: number | null): string => (n == null ? '-' : `₹${n.toLocaleString('en-IN')}`);

/**
 * The provider's approved photo, or their initials until there is one (or if the
 * link has expired by the time the browser asks). The link is a short-lived
 * signed URL, so a stale one must degrade to initials, not a broken image.
 */
export function ProviderAvatar({
  name,
  photoUrl,
  size = 32,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoUrl) && !failed;
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={size === 32 ? undefined : { width: size, height: size, fontSize: Math.round(size / 2.6) }}
    >
      {showPhoto ? (
        <img
          className="avatar__img"
          src={photoUrl ?? undefined}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export const initials = (name: string): string =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
