import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput } from 'react-native';

import { colors, radius, spacing } from '../../../theme/brand';
import { typeStyles, fontWeight } from '../../../theme/typography';
import { Icon } from '../../../components/Icon';
import { Screen, Card, Button, StatusPill, Note } from '../../../components/ui';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Checkbox } from '../../../components/Checkbox';
import { toast } from '../../../components/Toast';
import { useStore } from '../../../state/store';
import { selectDoctor } from '../../../state/selectors';
import { addChangeRequest, setConsultationDuration, setConsultationFee, setPrivacy } from '../../../state/actions';
import { inr } from '../../../data/doctor';

/**
 * The Profile rows that are settings rather than modules.
 *
 * Each writes to the store, so the value shows everywhere it is used the
 * moment it is saved — Profile, Profile Details, Availability and earnings.
 * Screens with a Save button report unsaved changes (`onDirtyChange`) so the
 * route can ask before they are thrown away.
 */

/* ------------------------------ shared pieces ----------------------------- */

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
    style={({ pressed }) => [s.choice, !last && s.rule, pressed && s.pressed]}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    <View style={s.flex}>
      <Text style={s.choiceLabel}>{label}</Text>
      {!!hint && <Text style={s.choiceHint}>{hint}</Text>}
    </View>
    {selected ? <Icon name="checkCircle" size={20} color={colors.surfie} filled /> : <View style={s.emptyRing} />}
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
  <View style={[s.toggle, !last && s.rule]}>
    <View style={s.flex}>
      <Text style={s.choiceLabel}>{title}</Text>
      <Text style={s.choiceHint}>{subtitle}</Text>
    </View>
    <Switch
      testID={testID}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.surface.inputBorder, true: colors.paris }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.surface.inputBorder}
      accessibilityLabel={title}
    />
  </View>
);

/* ------------------------------ consultation fee --------------------------- */

const FEE_PRESETS = [499, 699, 899, 1199];
const FEE_MAX = 99999;

export const ConsultationFeeScreen = ({
  onBack,
  onSaved,
  onDirtyChange,
}: {
  onBack: () => void;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const saved = useStore((st) => st.profile.fee);
  const [fee, setFee] = useState(String(saved));
  const amount = Number(fee || 0);
  const dirty = amount !== saved;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  // a fee of zero is a mistake, not a free consultation
  const error = !fee ? 'Enter the fee.' : amount <= 0 ? 'The fee must be more than ₹0.' : amount > FEE_MAX ? `Enter at most ${inr(FEE_MAX)}.` : undefined;

  const save = () => {
    if (error) return;
    setConsultationFee(amount);
    toast.show(`Consultation fee set to ${inr(amount)}`);
    onSaved();
  };

  return (
    <Screen
      testID="consultation-fee"
      header={<ScreenHeader onBack={onBack} title="Consultation fee" subtitle="What a patient pays for one consultation with you." />}
      footer={<Button testID="save-fee" label="Save fee" disabled={!dirty || !!error} onPress={save} />}
    >
      <Card style={s.card}>
        <Text style={s.fieldLabel}>Amount</Text>
        <View style={[s.amountRow, !!error && s.amountRowInvalid]}>
          <Text style={s.rupee}>₹</Text>
          <TextInput
            testID="fee-input"
            value={fee}
            onChangeText={(t) => setFee(t.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, 5))}
            keyboardType="number-pad"
            returnKeyType="done"
            style={s.amountInput}
            accessibilityLabel="Consultation fee amount"
          />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : <Text style={s.help}>CoraCure does not deduct a platform fee — you keep the full amount.</Text>}
      </Card>

      <Text style={s.section}>Common amounts</Text>
      <Card style={s.listCard}>
        {FEE_PRESETS.map((p, i) => (
          <ChoiceRow key={p} testID={`fee-${p}`} label={inr(p)} selected={amount === p} onPress={() => setFee(String(p))} last={i === FEE_PRESETS.length - 1} />
        ))}
      </Card>
      <Text style={s.note}>A new fee applies to consultations booked after you save. Existing bookings keep their fee.</Text>
    </Screen>
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
  onSaved,
  onDirtyChange,
}: {
  onBack: () => void;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const saved = useStore((st) => st.availability.durationMin);
  const [minutes, setMinutes] = useState(saved);
  const dirty = minutes !== saved;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  return (
    <Screen
      testID="consultation-duration"
      header={<ScreenHeader onBack={onBack} title="Consultation duration" subtitle="How long one slot lasts. This sets how many slots fit your day." />}
      footer={
        <Button
          testID="save-duration"
          label="Save duration"
          disabled={!dirty}
          onPress={() => {
            setConsultationDuration(minutes);
            toast.show(`Consultations set to ${minutes} minutes`);
            onSaved();
          }}
        />
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
      <Text style={s.note}>The same setting as Availability › Consultation duration. Changing it does not move consultations already booked.</Text>
    </Screen>
  );
};

/* -------------------------------- bank details ----------------------------- */

export const BankDetailsScreen = ({ onBack, onRequestChange }: { onBack: () => void; onRequestChange: () => void }) => {
  const doctor = useStore(selectDoctor);
  return (
    <Screen
      testID="bank-details"
      header={<ScreenHeader onBack={onBack} title="Bank details" subtitle="Where your payouts are sent." />}
      footer={<Button testID="change-bank" label="Request a change" variant="secondary" onPress={onRequestChange} />}
    >
      <Card style={s.card}>
        <View style={s.bankHead}>
          <View style={s.bankIcon}>
            <Icon name="wallet" size={19} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.bankName}>HDFC Bank</Text>
            <Text style={s.choiceHint}>Savings account</Text>
          </View>
          <StatusPill label={doctor.bankVerified ? 'Verified' : 'Pending'} tone={doctor.bankVerified ? 'success' : 'warn'} />
        </View>
        {/* masked, always — the full number is never displayed back */}
        {[
          ['Account number', '•••• •••• 4417'],
          ['IFSC', 'HDFC0001234'],
          ['Account holder', doctor.name],
        ].map(([k, v], i, list) => (
          <View key={k} style={[s.kv, i === list.length - 1 && s.kvLast]}>
            <Text style={s.kvLabel}>{k}</Text>
            <Text style={s.kvValue}>{v}</Text>
          </View>
        ))}
      </Card>
      <Text style={s.note}>
        Bank details are verified by an administrator and cannot be edited directly. A change request pauses payouts until the new
        account is verified.
      </Text>
    </Screen>
  );
};

