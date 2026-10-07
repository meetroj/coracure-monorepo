import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '../../theme/brand';
import { typeStyles } from '../../theme/typography';
import { Icon } from '../../components/Icon';
import { Screen, EmptyState, SectionHeader } from '../../components/ui';
import { ScreenHeader, HeaderAction } from '../../components/ScreenHeader';
import { BottomSheet } from '../../components/BottomSheet';
import { SkeletonRowList, SectionError } from '../../components/skeletons';
import {
  channelLabel,
  consultedLabel,
  reviewerLabel,
  starShares,
  useFeedback,
  type DoctorFeedback,
  type DoctorFeedbackEntry,
} from '../../data/feedback';

/**
 * Reviews & Feedback — opened from the Dashboard feedback card and from Profile.
 *
 * Read-only, and only what the backend holds (`GET /v1/doctor/feedback`): a
 * rating from 1 to 5, an optional comment, and the consultation it was for.
 * There are no tags and no "report this review" here because the server has
 * neither — a button that only pretended to send a report would be worse than
 * none. A patient is shown by initials, never by name.
 *
 * Amber (`colors.warn`) appears here for stars only — a functional colour,
 * never a third brand hue, and never on a control or a surface.
 */

const STAR_COLOUR = colors.warn;

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

/** The figures here cover EVERY rating; the list below it is only the newest. */
const RatingOverview = ({ feedback }: { feedback: DoctorFeedback }) => {
  const average = feedback.averageRating ?? 0;
  return (
    <View testID="rating-overview" style={s.overview}>
      <View style={s.overviewLeft}>
        <Text style={s.overviewLabel}>Overall rating</Text>
        <Text testID="rating-average" style={s.overviewValue}>
          {average.toFixed(1)}
        </Text>
        <Stars value={average} size={17} />
        <Text testID="rating-count" style={s.overviewMeta}>
          Based on {feedback.ratingCount} {feedback.ratingCount === 1 ? 'review' : 'reviews'}
        </Text>
      </View>
      <View style={s.overviewDivider} />
      <View style={s.dist}>
        {starShares(feedback).map((d) => (
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
};

const ReviewCard = ({ entry }: { entry: DoctorFeedbackEntry }) => (
  <View testID={`review-${entry.consultationId}`} style={s.review}>
    <View style={s.reviewHead}>
      <View style={s.reviewAvatar}>
        {entry.patientInitials ? (
          <Text style={s.reviewInitials}>{entry.patientInitials}</Text>
        ) : (
          <Icon name="user" size={22} color={colors.surfie} />
        )}
      </View>
      <View style={s.flex}>
        <View style={s.reviewTopRow}>
          <View style={s.reviewIdentity}>
            <View style={s.reviewNameRow}>
              <Text style={s.reviewName}>{reviewerLabel(entry)}</Text>
              <Icon name="checkCircle" size={15} color={colors.paris} filled />
            </View>
            <Stars value={entry.rating} size={16} />
          </View>
          <View style={s.reviewMeta}>
            <Text style={s.reviewDate}>{consultedLabel(entry)}</Text>
            <Text style={s.reviewMode}>{channelLabel(entry)}</Text>
          </View>
        </View>

        {entry.comment ? (
          <Text style={s.reviewBody}>{entry.comment}</Text>
        ) : (
          <Text style={s.reviewNoBody}>Rated without a comment.</Text>
        )}
      </View>
    </View>
  </View>
);

/* --------------------------------- screen --------------------------------- */

export const ReviewsScreen = ({ onBack }: { onBack: () => void }) => {
  const { data, showSkeleton, error, retry } = useFeedback();
  const [info, setInfo] = useState(false);

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
      {showSkeleton ? (
        <SkeletonRowList rows={3} avatar="none" />
      ) : error ? (
        <SectionError testID="reviews-error" message="Could not load your reviews." onRetry={retry} />
      ) : !data ? null : (
        <>
          {/* shown at zero too - 0.0 and "0 reviews" - so the screen keeps its shape */}
          <RatingOverview feedback={data} />
          {data.ratingCount === 0 ? (
            <EmptyState icon="star" title="No reviews yet" body="Reviews appear here after patients rate a completed consultation." />
          ) : (
            <>
              {/* the overview counts every review; this list is the newest few */}
              <SectionHeader title="Recent reviews" subtitle={`The latest ${data.entries.length} of ${data.ratingCount}`} />
              <View style={s.list}>
                {data.entries.map((entry) => (
                  <ReviewCard key={entry.consultationId} entry={entry} />
                ))}
              </View>
            </>
          )}
        </>
      )}

      <BottomSheet visible={info} title="About reviews" onClose={() => setInfo(false)} testID="reviews-info-sheet">
        {[
          ['checkCircle', 'Only patients who completed a consultation with you can leave a review.'],
          ['user', 'You see a patient’s initials, never their name.'],
          ['star', 'The overall rating counts every review; the list shows the most recent ones.'],
        ].map(([icon, text]) => (
          <View key={text} style={s.infoRow}>
            <View style={s.infoIcon}>
              <Icon name={icon as 'user'} size={16} color={colors.surfie} />
            </View>
            <Text style={s.infoText}>{text}</Text>
          </View>
        ))}
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
  reviewMeta: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '45%' },
  reviewDate: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'right' },
  reviewMode: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 2, textAlign: 'right' },
  reviewBody: { ...typeStyles.body, color: colors.ink, marginTop: spacing.md },
  reviewNoBody: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: spacing.md, fontStyle: 'italic' },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  infoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface.selected, alignItems: 'center', justifyContent: 'center' },
  infoText: { ...typeStyles.body, color: colors.ink, flex: 1 },
});

export default ReviewsScreen;
