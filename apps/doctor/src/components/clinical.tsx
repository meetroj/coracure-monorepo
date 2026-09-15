import { typeStyles, fontWeight } from '../../../../libs/typography/src';
import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/brand';
import { Icon, type IconName } from './Icon';

/**
 * Shared furniture for the Module 9 clinical screens.
 *
 * These four surfaces — notes, prescription, templates, case summary — repeat
 * the same three patterns: a collapsible section with a required flag, a
 * character counter, and a compact patient strip. Keeping them here means the
 * "Required" badge and the counter behave identically everywhere.
 */

/* ------------------------------ patient strip ----------------------------- */

export const PatientStrip = ({
  initials,
  name,
  meta,
  ids,
  action,
  onAction,
}: {
  initials: string;
  name: string;
  meta: string;
  ids: string[];
  action?: string;
  onAction?: () => void;
}) => (
  <View style={s.strip}>
    <View style={s.stripAvatar}>
      <Text style={[typeStyles.body, s.stripInitials]}>{initials}</Text>
    </View>
    <View style={s.flex}>
      <Text style={[typeStyles.body, s.stripName]}>
        {name}
      </Text>
      <Text style={[typeStyles.body, s.stripMeta]}>
        {meta}
      </Text>
      {ids.map((id) => (
        <Text key={id} style={[typeStyles.body, s.stripId]}>
          {id}
        </Text>
      ))}
    </View>
    {!!action && (
      <Pressable
        onPress={onAction}
        hitSlop={8}
        style={s.stripBtn}
        accessibilityRole="button"
        accessibilityLabel={action}
      >
        <Text style={[typeStyles.body, s.stripBtnText]}>{action}</Text>
      </Pressable>
    )}
  </View>
);

/* -------------------------------- section --------------------------------- */

export const RequiredBadge = ({ required }: { required: boolean }) => (
  <Text style={[typeStyles.body, [s.req, !required && s.reqOptional]]}>{required ? 'Required' : 'Optional'}</Text>
);

export const Section = ({
  icon,
  title,
  required,
  open,
  onToggle,
  children,
  testID,
}: {
  icon: IconName;
  title: string;
  required?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  testID?: string;
}) => (
  <View style={s.section}>
    <Pressable
      testID={testID}
      onPress={onToggle}
      style={s.sectionHead}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={title}
    >
      <View style={s.sectionIcon}>
        <Icon name={icon} size={19} color={colors.surfie} />
      </View>
      {/* One line — a wrapped section heading pushed the chevron out of line. */}
      <Text style={[typeStyles.body, s.sectionTitle]} numberOfLines={1}>
        {title}
      </Text>
      {required !== undefined && <RequiredBadge required={required} />}
      <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} color={colors.inkFaint} />
    </Pressable>
    {open && <View style={s.sectionBody}>{children}</View>}
  </View>
);

/* ------------------------------ field + count ----------------------------- */

/**
 * A read-through of an entered value. The app has no text input primitive yet,
 * so this renders the captured content with its counter — the counter is real,
 * derived from the value, not a decorative label.
 */
export const FieldValue = ({
  value,
  placeholder,
  max,
}: {
  value: string;
  placeholder: string;
  max: number;
}) => (
  <View style={[s.field, !value && s.fieldEmpty]}>
    <Text style={[typeStyles.body, [s.fieldText, !value && s.fieldPlaceholder]]}>{value || placeholder}</Text>
    {/* the limit sits inside the box, not floating beneath it */}
    <Text style={[typeStyles.body, [s.counter, value.length > max && s.counterOver]]}>
      {value.length}/{max}
    </Text>
  </View>
);

export const Bullets = ({ items }: { items: string[] }) => (
  <View style={s.bullets}>
    {items.map((b) => (
      <View key={b} style={s.bullet}>
        <View style={s.bulletDot} />
        <Text style={[typeStyles.body, s.bulletText]}>{b}</Text>
      </View>
    ))}
  </View>
);

/* --------------------------------- notice --------------------------------- */

export const Notice = ({
  tone = 'info',
  icon = 'info',
  children,
  testID,
}: {
  tone?: 'info' | 'warn';
  icon?: IconName;
  children: ReactNode;
  testID?: string;
}) => (
  <View testID={testID} style={[s.notice, tone === 'warn' && s.noticeWarn]}>
    <Icon name={icon} size={14} color={tone === 'warn' ? colors.warn : colors.surfie} />
    <Text style={[typeStyles.body, [s.noticeText, tone === 'warn' && s.noticeTextWarn]]}>{children}</Text>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1 },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  stripAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripInitials: { ...typeStyles.avatar, color: colors.surfie },
  stripName: { ...typeStyles.name, color: colors.ink },
  stripMeta: { ...typeStyles.caption, color: colors.inkMuted },
  stripId: { ...typeStyles.caption, color: colors.inkFaint, marginTop: 1 },
  stripBtn: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  stripBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },

  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dialled back from the full section-title size — these read as card
  // headings inside a form, not as page-level headings.
  sectionTitle: { ...typeStyles.sectionTitle, fontSize: 13, lineHeight: 17, flex: 1, color: colors.ink },
  // starts under the heading, not under the icon
  sectionBody: { paddingLeft: 36 + spacing.sm + spacing.md, paddingRight: spacing.md, paddingBottom: spacing.md },

  req: { ...typeStyles.caption, color: colors.surfie },
  reqOptional: { color: colors.inkFaint, fontWeight: fontWeight.semibold },

  field: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.line,
    padding: spacing.md,
  },
  fieldEmpty: { backgroundColor: colors.white },
  fieldText: { ...typeStyles.input, color: colors.ink },
  fieldPlaceholder: { color: colors.inkFaint },
  counter: { ...typeStyles.number, alignSelf: 'flex-end', color: colors.inkFaint, marginTop: 5 },
  counterOver: { color: colors.danger, fontWeight: fontWeight.semibold },

  bullets: { gap: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.paris,
    marginTop: 7,
  },
  bulletText: { ...typeStyles.body, flex: 1, color: colors.inkMuted },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface.mint,
    borderRadius: 12,
  },
  noticeWarn: { backgroundColor: colors.warnSoft },
  noticeText: { ...typeStyles.caption, flex: 1, color: colors.surfie },
  noticeTextWarn: { color: colors.warn },
});
