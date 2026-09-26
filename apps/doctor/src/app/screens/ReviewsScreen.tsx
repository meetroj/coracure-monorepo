import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles, fontWeight } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, EmptyState, StatusPill, SectionHeader } from '../../components/ui';
import { ScreenHeader, HeaderAction } from '../../components/ScreenHeader';
import { BottomSheet, SheetActions } from '../../components/BottomSheet';
import { confirm } from '../../components/confirm';
import { toast } from '../../components/Toast';
import { useStore } from '../../state/store';
import { reportReview } from '../../state/actions';
import { feedback, reviews, type Review } from '../../data/doctor';

/**
 * Reviews & Feedback — opened from the Dashboard feedback card.
 *
 * An internal, read-only screen: the doctor sees what patients said, and can
 * flag something inappropriate for CoraCure to review. There is no public
 * reply and no patient identity beyond initials.
 *
 * Amber (`colors.warn`) appears here for stars only — a functional colour,
 * never a third brand hue, and never on a control or a surface.
 */

const STAR_COLOUR = colors.warn;

export const REPORT_REASONS = [
  'Contains personal or identifying details',
  'Not about my consultation',
  'Abusive or offensive language',
  'Makes a false claim',
] as const;

/* --------------------------------- stars ---------------------------------- */

/**
 * Five stars with a partial fill, so 4.8 reads as four and four-fifths rather
 * than being rounded. The gold row is clipped to `value / max` of the width and
 * sits over a full grey row.
 */
export const Stars = ({ value, size = 15, max = 5 }: { value: number; size?: number; max?: number }) => {
  const row = (color: string, filled: boolean) => (
    <View style={s.starRow}>
      {Array.from({ length: max }, (_, i) => (
        <Icon key={i} name="star" size={size} color={color} filled={filled} />
      ))}
    </View>
  );
  const pct = `${Math.max(0, Math.min(1, value / max)) * 100}%` as const;
  return (
    <View accessibilityRole="image" accessibilityLabel={`${value} out of ${max} stars`} style={s.stars}>
      {row(colors.surface.line, true)}
      <View style={[s.starsOverlay, { width: pct }]}>{row(STAR_COLOUR, true)}</View>
    </View>
  );
};

/* -------------------------------- sections -------------------------------- */

const RatingOverview = () => (
  <View style={s.overview}>
    <View style={s.overviewLeft}>
      <Text style={s.overviewLabel}>Overall rating</Text>
      <Text style={s.overviewValue}>{feedback.rating}</Text>
      <Stars value={feedback.rating} size={17} />
      <Text style={s.overviewMeta}>Based on {feedback.reviews} reviews</Text>
    </View>
    <View style={s.overviewDivider} />
    <View style={s.dist}>
      {feedback.distribution.map((d) => (
        <View key={d.stars} style={s.distRow} accessible accessibilityLabel={`${d.stars} stars, ${d.percent} percent`}>
          <Text style={s.distStar}>{d.stars}</Text>
          <Icon name="star" size={11} color={STAR_COLOUR} filled />
          <View style={s.distTrack}>
            <View style={[s.distFill, { width: `${d.percent}%` }]} />
          </View>
          <Text style={s.distPct}>{d.percent}%</Text>
        </View>
      ))}
    </View>
  </View>
);