/* ----------------------------- privacy and security ------------------------ */

export const PrivacySecurityScreen = ({ onBack }: { onBack: () => void }) => {
  const privacy = useStore((st) => st.privacy);
  const mobile = useStore((st) => st.session.mobile);
  const masked = mobile.length === 10 ? `+91 ${mobile.slice(0, 2)}••• ••${mobile.slice(7)}` : 'your registered number';

  const change = (patch: Partial<typeof privacy>, message: string) => {
    setPrivacy(patch);
    toast.show(message, 'info');
  };

  return (
    <Screen testID="privacy" header={<ScreenHeader onBack={onBack} title="Privacy and security" subtitle="How you sign in and what is shared." />}>
      <Text style={s.section}>Sign-in</Text>
      <Card style={s.listCard}>
        <View style={s.toggle} accessible accessibilityLabel={`Sign-in method: one-time code sent to ${masked}`}>
          <View style={s.bankIcon}>
            <Icon name="lock" size={17} color={colors.surfie} />
          </View>
          <View style={s.flex}>
            <Text style={s.choiceLabel}>One-time code</Text>
            <Text style={s.choiceHint}>Sent by SMS to {masked} each time you sign in. There is no password.</Text>
          </View>
        </View>
      </Card>

      <Text style={s.section}>Visibility</Text>
      <Card style={s.listCard}>
        <ToggleRow
          testID="toggle-online"
          title="Show availability status"
          subtitle="Patients can see when you are available now"
          value={privacy.showOnline}
          onChange={(v) => change({ showOnline: v }, v ? 'Patients can see your availability' : 'Your availability is hidden from patients')}
        />
        <ToggleRow
          testID="toggle-analytics"
          title="Share usage analytics"
          subtitle="Helps improve the app. Never includes patient data."
          value={privacy.analytics}
          onChange={(v) => change({ analytics: v }, v ? 'Usage analytics on' : 'Usage analytics off')}
          last
        />
      </Card>
      <Text style={s.note}>Changes save as soon as you make them. Patient records follow the clinic’s retention policy and are not affected by these settings.</Text>
    </Screen>
  );
};

/* ------------------------------ request changes ---------------------------- */

export const CHANGEABLE = [
  'Name or qualification',
  'Speciality',
  'Medical registration number',
  'Languages spoken',
  'Profile photo',
  'About / bio',
  'Bank account',
] as const;

