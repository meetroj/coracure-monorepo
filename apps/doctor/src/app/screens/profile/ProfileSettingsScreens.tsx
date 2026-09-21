import { typeStyles } from '../../../../../../libs/typography/src';
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../../theme/brand';
import { Icon } from '../../../components/Icon';
import { Screen, Card, Button, StatusPill, ListRow } from '../../../components/ui';
import { doctor, inr } from '../../../data/doctor';

/**
 * The Profile rows that are settings rather than modules.
 *
 * Each one is a real destination with a real control, not a placeholder: a row
 * that opens nothing reads as broken, and a row that opens an empty page reads
 * worse. Values live in component state because the app has no settings
 * backend yet — the screens save and return, and wiring `onSave` to an API
 * later does not change any of this layout.
 */

/* ------------------------------ shared frame ------------------------------ */

const DetailScreen = ({
  title,
  subtitle,
  onBack,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <Screen bottomInset>
    <View style={s.bar}>
      <Pressable
        testID="back"
        onPress={onBack}
        hitSlop={10}
        style={s.barBtn}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Icon name="arrowLeft" size={19} color={colors.ink} />
      </Pressable>
    </View>

    <View style={s.titleWrap}>
      <Text style={[typeStyles.body, s.title]}>{title}</Text>
      {!!subtitle && <Text style={[typeStyles.body, s.subtitle]}>{subtitle}</Text>}
    </View>

    {children}

    {footer}
  </Screen>
);

/** A radio-style option row — one choice at a time, tick on the right. */
const ChoiceRow = ({
  label,
  hint,
  selected,
  onPress,
  testID,
  last,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  last?: boolean;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={({ pressed }) => [s.choice, !last && s.choiceBorder, pressed && s.pressed]}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    <View style={s.flex}>
      <Text style={[typeStyles.body, s.choiceLabel]}>{label}</Text>
      {!!hint && <Text style={[typeStyles.body, s.choiceHint]}>{hint}</Text>}
    </View>
    {selected ? (
      <Icon name="checkCircle" size={20} color={colors.surfie} filled />
    ) : (
      <View style={s.emptyRing} />
    )}
  </Pressable>
);

const ToggleRow = ({
  title,
  subtitle,
  value,
  onChange,
  testID,
  last,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID?: string;
  last?: boolean;
}) => (
  <View style={[s.toggle, !last && s.choiceBorder]}>
    <View style={s.flex}>
      <Text style={[typeStyles.body, s.choiceLabel]}>{title}</Text>
      <Text style={[typeStyles.body, s.choiceHint]}>{subtitle}</Text>
    </View>
    <Switch
      testID={testID}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.surface.line, true: colors.paris }}
      thumbColor={colors.white}
      accessibilityLabel={title}
    />
  </View>
);

/* ------------------------------ consultation fee --------------------------- */

const FEE_PRESETS = [499, 699, 899, 1199];

export const ConsultationFeeScreen = ({
  onBack,
  onSave,
}: {
  onBack: () => void;
  onSave?: (fee: number) => void;
}) => {
  const [fee, setFee] = useState(String(doctor.consultationFee));
  const amount = Number(fee.replace(/[^\d]/g, ''));
  // A fee of zero is a mistake, not a free consultation — the save is gated
  // rather than silently accepting it.
  const valid = amount > 0;

  return (
    <DetailScreen
      title="Consultation fee"
      subtitle="What a patient pays for one consultation with you."
      onBack={onBack}
      footer={
        <View style={s.footer}>
          <Button
            testID="save-fee"
            label="Save fee"
            disabled={!valid}
            onPress={() => {
              onSave?.(amount);
              onBack();
            }}
          />
        </View>
      }
    >
      <Card style={s.card}>
        <Text style={[typeStyles.body, s.fieldLabel]}>Amount</Text>
        <View style={s.amountRow}>
          <Text style={[typeStyles.body, s.rupee]}>₹</Text>
          <TextInput
            testID="fee-input"
            value={fee}
            onChangeText={(t) => setFee(t.replace(/[^\d]/g, ''))}
            keyboardType="number-pad"
            style={[typeStyles.body, s.amountInput]}
            accessibilityLabel="Consultation fee amount"
          />
        </View>
        <Text style={[typeStyles.body, s.help]}>
          Coracure does not deduct a platform fee — you keep the full amount.
        </Text>
      </Card>

      <Text style={[typeStyles.body, s.section]}>Common amounts</Text>
      <Card style={s.listCard}>
        {FEE_PRESETS.map((p, i) => (
          <ChoiceRow
            key={p}
            testID={`fee-${p}`}
            label={inr(p)}
            selected={amount === p}
            onPress={() => setFee(String(p))}
            last={i === FEE_PRESETS.length - 1}
          />
        ))}
      </Card>
    </DetailScreen>
  );
};