const ReviewCard = ({ review, reported, onReport }: { review: Review; reported?: string; onReport: () => void }) => (
  <View testID={`review-${review.id}`} style={s.review}>
    <View style={s.reviewHead}>
      <View style={s.reviewAvatar}>
        {review.initials ? <Text style={s.reviewInitials}>{review.initials}</Text> : <Icon name="user" size={22} color={colors.surfie} />}
      </View>
      <View style={s.flex}>
        <View style={s.reviewTopRow}>
          <View style={s.reviewIdentity}>
            <View style={s.reviewNameRow}>
              <Text style={s.reviewName}>{review.label}</Text>
              <Icon name="checkCircle" size={15} color={colors.paris} filled />
              {/* "Verified patient" already says it; the word is not repeated */}
              {!/verified/i.test(review.label) && <Text style={s.reviewVerified}>Verified</Text>}
            </View>
            <Stars value={review.stars} size={16} />
          </View>
          <View style={s.reviewMeta}>
            <Text style={s.reviewDate}>{review.dateLabel}</Text>
            <Text style={s.reviewMode}>{review.mode}</Text>
          </View>
        </View>

        {review.body ? <Text style={s.reviewBody}>{review.body}</Text> : <Text style={s.reviewNoBody}>Rated without a comment.</Text>}

        {review.tags.length > 0 && (
          <View style={s.reviewTags}>
            {review.tags.map((t) => (
              <View key={t} style={s.reviewTag}>
                <Text style={s.reviewTagText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {reported ? (
          <View style={s.reportedRow}>
            <StatusPill testID={`reported-${review.id}`} label="Reported · under review" tone="neutral" icon="flag" />
          </View>
        ) : (
          review.reportable && (
            <Pressable
              testID={`report-${review.id}`}
              onPress={onReport}
              hitSlop={8}
              style={s.report}
              accessibilityRole="button"
              accessibilityLabel={`Report concern about the review from ${review.dateLabel}`}
            >
              <Icon name="flag" size={14} color={colors.inkMuted} />
              <Text style={s.reportText}>Report concern</Text>
            </Pressable>
          )
        )}
      </View>
    </View>
  </View>
);

/* --------------------------------- screen --------------------------------- */

export const ReviewsScreen = ({ onBack }: { onBack: () => void }) => {
  const reports = useStore((st) => st.reviewReports);
  const [info, setInfo] = useState(false);
  const [reporting, setReporting] = useState<Review | null>(null);
  const [reason, setReason] = useState<string>('');

  const closeReport = () => {
    setReporting(null);
    setReason('');
  };

  const submitReport = () => {
    if (!reporting || !reason) return;
    const target = reporting;
    confirm({
      title: 'Report this review?',
      message: 'CoraCure’s team reviews the report. The patient is not told who reported it.',
      confirmLabel: 'Report',
      onConfirm: () => {
        reportReview(target.id, reason);
        closeReport();
        toast.show('Report sent for review');
      },
    });
  };

  // reviews are authored newest-first and stay that way — nothing reorders them
  return (
    <Screen
      testID="reviews"
      header={
        <ScreenHeader
          onBack={onBack}
          title="Reviews & Feedback"
          right={<HeaderAction testID="reviews-info" icon="info" label="About reviews" onPress={() => setInfo(true)} />}
        />
      }
    >
      <RatingOverview />

      {reviews.length === 0 ? (
        <EmptyState icon="star" title="No reviews yet" body="Reviews appear here after patients rate a completed consultation." />
      ) : (
        <>
          {/* the overview counts every review; this list is the newest few */}
          <SectionHeader title="Recent reviews" subtitle={`The latest ${reviews.length} of ${feedback.reviews}`} />
          <View style={s.list}>
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} reported={reports[r.id]} onReport={() => setReporting(r)} />
            ))}
          </View>
        </>
      )}

      <BottomSheet visible={info} title="About reviews" onClose={() => setInfo(false)} testID="reviews-info-sheet">
        {[
          ['checkCircle', 'Only patients who completed a consultation with you can leave a review.'],
          ['user', 'Reviews are anonymised. You see initials only when the patient allowed it.'],
          ['flag', 'You can report a review that breaks the guidelines. CoraCure’s team decides; reviews are never removed automatically.'],
        ].map(([icon, text]) => (
          <View key={text} style={s.infoRow}>
            <View style={s.infoIcon}>
              <Icon name={icon as 'user'} size={16} color={colors.surfie} />
            </View>
            <Text style={s.infoText}>{text}</Text>
          </View>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={!!reporting}
        title="Report concern"
        subtitle={reporting ? `Review from ${reporting.dateLabel}` : undefined}
        onClose={closeReport}
        testID="report-sheet"
        footer={<SheetActions testID="report" onCancel={closeReport} confirmLabel="Continue" onConfirm={submitReport} confirmDisabled={!reason} />}
      >
        <Text style={s.sheetLead}>What is wrong with this review?</Text>
        <View style={s.reasonBox}>
          {REPORT_REASONS.map((r, i) => {
            const on = reason === r;
            return (
              <Pressable
                key={r}
                testID={`reason-${i}`}
                onPress={() => setReason(r)}
                style={[s.reason, i < REPORT_REASONS.length - 1 && s.reasonRule, on && s.reasonOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.radioDot} />}</View>
                <Text style={[s.reasonText, on && s.reasonTextOn]}>{r}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },

  stars: { position: 'relative', alignSelf: 'flex-start' },
  starRow: { flexDirection: 'row', gap: 1 },
  starsOverlay: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },

  overview: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  overviewLeft: { width: 124 },
  overviewLabel: { ...typeStyles.label, color: colors.ink },
  overviewValue: { ...typeStyles.metric, color: colors.ink, marginTop: spacing.xs },
  overviewMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.sm },
  overviewDivider: { width: 1, backgroundColor: colors.surface.line },

  dist: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  distStar: { ...typeStyles.caption, color: colors.inkMuted, width: 9, textAlign: 'right' },
  distTrack: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.surface.line, overflow: 'hidden', marginLeft: 2 },
  distFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.surfie },
  distPct: { ...typeStyles.caption, color: colors.inkMuted, width: 34, textAlign: 'right' },

  list: { gap: spacing.md },
  review: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
  },
  reviewHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  reviewAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  reviewInitials: { ...typeStyles.avatar, lineHeight: undefined, color: colors.surfie },
  reviewTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  reviewIdentity: { flex: 1, minWidth: 0, gap: 5 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  reviewName: { ...typeStyles.name, color: colors.ink, flexShrink: 1 },
  reviewVerified: { ...typeStyles.caption, color: colors.inkMuted },
  reviewMeta: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '45%' },
  reviewDate: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'right' },
  reviewMode: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2, textAlign: 'right' },
  reviewBody: { ...typeStyles.body, color: colors.ink, marginTop: spacing.md },
  reviewNoBody: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: spacing.md, fontStyle: 'italic' },
  reviewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  reviewTag: { backgroundColor: colors.surface.selected, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  reviewTagText: { ...typeStyles.status, color: colors.surfie },
  report: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', marginTop: spacing.md, minHeight: 36 },
  reportText: { ...typeStyles.buttonSmall, color: colors.inkMuted },
  reportedRow: { alignItems: 'flex-end', marginTop: spacing.md },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  infoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  infoText: { ...typeStyles.body, color: colors.ink, flex: 1 },

  sheetLead: { ...typeStyles.body, color: colors.inkMuted, marginBottom: spacing.sm },
  reasonBox: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, overflow: 'hidden' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  reasonRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  reasonOn: { backgroundColor: colors.surface.mintSoft },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.surface.inputBorder, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.surfie },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surfie },
  reasonText: { ...typeStyles.body, color: colors.ink, flex: 1 },
  reasonTextOn: { fontWeight: fontWeight.medium },
});

export default ReviewsScreen;