export const RequestChangesScreen = ({
  initialField,
  onBack,
  onSent,
  onDirtyChange,
}: {
  /** Pre-selected when opened from a specific row, e.g. Bank details. */
  initialField?: string;
  onBack: () => void;
  onSent: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) => {
  const requests = useStore((st) => st.profile.changeRequests);
  const [picked, setPicked] = useState<string[]>(initialField && (CHANGEABLE as readonly string[]).includes(initialField) ? [initialField] : []);
  const [note, setNote] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const dirty = note.trim().length > 0 || picked.join() !== (initialField ?? '');
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const toggle = (f: string) => setPicked((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
  const errors = {
    fields: picked.length === 0 ? 'Choose at least one detail to change.' : undefined,
    note: note.trim().length < 10 ? 'Describe the change (at least 10 characters).' : undefined,
  };

  const send = () => {
    if (errors.fields || errors.note) {
      setShowErrors(true);
      return;
    }
    addChangeRequest(picked, note.trim());
    toast.show('Change request sent to an administrator');
    onSent();
  };

  return (
    <Screen
      testID="request-changes"
      header={<ScreenHeader onBack={onBack} title="Request changes" subtitle="Ask an administrator to update a verified detail." />}
      footer={<Button testID="submit-request" label="Send request" onPress={send} />}
    >
      <Text style={s.section}>What needs to change?</Text>
      <Card style={[s.listCard, showErrors && !!errors.fields && s.cardInvalid]}>
        {CHANGEABLE.map((f, i) => (
          <View key={f} style={i < CHANGEABLE.length - 1 && s.rule}>
            <Checkbox testID={`field-${i}`} checked={picked.includes(f)} onToggle={() => toggle(f)}>
              {f}
            </Checkbox>
          </View>
        ))}
      </Card>
      {showErrors && !!errors.fields && <Text style={[s.error, s.errorOut]}>{errors.fields}</Text>}

      <Text style={s.section}>Details</Text>
      <Card style={[s.card, showErrors && !!errors.note && s.cardInvalid]}>
        <TextInput
          testID="request-note"
          value={note}
          onChangeText={(t) => setNote(t.slice(0, 500))}
          multiline
          placeholder="Describe what should change and why."
          placeholderTextColor={colors.inkFaint}
          style={s.noteInput}
          accessibilityLabel="Change request details"
        />
        <Text style={s.counter}>{note.length}/500</Text>
      </Card>
      {showErrors && !!errors.note && <Text style={[s.error, s.errorOut]}>{errors.note}</Text>}

      <Note icon="info">An administrator reviews each request. Supporting documents may be asked for.</Note>

      {requests.length > 0 && (
        <>
          <Text style={s.section}>Your requests</Text>
          <Card style={s.listCard}>
            {requests.map((r, i) => (
              <View key={r.id} testID={`change-${r.id}`} style={[s.toggle, i < requests.length - 1 && s.rule]}>
                <View style={s.flex}>
                  <Text style={s.choiceLabel}>{r.fields.join(', ')}</Text>
                  <Text style={s.choiceHint} numberOfLines={2}>
                    {r.at} · {r.note}
                  </Text>
                </View>
                <StatusPill label="Pending" tone="warn" />
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.85 },
  rule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },

  section: { ...typeStyles.sectionTitle, color: colors.ink, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { padding: spacing.lg },
  cardInvalid: { borderColor: colors.danger },
  listCard: { paddingVertical: 0, paddingHorizontal: spacing.md },
  note: { ...typeStyles.caption, color: colors.inkMuted, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  help: { ...typeStyles.caption, color: colors.inkMuted, marginTop: spacing.sm },
  error: { ...typeStyles.helper, color: colors.danger, marginTop: spacing.sm },
  errorOut: { marginHorizontal: spacing.lg },

  choice: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52, paddingVertical: spacing.sm },
  choiceLabel: { ...typeStyles.body, color: colors.ink },
  choiceHint: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  emptyRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.surface.inputBorder },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingVertical: spacing.sm },

  fieldLabel: { ...typeStyles.label, color: colors.inkMuted },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.surfie,
    marginTop: spacing.sm,
  },
  amountRowInvalid: { borderBottomColor: colors.danger },
  // the symbol and the digits share one box and no line height, so they sit level
  rupee: { ...typeStyles.inputSingle, fontFamily: typeStyles.metric.fontFamily, fontWeight: fontWeight.semibold, fontSize: 26, color: colors.ink },
  amountInput: { ...typeStyles.inputSingle, fontFamily: typeStyles.metric.fontFamily, fontWeight: fontWeight.semibold, fontSize: 26, flex: 1, height: 50, color: colors.ink },

  bankHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  bankIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  bankName: { ...typeStyles.name, color: colors.ink },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  kvLast: { borderBottomWidth: 0, paddingBottom: 0 },
  kvLabel: { ...typeStyles.caption, color: colors.inkMuted },
  kvValue: { ...typeStyles.bodySmall, color: colors.ink, flexShrink: 1, textAlign: 'right' },

  noteInput: { ...typeStyles.input, minHeight: 92, textAlignVertical: 'top', color: colors.ink, padding: 0 },
  counter: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'right', marginTop: spacing.xs },
});