/* --------------------------- consultation duration ------------------------- */

const DURATIONS = [
  { minutes: 15, hint: 'Short follow-ups' },
  { minutes: 30, hint: 'Standard consultation' },
  { minutes: 45, hint: 'Longer assessments' },
  { minutes: 60, hint: 'First psychiatric evaluation' },
];

export const ConsultationDurationScreen = ({
  onBack,
  onSave,
}: {
  onBack: () => void;
  onSave?: (minutes: number) => void;
}) => {
  const [minutes, setMinutes] = useState(doctor.consultationMinutes);

  return (
    <DetailScreen
      title="Consultation duration"
      subtitle="How long one slot lasts. This sets how many slots fit your day."
      onBack={onBack}
      footer={
        <View style={s.footer}>
          <Button
            testID="save-duration"
            label="Save duration"
            onPress={() => {
              onSave?.(minutes);
              onBack();
            }}
          />
        </View>
      }
    >
      <Card style={s.listCard}>
        {DURATIONS.map((d, i) => (
          <ChoiceRow
            key={d.minutes}
            testID={`duration-${d.minutes}`}
            label={`${d.minutes} minutes`}
            hint={d.hint}
            selected={minutes === d.minutes}
            onPress={() => setMinutes(d.minutes)}
            last={i === DURATIONS.length - 1}
          />
        ))}
      </Card>

      <Text style={[typeStyles.body, s.note]}>
        Changing this does not move consultations that are already booked.
      </Text>
    </DetailScreen>
  );
};

/* -------------------------------- bank details ----------------------------- */

export const BankDetailsScreen = ({
  onBack,
  onRequestChange,
}: {
  onBack: () => void;
  onRequestChange?: () => void;
}) => (
  <DetailScreen
    title="Bank details"
    subtitle="Where your payouts are sent."
    onBack={onBack}
    footer={
      <View style={s.footer}>
        <Button
          testID="change-bank"
          label="Request a change"
          variant="secondary"
          onPress={onRequestChange ?? onBack}
        />
      </View>
    }
  >
    <Card style={s.card}>
      <View style={s.bankHead}>
        <View style={s.bankIcon}>
          <Icon name="wallet" size={19} color={colors.surfie} />
        </View>
        <View style={s.flex}>
          <Text style={[typeStyles.body, s.bankName]}>HDFC Bank</Text>
          <Text style={[typeStyles.body, s.choiceHint]}>Savings account</Text>
        </View>
        <StatusPill label={doctor.bankVerified ? 'Verified' : 'Pending'} tone={doctor.bankVerified ? 'success' : 'warn'} />
      </View>

      {/* Masked, always. The full number is never displayed back in the app. */}
      <View style={s.kv}>
        <Text style={[typeStyles.body, s.kvLabel]}>Account number</Text>
        <Text style={[typeStyles.body, s.kvValue]}>•••• •••• 4417</Text>
      </View>
      <View style={s.kv}>
        <Text style={[typeStyles.body, s.kvLabel]}>IFSC</Text>
        <Text style={[typeStyles.body, s.kvValue]}>HDFC0001234</Text>
      </View>
      <View style={[s.kv, s.kvLast]}>
        <Text style={[typeStyles.body, s.kvLabel]}>Account holder</Text>
        <Text style={[typeStyles.body, s.kvValue]}>{doctor.name}</Text>
      </View>
    </Card>

    <Text style={[typeStyles.body, s.note]}>
      Bank details are verified by an administrator and cannot be edited directly.
      A change request pauses payouts until the new account is verified.
    </Text>
  </DetailScreen>
);

/* ----------------------------- privacy and security ------------------------ */

