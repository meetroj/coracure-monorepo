import React, { useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';
import { Icon, type IconName } from './Icon';

/**
 * Shared furniture for the clinical screens — notes, prescription, templates,
 * case summary. They repeat the same patterns: a collapsible section with a
 * required flag, a text area with a live counter, and a compact patient strip.
 * Keeping them here means the "Required" badge and the counter behave the
 * same everywhere.
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
      <Text style={s.stripInitials}>{initials}</Text>
    </View>
    <View style={s.flex}>
      <Text style={s.stripName}>{name}</Text>
      <Text style={s.stripMeta}>{meta}</Text>
      {ids.map((id) => (
        <Text key={id} style={s.stripId}>
          {id}
        </Text>
      ))}
    </View>
    {!!action && !!onAction && (
      <Pressable
        testID="strip-action"
        onPress={onAction}
        hitSlop={8}
        style={({ pressed }) => [s.stripBtn, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityLabel={action}
      >
        <Text style={s.stripBtnText}>{action}</Text>
      </Pressable>
    )}
  </View>
);

/* -------------------------------- section --------------------------------- */

export const RequiredBadge = ({ required, done }: { required: boolean; done?: boolean }) =>
  done ? (
    <View style={s.doneBadge}>
      <Icon name="check" size={11} weight={3} color={colors.surfie} />
      <Text style={s.doneText}>Done</Text>
    </View>
  ) : (
    <Text style={[s.req, !required && s.reqOptional]}>{required ? 'Required' : 'Optional'}</Text>
  );

export const Section = ({
  icon,
  title,
  required,
  done,
  open,
  onToggle,
  children,
  testID,
  invalid,
}: {
  icon: IconName;
  title: string;
  required?: boolean;
  /** A required section that has been filled in shows "Done" instead. */
  done?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  testID?: string;
  /** Outlined in red after a save attempt left it empty. */
  invalid?: boolean;
}) => (
  <View style={[s.section, invalid && s.sectionInvalid]}>
    <Pressable
      testID={testID}
      onPress={onToggle}
      style={s.sectionHead}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${title}${required ? ', required' : ''}${done ? ', done' : ''}`}
    >
      <View style={s.sectionIcon}>
        <Icon name={icon} size={19} color={colors.surfie} />
      </View>
      <Text style={s.sectionTitle} numberOfLines={2}>
        {title}
      </Text>
      {required !== undefined && <RequiredBadge required={required} done={done} />}
      <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} color={colors.inkFaint} />
    </Pressable>
    {open && <View style={s.sectionBody}>{children}</View>}
  </View>
);

/* ------------------------------ text area -------------------------------- */

/**
 * A clinical text area: a real input, a live counter inside the box, and the
 * limit enforced as the doctor types rather than rejected on save.
 */
export const NoteInput = ({
  value,
  onChangeText,
  placeholder,
  max,
  testID,
  accessibilityLabel,
  minHeight = 96,
  editable = true,
  onBlur,
  invalid,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  max: number;
  testID?: string;
  accessibilityLabel: string;
  minHeight?: number;
  editable?: boolean;
  onBlur?: () => void;
  invalid?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[s.field, focused && s.fieldFocused, invalid && s.fieldInvalid, !editable && s.fieldReadOnly]}>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={(t) => onChangeText(t.slice(0, max))}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        multiline
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        style={[s.fieldText, { minHeight }]}
        accessibilityLabel={accessibilityLabel}
        textAlignVertical="top"
      />
      <Text style={[s.counter, value.length >= max && s.counterOver]}>
        {value.length}/{max}
      </Text>
    </View>
  );
};

export const Bullets = ({ items }: { items: string[] }) => (
  <View style={s.bullets}>
    {items.map((b, i) => (
      <View key={`${i}-${b}`} style={s.bullet}>
        <View style={s.bulletDot} />
        <Text style={s.bulletText}>{b}</Text>
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
  tone?: 'info' | 'warn' | 'danger';
  icon?: IconName;
  children: ReactNode;
  testID?: string;
}) => (
  <View testID={testID} style={[s.notice, tone === 'warn' && s.noticeWarn, tone === 'danger' && s.noticeDanger]}>
    <Icon
      name={icon}
      size={15}
      color={tone === 'warn' ? colors.warn : tone === 'danger' ? colors.danger : colors.surfie}
    />
    <Text style={[s.noticeText, tone === 'warn' && s.noticeTextWarn, tone === 'danger' && s.noticeTextDanger]}>
      {children}
    </Text>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
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
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  stripBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },

  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
  },
  sectionInvalid: { borderColor: colors.danger },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typeStyles.cardTitle, fontSize: 14, lineHeight: 19, flex: 1, color: colors.ink },
  sectionBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },

  req: { ...typeStyles.caption, color: colors.surfie },
  reqOptional: { color: colors.inkFaint, fontWeight: fontWeight.semibold },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
  },
  doneText: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },

  field: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  fieldFocused: { borderColor: colors.surfie },
  fieldInvalid: { borderColor: colors.danger },
  fieldReadOnly: { backgroundColor: colors.surface.page },
  fieldText: { ...typeStyles.input, color: colors.ink, padding: 0 },
  counter: { ...typeStyles.caption, alignSelf: 'flex-end', color: colors.inkFaint, marginTop: 4 },
  counterOver: { color: colors.danger, fontWeight: fontWeight.semibold },

  bullets: { gap: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.paris, marginTop: 8 },
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
  noticeDanger: { backgroundColor: colors.dangerSoft },
  noticeText: { ...typeStyles.caption, flex: 1, color: colors.surfie },
  noticeTextWarn: { color: colors.warn },
  noticeTextDanger: { color: colors.danger },
});
