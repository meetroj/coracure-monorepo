import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput, Keyboard } from 'react-native';

import { messageFor } from '@coracure/api/errors';

import { colors, radius, spacing } from '../../../theme/brand';
import { typeStyles, fontWeight } from '../../../theme/typography';
import { Icon } from '../../../components/Icon';
import { Screen, Card, Button, StatusPill, Note } from '../../../components/ui';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Checkbox } from '../../../components/Checkbox';
import { toast } from '../../../components/Toast';
import { useStore } from '../../../state/store';
import { selectDoctor } from '../../../state/selectors';
import { addChangeRequest, setConsultationDuration, setPrivacy } from '../../../state/actions';
import { updateConsultationDuration } from '../../../data/profile';
import { CONSULTATION_DURATIONS, inr } from '../../../data/doctor';

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
    onPress={() => {
      Keyboard.dismiss();
      onPress();
    }}
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

/**
 * Read-only. `PATCH /me/doctor/profile` whitelists exactly four fields — bio,
 * languages, consultation duration, buffer minutes — and the fee is not one
 * of them (`API_CONTRACT.md` §7.2: "Name, qualification, registration number
 * and fee are the admin's, `PATCH /v1/admin/doctors/:id`"). A doctor-side save
 * button here would be a 400 on every press, so this shows the real fee and
 * routes a change through the same request-changes flow as the other
 * admin-only fields rather than pretending to accept an edit.
 */
export const ConsultationFeeScreen = ({
  onBack,
  onRequestChange,
}: {
  onBack: () => void;
  onRequestChange?: () => void;
}) => {
  const saved = useStore((st) => st.profile.fee);

  return (
    <Screen
      testID="consultation-fee"
      header={<ScreenHeader onBack={onBack} title="Consultation fee" subtitle="What a patient pays for one consultation with you." />}
      footer={onRequestChange ? <Button testID="request-fee-change" label="Request a change" variant="secondary" onPress={onRequestChange} /> : undefined}
    >
      <Card style={s.card}>
        <Text style={s.fieldLabel}>Amount</Text>
        <View style={s.amountRow}>
          <Text style={s.rupee}>₹</Text>
          <Text testID="fee-value" style={s.amountInput}>
            {saved}
          </Text>
        </View>
        <Text style={s.help}>CoraCure does not deduct a platform fee — you keep the full amount.</Text>
      </Card>
      <Note icon="info" style={s.note}>
        Your consultation fee is set by CoraCure, not edited here. Request a change and the team will update it.
      </Note>
    </Screen>
  );
};

/* --------------------------- consultation duration ------------------------- */

const DURATIONS = CONSULTATION_DURATIONS;

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
  const [saving, setSaving] = useState(false);
  const dirty = minutes !== saved;
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const save = async () => {
    setSaving(true);
    try {
      await updateConsultationDuration(minutes);
      setConsultationDuration(minutes);
      toast.show(`Consultations set to ${minutes} minutes`);
      onSaved();
    } catch (e) {
      toast.show(messageFor(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      testID="consultation-duration"
      header={<ScreenHeader onBack={onBack} title="Consultation duration" subtitle="How long one slot lasts. This sets how many slots fit your day." />}
      footer={<Button testID="save-duration" label="Save duration" disabled={!dirty || saving} loading={saving} onPress={save} />}
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

/**
 * *** NO ACCOUNT DETAILS, BECAUSE THE APP HAS NONE. *** The backend exposes
 * one fact about the payout account — `bankVerified` on the profile — and no
 * bank name, number or IFSC. The screen used to show a made-up HDFC account,
 * which a doctor would reasonably take as where their money goes.
 */
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
            <Text style={s.bankName}>Payout account</Text>
            <Text testID="bank-state" style={s.choiceHint}>
              {doctor.bankVerified ? 'Verified by the Coracure team' : 'Not verified yet'}
            </Text>
          </View>
          <StatusPill label={doctor.bankVerified ? 'Verified' : 'Not verified'} tone={doctor.bankVerified ? 'success' : 'warn'} />
        </View>
      </Card>
      <Text style={s.note}>
        Bank details are managed by the Coracure team. They are not shown or edited in the app — contact the team to add or change
        your payout account.
      </Text>
    </Screen>
  );
};

/* ----------------------------- privacy and security ------------------------ */

export const PrivacySecurityScreen = ({ onBack }: { onBack: () => void }) => {
  const privacy = useStore((st) => st.privacy);
  const mobile = useStore((st) => st.session.mobile);
  const masked = mobile.length === 10 ? `+91 ${mobile.slice(0, 2)}••• ••${mobile.slice(7)}` : 'your registered number';

  // These preferences have no backend yet: they are kept on this device, and
  // the copy says so rather than claiming an effect nothing applies.
  const change = (patch: Partial<typeof privacy>) => {
    setPrivacy(patch);
    toast.show('Saved on this device', 'info');
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
          subtitle="A preference kept on this device. It does not change what patients see."
          value={privacy.showOnline}
          onChange={(v) => change({ showOnline: v })}
        />
        <ToggleRow
          testID="toggle-analytics"
          title="Share usage analytics"
          subtitle="A preference kept on this device. Never includes patient data."
          value={privacy.analytics}
          onChange={(v) => change({ analytics: v })}
          last
        />
      </Card>
      <Text style={s.note}>These preferences are saved on this device only, not to your account. Patient records follow the clinic’s retention policy and are not affected by them.</Text>
    </Screen>
  );
};

/* ------------------------------ request changes ---------------------------- */

/** Bio and languages are absent: the doctor edits those in Profile Details. */
export const CHANGEABLE = [
  'Name or qualification',
  'Speciality',
  'Medical registration number',
  'Profile photo',
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
    // There is no change-request endpoint: the request is kept on this device,
    // and the toast says exactly that.
    addChangeRequest(picked, note.trim());
    toast.show('Request saved on this device');
    onSent();
  };

  return (
    <Screen
      testID="request-changes"
      header={<ScreenHeader onBack={onBack} title="Request changes" subtitle="Verified details are changed by the Coracure team." />}
      footer={<Button testID="submit-request" label="Save request" onPress={send} />}
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
          underlineColorAndroid="transparent"
        />
        <Text style={s.counter}>{note.length}/500</Text>
      </Card>
      {showErrors && !!errors.note && <Text style={[s.error, s.errorOut]}>{errors.note}</Text>}

      <Note icon="info">
        Requests are saved on this device and are not sent to Coracure automatically. To have a detail changed, contact the Coracure
        team through Help and support.
      </Note>

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
                <StatusPill label="Not sent" tone="warn" />
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

  bankHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bankIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  bankName: { ...typeStyles.name, color: colors.ink },

  noteInput: { ...typeStyles.input, minHeight: 92, textAlignVertical: 'top', color: colors.ink, padding: 0 },
  counter: { ...typeStyles.caption, color: colors.inkMuted, textAlign: 'right', marginTop: spacing.xs },
});