export const PrivacySecurityScreen = ({ onBack }: { onBack: () => void }) => {
  const [biometric, setBiometric] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  return (
    <DetailScreen
      title="Privacy and security"
      subtitle="Control how you sign in and what is shared."
      onBack={onBack}
    >
      <Text style={[typeStyles.body, s.section]}>Sign-in</Text>
      <Card style={s.listCard}>
        <ToggleRow
          testID="toggle-biometric"
          title="Biometric unlock"
          subtitle="Use fingerprint or face to open the app"
          value={biometric}
          onChange={setBiometric}
        />
        <ListRow compact icon="lock" title="Change password" subtitle="Last changed 3 months ago" onPress={onBack} last />
      </Card>

      <Text style={[typeStyles.body, s.section]}>Visibility</Text>
      <Card style={s.listCard}>
        <ToggleRow
          testID="toggle-online"
          title="Show availability status"
          subtitle="Patients can see when you are online"
          value={showOnline}
          onChange={setShowOnline}
        />
        <ToggleRow
          testID="toggle-analytics"
          title="Share usage analytics"
          subtitle="Helps improve the app. Never includes patient data."
          value={analytics}
          onChange={setAnalytics}
          last
        />
      </Card>

      <Text style={[typeStyles.body, s.note]}>
        Patient records are governed by the clinic's retention policy and are not
        affected by these settings.
      </Text>
    </DetailScreen>
  );
};

/* ------------------------------ request changes ---------------------------- */

const CHANGEABLE = [
  'Name or qualification',
  'Speciality',
  'Medical registration number',
  'Languages spoken',
  'Profile photo',
];

export const RequestChangesScreen = ({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit?: (fields: string[], note: string) => void;
}) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const toggle = (f: string) =>
    setPicked((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));

  return (
    <DetailScreen
      title="Request changes"
      subtitle="Ask an administrator to update a verified detail."
      onBack={onBack}
      footer={
        <View style={s.footer}>
          <Button
            testID="submit-request"
            label="Send request"
            // Nothing selected means nothing to ask for.
            disabled={picked.length === 0}
            onPress={() => {
              onSubmit?.(picked, note.trim());
              onBack();
            }}
          />
        </View>
      }
    >
      <Text style={[typeStyles.body, s.section]}>What needs to change?</Text>
      <Card style={s.listCard}>
        {CHANGEABLE.map((f, i) => {
          const on = picked.includes(f);
          return (
            <Pressable
              key={f}
              testID={`field-${i}`}
              onPress={() => toggle(f)}
              style={({ pressed }) => [s.choice, i < CHANGEABLE.length - 1 && s.choiceBorder, pressed && s.pressed]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <View style={[s.box, on && s.boxOn]}>
                {on && <Icon name="check" size={13} color={colors.white} />}
              </View>
              <Text style={[typeStyles.body, s.choiceLabel, s.flex]}>{f}</Text>
            </Pressable>
          );
        })}
      </Card>

      <Text style={[typeStyles.body, s.section]}>Details</Text>
      <Card style={s.card}>
        <TextInput
          testID="request-note"
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Describe what should change and why."
          placeholderTextColor={colors.inkFaint}
          style={[typeStyles.body, s.noteInput]}
          accessibilityLabel="Change request details"
        />
      </Card>

      <Text style={[typeStyles.body, s.note]}>
        You will be notified once an administrator reviews the request. Supporting
        documents may be requested.
      </Text>
    </DetailScreen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },

  bar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  barBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surface.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typeStyles.pageTitle, color: colors.ink },
  subtitle: { ...typeStyles.bodySmall, color: colors.inkMuted, marginTop: 3 },

  section: {
    ...typeStyles.sectionTitle,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: { padding: spacing.lg },
  listCard: { paddingVertical: 0, paddingHorizontal: 12 },
  note: {
    ...typeStyles.caption,
    color: colors.inkMuted,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  help: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.sm },
  footer: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  /* choice + toggle rows */
  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 13 },
  choiceBorder: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  choiceLabel: { ...typeStyles.body, color: colors.ink },
  choiceHint: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  emptyRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.surface.line },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 11 },
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surface.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.surfie, borderColor: colors.surfie },

  /* fee */
  fieldLabel: { ...typeStyles.label, color: colors.inkMuted },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.surfie,
    paddingBottom: 6,
    marginTop: spacing.sm,
  },
  rupee: { ...typeStyles.metric, color: colors.ink },
  amountInput: { ...typeStyles.metric, flex: 1, color: colors.ink, padding: 0 },

  /* bank */
  bankHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  bankIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: { ...typeStyles.name, color: colors.ink },
  kv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  kvLast: { borderBottomWidth: 0, paddingBottom: 0 },
  kvLabel: { ...typeStyles.caption, color: colors.inkMuted },
  kvValue: { ...typeStyles.bodySmall, color: colors.ink },

  /* request changes */
  noteInput: { minHeight: 92, textAlignVertical: 'top', color: colors.ink, padding: 0 },
});
