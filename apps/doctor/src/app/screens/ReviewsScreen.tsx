import { typeStyles } from '../../../../../libs/typography/src';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme/brand';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/ui';
import { feedback, reviews, type Review } from '../../data/doctor';

/**
 * Reviews & Feedback — opened from the Dashboard feedback card.
 *
 * An internal, read-only screen: the doctor sees what patients said, and can
 * flag something inappropriate. There is deliberately no public reply, no
 * patient identity beyond initials, and no tab bar — it is a pushed detail
 * screen, not a tab.
 *
 * Amber (`colors.warn`) appears here for stars only. It is a functional
 * colour, never a third brand hue, and never on a control or a surface.
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
    <View
      accessibilityRole="image"
      accessibilityLabel={`${value} out of ${max} stars`}
      style={s.stars}
    >
      {row(colors.surface.line, true)}
      <View style={[s.starsOverlay, { width: pct }]}>{row(STAR_COLOUR, true)}</View>
    </View>
  );
};

/* -------------------------------- sections -------------------------------- */

const RatingOverview = () => (
  <View style={s.overview}>
    <View style={s.overviewLeft}>
      <Text style={[typeStyles.body, s.overviewLabel]}>Overall rating</Text>
      <Text style={[typeStyles.body, s.overviewValue]}>{feedback.rating}</Text>
      <Stars value={feedback.rating} size={17} />
      <Text style={[typeStyles.body, s.overviewMeta]}>Based on {feedback.reviews} reviews</Text>
    </View>

    <View style={s.overviewDivider} />

    <View style={s.dist}>
      {feedback.distribution.map((d) => (
        <View key={d.stars} style={s.distRow}>
          <Text style={[typeStyles.body, s.distStar]}>{d.stars}</Text>
          <Icon name="star" size={11} color={STAR_COLOUR} filled />
          <View style={s.distTrack}>
            <View style={[s.distFill, { width: `${d.percent}%` }]} />
          </View>
          <Text style={[typeStyles.body, s.distPct]}>{d.percent}%</Text>
        </View>
      ))}
    </View>
  </View>
);

const ReviewCard = ({
  review,
  onReport,
  first,
}: {
  review: Review;
  onReport: (id: string) => void;
  /** The first card carries the gap the removed sort row used to provide. */
  first?: boolean;
}) => (
  <View style={[s.review, first && s.reviewFirst]}>
    <View style={s.reviewHead}>
      <View style={s.reviewAvatar}>
        {review.initials ? (
          <Text style={[typeStyles.body, s.reviewInitials]}>{review.initials}</Text>
        ) : (
          <Icon name="user" size={22} color={colors.surfie} />
        )}
      </View>

      <View style={s.flex}>
        <View style={s.reviewTopRow}>
          <View style={s.reviewIdentity}>
            <View style={s.reviewNameRow}>
              <Text style={[typeStyles.body, s.reviewName]}>{review.label}</Text>
              <Icon name="checkCircle" size={16} color={colors.paris} filled />
              <Text style={[typeStyles.body, s.reviewVerified]}>Verified</Text>
            </View>
            <Stars value={review.stars} size={18} />
          </View>
          <View style={s.reviewMeta}>
            <Text style={[typeStyles.body, s.reviewDate]}>{review.dateLabel}</Text>
            <Text style={[typeStyles.body, s.reviewMode]}>{review.mode}</Text>
          </View>
        </View>

        {!!review.body && <Text style={[typeStyles.body, s.reviewBody]}>{review.body}</Text>}

        {review.tags.length > 0 && (
          <View style={s.reviewTags}>
            {review.tags.map((t) => (
              <View key={t} style={s.reviewTag}>
                <Text style={[typeStyles.body, s.reviewTagText]}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {review.reportable && (
          <Pressable
            onPress={() => onReport(review.id)}
            hitSlop={8}
            style={s.report}
            accessibilityRole="button"
            accessibilityLabel={`Report concern about the review from ${review.dateLabel}`}
          >
            <Icon name="flag" size={14} color={colors.inkMuted} />
            <Text style={[typeStyles.body, s.reportText]}>Report concern</Text>
          </Pressable>
        )}
      </View>
    </View>
  </View>
);

/* --------------------------------- screen --------------------------------- */

export const ReviewsScreen = ({
  onBack,
  onReport = () => undefined,
  onInfo = () => undefined,
}: {
  onBack: () => void;
  onReport?: (id: string) => void;
  onInfo?: () => void;
}) => {
  // Reviews are authored newest-first and stay that way — there is no sort
  // control, so nothing here reorders them.
  const visible = reviews;

  return (
    <Screen bottomInset>
      {/* --------------------------------- header -------------------------------- */}
      <View style={s.header}>
        <Pressable
            testID="back"
          onPress={onBack}
          hitSlop={10}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="arrowLeft" size={22} color={colors.ink} />
        </Pressable>

        <View style={s.flex}>
          <Text style={[typeStyles.body, s.title]}>Reviews &amp; Feedback</Text>
        </View>

        <Pressable
          onPress={onInfo}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="About reviews"
        >
          <Icon name="info" size={28} color={colors.surfie} />
        </Pressable>
      </View>

      <RatingOverview />

      {/* ------------------------------- review list ----------------------------- */}
      {visible.length === 0 ? (
        <View style={s.empty}>
          <Text style={[typeStyles.body, s.emptyText]}>No reviews match this filter yet.</Text>
        </View>
      ) : (
        visible.map((r, i) => (
          <ReviewCard key={r.id} review={r} onReport={onReport} first={i === 0} />
        ))
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },

  /* header */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backBtn: { paddingTop: 2 },
  title: { ...typeStyles.pageTitle, color: colors.ink },

  /* stars */
  stars: { position: 'relative', alignSelf: 'flex-start' },
  starRow: { flexDirection: 'row', gap: 1 },
  starsOverlay: { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },

  /* rating overview */
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
  overviewLeft: { width: 132 },
  overviewLabel: { ...typeStyles.label, color: colors.ink },
  overviewValue: { ...typeStyles.metric, color: colors.ink, marginTop: spacing.xs },
  overviewMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.sm },
  overviewDivider: { width: 1, backgroundColor: colors.surface.line },

  /* distribution */
  dist: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  distStar: { ...typeStyles.caption, color: colors.inkMuted, width: 8, textAlign: 'right' },
  distTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface.line,
    overflow: 'hidden',
    marginLeft: 2,
  },
  distFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.surfie },
  distPct: { ...typeStyles.caption, color: colors.inkMuted, width: 30, textAlign: 'right' },

  /* appreciation */
  sectionTitle: { ...typeStyles.sectionTitle, color: colors.ink, marginTop: spacing.xxl, marginBottom: spacing.md, marginHorizontal: spacing.lg },
  hScroll: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  appreciationCard: {
    width: 124,
    backgroundColor: colors.surface.selected,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  appreciationIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appreciationTag: { ...typeStyles.body, color: colors.ink },
  appreciationCount: { ...typeStyles.number, color: colors.surfie },

  /* review card */
  review: {
    backgroundColor: colors.surface.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surface.line,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  reviewFirst: { marginTop: spacing.xxl },
  reviewHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewInitials: { ...typeStyles.avatar, fontSize: 15, color: colors.surfie },
  reviewTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  reviewIdentity: { flex: 1, minWidth: 0, gap: 5 },
  reviewNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewName: { ...typeStyles.name, color: colors.ink, flexShrink: 1 },
  reviewVerified: { ...typeStyles.caption, color: colors.inkMuted, flexShrink: 1 },
  reviewMeta: { alignItems: 'flex-end', flexShrink: 0 },
  reviewDate: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'right' },
  reviewMode: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 3, textAlign: 'right' },
  reviewBody: { ...typeStyles.body, color: colors.ink, marginTop: spacing.md },
  reviewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  reviewTag: {
    backgroundColor: colors.surface.selected,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  reviewTagText: { ...typeStyles.status, color: colors.surfie },
  report: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    marginTop: spacing.md,
  },
  reportText: { ...typeStyles.body, color: colors.inkMuted },

  /* empty */
  empty: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xxxl, alignItems: 'center' },
  emptyText: { ...typeStyles.body, color: colors.inkMuted },
});

export default ReviewsScreen;
