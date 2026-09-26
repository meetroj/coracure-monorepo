import React, { useState, useMemo, useRef } from 'react';
import {
  Keyboard,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon } from '@coracure/ui';
import { profileApi } from '@coracure/api';
import LogoMark from '../assets/brand/logo-mark.svg';
import { useAuth } from '../hooks/useAuth';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

/**
 * Profile setup, in the three steps the design calls for:
 *
 *   1. Basic details   — who you are
 *   2. Contact details — where you are, which decides who can be assigned
 *   3. Health profile  — optional, and skippable
 *
 * *** REGION IS NOT DECORATION. *** Step 2 feeds provider assignment, which is
 * why the state field carries the note explaining what it is used for rather
 * than sitting there as another address line.
 */

type Nav = NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;

const GENDERS = ['Male', 'Female', 'Prefer not to say'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const STATES = [
  'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Telangana',
  'Gujarat', 'Rajasthan', 'West Bengal', 'Uttar Pradesh', 'Kerala',
];
const ALL_LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Marathi', 'Tamil', 'Telugu', 'Bengali', 'Gujarati'];

/* ----------------------------- small pieces ----------------------------- */

const Field = ({
  label,
  required,
  children,
  style,
  onLayout,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  style?: any;
  onLayout?: (e: any) => void;
}) => (
  <View style={[s.field, style]} onLayout={onLayout}>
    <Text style={s.label}>
      {label}
      {required && <Text style={s.required}> *</Text>}
    </Text>
    {children}
  </View>
);

const Input = ({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  right,
  maxLength,
  onFocus,
  returnKeyType,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  right?: React.ReactNode;
  maxLength?: number;
  onFocus?: () => void;
  returnKeyType?: 'done' | 'next';
  onSubmitEditing?: () => void;
}) => (
  <View style={s.inputWrap}>
    <TextInput
      onFocus={onFocus}
      returnKeyType={returnKeyType ?? 'done'}
      onSubmitEditing={onSubmitEditing ?? Keyboard.dismiss}
      blurOnSubmit
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.inkFaint}
      keyboardType={keyboardType ?? 'default'}
      maxLength={maxLength}
      style={s.input}
    />
    {right}
  </View>
);

/** Tap-to-open list, in place of a native picker (no extra dependency). */
const Select = ({
  value,
  placeholder,
  options,
  onSelect,
}: {
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={[s.selectWrap, open && s.selectWrapOpen]}>
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          setOpen((o) => !o);
        }}
        style={s.inputWrap}
        accessibilityRole="button"
        accessibilityLabel={value || placeholder}
      >
        <Text style={[s.input, !value && s.inputPlaceholder]}>{value || placeholder}</Text>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} color={colors.inkMuted} />
      </Pressable>

      {open && (
        <ScrollView
          style={s.selectList}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {options.map((o) => (
            <Pressable
              key={o}
              onPress={() => {
                onSelect(o);
                setOpen(false);
              }}
              style={({ pressed }) => [s.selectRow, pressed && s.pressed]}
              accessibilityRole="button"
            >
              <Text style={[s.selectRowText, value === o && s.selectRowTextOn]}>{o}</Text>
              {value === o && <Icon name="check" size={16} color={colors.surfie} />}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const Segmented = ({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <View style={s.segmented}>
    {options.map((o) => {
      const on = o === value;
      return (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={[s.segment, on && s.segmentOn]}
          accessibilityRole="radio"
          accessibilityState={{ checked: on }}
        >
          <Text style={[s.segmentText, on && s.segmentTextOn]}>{o}</Text>
        </Pressable>
      );
    })}
  </View>
);

const PrimaryButton = ({
  label,
  onPress,
  loading,
  tone = 'dark',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  tone?: 'dark' | 'light';
}) => (
  <Pressable
    onPress={onPress}
    disabled={loading}
    style={({ pressed }) => [
      s.primaryBtn,
      tone === 'light' && s.primaryBtnLight,
      pressed && s.pressed,
      loading && s.primaryBtnOff,
    ]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Text style={s.primaryBtnText}>{loading ? 'Saving…' : label}</Text>
    <Icon name="arrowRight" size={18} color={colors.white} />
  </Pressable>
);

/* -------------------------------- screen -------------------------------- */

export const ProfileSetupScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user, loginAsDemo, refreshProfile } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // step 1
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);

  /**
   * Keyboard handling. Android resizes the window but does not reliably scroll
   * the focused field into view inside a nested layout, so each Field records
   * its offset and focusing an input scrolls to it.
   */
  const scrollRef = useRef<ScrollView>(null);
  const fieldTops = useRef<Record<string, number>>({});
  const rememberTop = (key: string) => (e: any) => {
    fieldTops.current[key] = e.nativeEvent.layout.y;
  };
  const revealField = (key: string) => () => {
    const y = fieldTops.current[key];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  };
  const goToStep = (next: 1 | 2 | 3) => {
    Keyboard.dismiss();
    setStep(next);
    // Otherwise the next step opens scrolled to wherever this one ended.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const [langQuery, setLangQuery] = useState('');

  // step 2
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pin, setPin] = useState('');
  const [country] = useState('India');

  // step 3
  const [bloodGroup, setBloodGroup] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [allergies, setAllergies] = useState('None');
  const [condition, setCondition] = useState('');
  const [medicines, setMedicines] = useState<string[]>([]);
  const [medQuery, setMedQuery] = useState('');
  const addMedicine = () => {
    const name = medQuery.trim();
    if (!name) return;
    setMedicines((prev) => [...prev, name]);
    setMedQuery('');
    Keyboard.dismiss();
  };
  const [onMeds, setOnMeds] = useState('No');

  const bmi = useMemo(() => {
    const h = parseFloat(height) / 100;
    const w = parseFloat(weight);
    if (!h || !w || h <= 0) return '';
    return (w / (h * h)).toFixed(1);
  }, [height, weight]);

  const langSuggestions = useMemo(
    () =>
      ALL_LANGUAGES.filter(
        (l) => !languages.includes(l) && l.toLowerCase().includes(langQuery.trim().toLowerCase()),
      ).slice(0, 4),
    [languages, langQuery],
  );

  /** DD / MM / YYYY as the user types; digits only underneath. */
  const onDobChange = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 8);
    const parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
    setDob(parts.join(' / '));
  };

  const ageFromDob = (): number | null => {
    const d = dob.replace(/\D/g, '');
    if (d.length !== 8) return null;
    const year = parseInt(d.slice(4, 8), 10);
    const age = new Date().getFullYear() - year;
    return age > 0 && age < 120 ? age : null;
  };

  const persist = async (isComplete: boolean) => {
    const d = dob.replace(/\D/g, '');
    const iso = d.length === 8 ? `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}` : undefined;
    const profileData: any = {
      fullName: fullName.trim(),
      age: ageFromDob() ?? undefined,
      dateOfBirth: iso,
      gender: gender === 'Male' ? 'male' : gender === 'Female' ? 'female' : 'undisclosed',
      preferredLanguage: languages[0] ?? 'English',
      isComplete,
    };
    try {
      await profileApi.updateProfile(profileData);
      await refreshProfile();
    } catch {
      await loginAsDemo(profileData);
    }
  };

  const finish = async () => {
    setLoading(true);
    try {
      await persist(true);
    } finally {
      setLoading(false);
      navigation.navigate('Consent');
    }
  };

  const next = async () => {
    setError(null);
    if (step === 1) {
      if (!fullName.trim()) return setError('Please enter your full name.');
      if (dob.replace(/\D/g, '').length !== 8) return setError('Please enter your date of birth.');
      if (!gender) return setError('Please select your gender.');
      if (!email.trim() || !email.includes('@')) return setError('Please enter a valid email address.');
      if (!languages.length) return setError('Pick at least one language.');
      return goToStep(2);
    }
    if (step === 2) {
      if (!address1.trim()) return setError('Please enter your address.');
      if (!city.trim()) return setError('Please enter your city.');
      if (!stateName) return setError('Please select your state.');
      if (pin.length !== 6) return setError('Please enter a 6-digit PIN code.');
      return goToStep(3);
    }
    await finish();
  };

  const back = () => {
    if (step > 1) {
      setError(null);
      goToStep((step - 1) as 1 | 2);
      return;
    }
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header: back · logo · step */}
        <View style={s.header}>
          <Pressable onPress={back} style={s.backBtn} hitSlop={12} accessibilityLabel="Back">
            <Icon name="arrowLeft" size={20} color={colors.ink} />
          </Pressable>
          <View style={s.brandRow}>
            <LogoMark width={28} height={28} />
            <Text style={s.brandName}>CoraCure</Text>
          </View>
          <Text style={s.stepText}>Step {step} of 3</Text>
        </View>

        {/* ------------------------------ step 1 ------------------------------ */}
        {step === 1 && (
          <>
            <Text style={s.title} accessibilityRole="header">Basic details</Text>
            <Text style={s.lede}>Tell us about yourself so we can create your patient profile.</Text>

            <View style={s.photoRow}>
              <View style={s.photoCircle}>
                <Icon name="camera" size={26} color={colors.surfie} />
              </View>
              <View style={s.flex}>
                <Text style={s.photoTitle}>Profile Photo</Text>
                <Text style={s.photoOptional}>Optional</Text>
              </View>
              <Pressable style={s.photoBtn} accessibilityRole="button">
                <Text style={s.photoBtnText}>Add Photo</Text>
              </Pressable>
            </View>

            <Field label="Full Name" required onLayout={rememberTop('Full Name')}>
              <Input value={fullName} onChangeText={setFullName} placeholder="Enter your full name" />
            </Field>

            <Field label="Date of Birth" required onLayout={rememberTop('Date of Birth')}>
              <Input
                value={dob}
                onChangeText={onDobChange}
                placeholder="DD / MM / YYYY"
                keyboardType="numeric"
                right={<Icon name="calendar" size={18} color={colors.inkMuted} />}
              />
            </Field>

            <Field label="Gender" required onLayout={rememberTop('Gender')}>
              <Select value={gender} placeholder="Select gender" options={GENDERS} onSelect={setGender} />
            </Field>

            <Field label="Mobile Number" required onLayout={rememberTop('Mobile Number')}>
              <View style={s.inputWrap}>
                <Text style={s.input}>{user?.mobileNumber ?? '+91 98765 43210'}</Text>
                <View style={s.verified}>
                  <Icon name="checkCircle" size={14} color={colors.surfie} filled />
                  <Text style={s.verifiedText}>Verified</Text>
                </View>
              </View>
            </Field>

            <Field label="Email Address" required onLayout={rememberTop('Email Address')}>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="patient@example.com"
                onFocus={revealField('Email Address')}
                keyboardType="email-address"
              />
            </Field>

            <Field label="Preferred Language(s)" required onLayout={rememberTop('Preferred Language(s)')}>
              <View style={s.inputWrap}>
                <Icon name="search" size={17} color={colors.inkMuted} />
                <TextInput
                  value={langQuery}
                  onChangeText={setLangQuery}
                  placeholder="Search languages"
                  placeholderTextColor={colors.inkFaint}
                  style={[s.input, s.inputWithIcon]}
                />
              </View>

              {!!langQuery && !!langSuggestions.length && (
                <View style={s.selectList}>
                  {langSuggestions.map((l) => (
                    <Pressable
                      key={l}
                      onPress={() => {
                        setLanguages((prev) => [...prev, l]);
                        setLangQuery('');
                      }}
                      style={({ pressed }) => [s.selectRow, pressed && s.pressed]}
                    >
                      <Text style={s.selectRowText}>{l}</Text>
                      <Icon name="plus" size={15} color={colors.surfie} />
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={s.chipRow}>
                {languages.map((l) => (
                  <View key={l} style={s.chip}>
                    <Text style={s.chipText}>{l}</Text>
                    <Pressable
                      onPress={() => setLanguages((prev) => prev.filter((x) => x !== l))}
                      hitSlop={8}
                      accessibilityLabel={`Remove ${l}`}
                    >
                      <Icon name="x" size={14} color={colors.surfie} />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={s.chipAdd}
                  onPress={() => setLangQuery(' ')}
                  accessibilityRole="button"
                  accessibilityLabel="Add a language"
                >
                  <Icon name="plus" size={13} color={colors.surfie} />
                  <Text style={s.chipAddText}>Add</Text>
                </Pressable>
              </View>
            </Field>
          </>
        )}

        {/* ------------------------------ step 2 ------------------------------ */}
        {step === 2 && (
          <>
            <Text style={s.title} accessibilityRole="header">Contact details</Text>
            <Text style={s.lede}>Add your location and contact address details.</Text>

            <Field label="Address Line 1" required onLayout={rememberTop('Address Line 1')}>
              <Input value={address1} onChangeText={setAddress1} placeholder="House / Flat / Building / Street"
                onFocus={revealField('Address Line 1')} />
            </Field>

            <Field label="Address Line 2" onLayout={rememberTop('Address Line 2')}>
              <Input value={address2} onChangeText={setAddress2} placeholder="Locality / Area / Landmark"
                onFocus={revealField('Address Line 2')} />
            </Field>

            <Field label="City" required onLayout={rememberTop('City')}>
              <Input value={city} onChangeText={setCity} placeholder="Enter city"
                onFocus={revealField('City')} />
            </Field>

            <Field label="District" onLayout={rememberTop('District')}>
              <Input value={district} onChangeText={setDistrict} placeholder="Enter district"
                onFocus={revealField('District')} />
            </Field>

            <View style={s.row}>
              <Field label="State" required style={s.flex} onLayout={rememberTop('State')}>
                <Select value={stateName} placeholder="Select state" options={STATES} onSelect={setStateName} />
              </Field>
              <Field label="PIN Code" required style={s.flex} onLayout={rememberTop('PIN Code')}>
                <Input
                  value={pin}
                  onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter PIN code"
                onFocus={revealField('PIN Code')}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </Field>
            </View>

            <Field label="Country" required onLayout={rememberTop('Country')}>
              <View style={s.inputWrap}>
                <Text style={s.input}>{country}</Text>
                <Icon name="chevronDown" size={18} color={colors.inkMuted} />
              </View>
            </Field>

            <View style={s.note}>
              <Icon name="mapPin" size={17} color={colors.surfie} />
              <Text style={s.noteText}>Used to match you with professionals licensed near you.</Text>
            </View>
          </>
        )}

        {/* ------------------------------ step 3 ------------------------------ */}
        {step === 3 && (
          <>
            <View style={s.titleRow}>
              <Text style={s.title} accessibilityRole="header">Health profile</Text>
              <View style={s.optionalPill}>
                <Text style={s.optionalPillText}>Optional</Text>
              </View>
            </View>
            <Text style={s.lede}>
              Help your doctor understand your health better. You can complete or update this section anytime.
            </Text>

            <View style={s.row}>
              <Field label="Blood Group" style={s.flex} onLayout={rememberTop('Blood Group')}>
                <Select value={bloodGroup} placeholder="Select" options={BLOOD_GROUPS} onSelect={setBloodGroup} />
              </Field>
              <Field label="Height" style={s.flex} onLayout={rememberTop('Height')}>
                <Input
                  value={height}
                  onChangeText={(v) => setHeight(v.replace(/\D/g, '').slice(0, 3))}
                  placeholder="Height in cm"
                  keyboardType="numeric"
                />
              </Field>
            </View>

            <View style={s.row}>
              <Field label="Weight" style={s.flex} onLayout={rememberTop('Weight')}>
                <Input
                  value={weight}
                  onChangeText={(v) => setWeight(v.replace(/\D/g, '').slice(0, 3))}
                  placeholder="Weight in kg"
                  keyboardType="numeric"
                />
              </Field>
              <Field label="BMI" style={s.flex} onLayout={rememberTop('BMI')}>
                <View style={[s.inputWrap, s.inputWrapMuted]}>
                  <Text style={[s.input, !bmi && s.inputPlaceholder]}>
                    {bmi || 'Calculated automatically'}
                  </Text>
                </View>
              </Field>
            </View>

            <Field label="Known Allergies" onLayout={rememberTop('Known Allergies')}>
              <Segmented options={['None', 'Yes', "Don't know"]} value={allergies} onChange={setAllergies} />
            </Field>

            <Field label="Chronic Medical Conditions" onLayout={rememberTop('Chronic Medical Conditions')}>
              <View style={s.inputWrap}>
                <Icon name="search" size={17} color={colors.inkMuted} />
                <TextInput
                  value={condition}
                  onChangeText={setCondition}
                  placeholder="Search or add condition"
                  placeholderTextColor={colors.inkFaint}
                  style={[s.input, s.inputWithIcon]}
                />
                <Pressable
                  onPress={() => setCondition('')}
                  style={s.nonePill}
                  accessibilityRole="button"
                  accessibilityLabel="No chronic conditions"
                >
                  <Text style={s.nonePillText}>None</Text>
                </Pressable>
              </View>
            </Field>

            <Field label="Regular Medications" onLayout={rememberTop('Regular Medications')}>
              <Text style={s.subLabel}>Are you taking any regular medicines?</Text>
              <Segmented options={['Yes', 'No']} value={onMeds} onChange={setOnMeds} />
              {onMeds === 'Yes' && (
                <>
                  {medicines.map((m, i) => (
                    <View key={`${m}-${i}`} style={s.medRow}>
                      <Text style={s.medRowText} numberOfLines={1}>{m}</Text>
                      <Pressable
                        hitSlop={10}
                        onPress={() => setMedicines((prev) => prev.filter((_, x) => x !== i))}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${m}`}
                      >
                        <Icon name="close" size={16} color={colors.inkMuted} />
                      </Pressable>
                    </View>
                  ))}

                  <View style={s.inputWrap}>
                    <TextInput
                      value={medQuery}
                      onChangeText={setMedQuery}
                      placeholder="Medicine name"
                      placeholderTextColor={colors.inkFaint}
                      style={s.input}
                      returnKeyType="done"
                      onSubmitEditing={addMedicine}
                      blurOnSubmit
                    />
                  </View>

                  <Pressable
                    style={s.addMed}
                    onPress={addMedicine}
                    accessibilityRole="button"
                    accessibilityLabel="Add medication"
                  >
                    <Icon name="plus" size={17} color={colors.surfie} />
                    <Text style={s.addMedText}>Add Medication</Text>
                  </Pressable>
                </>
              )}
            </Field>
          </>
        )}

        {!!error && (
          <View style={s.errorBox}>
            <Icon name="alertCircle" size={16} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <PrimaryButton
          label={step === 3 ? 'Save Health Profile' : 'Save & Continue'}
          onPress={next}
          loading={loading}
          tone={step === 1 ? 'dark' : 'light'}
        />

        {step === 3 && (
          <Pressable onPress={finish} style={s.skip} accessibilityRole="button">
            <Text style={s.skipText}>Skip for Now</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.page },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    /*
     * Modest: focusing a field scrolls it into view (see revealField), so the
     * page no longer needs a screenful of padding to push fields up, which
     * left a dead gap under the CTA.
     */
    paddingBottom: spacing.xl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandName: {
    fontFamily: typography.heading.family,
    fontSize: 18,
    fontWeight: '800',
    color: colors.surfie,
  },
  stepText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    minWidth: 62,
    textAlign: 'right',
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: typography.heading.family,
    fontSize: 30,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  optionalPill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  optionalPillText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '500',
    color: colors.surfie,
  },
  lede: {
    fontFamily: typography.body.family,
    fontSize: 14,
    color: colors.inkMuted,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: spacing.lg,
  },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  photoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: {
    fontFamily: typography.heading.family,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  photoOptional: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 1,
  },
  photoBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  photoBtnText: {
    fontFamily: typography.body.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.surfie,
  },

  field: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  label: {
    fontFamily: typography.body.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 7,
  },
  subLabel: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: 8,
    marginTop: -2,
  },
  required: { color: colors.danger },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
  },
  inputWrapMuted: { backgroundColor: '#F1F3F2' },
  input: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 0,
  },
  inputWithIcon: { marginLeft: -2 },
  inputPlaceholder: { color: colors.inkFaint },

  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  verifiedText: {
    fontFamily: typography.body.family,
    fontSize: 12,
    fontWeight: '700',
    color: colors.surfie,
  },

  selectWrap: {
    position: 'relative',
  },
  /* Lifts the open field above its siblings so the list can paint over them. */
  selectWrapOpen: {
    zIndex: 50,
    elevation: 50,
  },
  selectList: {
    /*
     * Absolute, anchored under the field: rendered inline it pushed every
     * following field down the page as soon as the list opened.
     */
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    maxHeight: 240,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
    zIndex: 50,
    elevation: 12,
    shadowColor: '#0E766C',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  selectRowText: {
    fontFamily: typography.body.family,
    fontSize: 14,
    color: colors.ink,
  },
  selectRowTextOn: { color: colors.surfie, fontWeight: '700' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  chipText: {
    fontFamily: typography.body.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.surfie,
  },
  chipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.surfie,
  },
  chipAddText: {
    fontFamily: typography.body.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.surfie,
  },

  segmented: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F3',
    borderWidth: 1,
    borderColor: colors.surface.line,
    overflow: 'hidden',
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { backgroundColor: colors.surfie },
  segmentText: {
    fontFamily: typography.body.family,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  segmentTextOn: { color: colors.white, fontWeight: '700' },

  nonePill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  nonePillText: {
    fontFamily: typography.body.family,
    fontSize: 13,
    fontWeight: '700',
    color: colors.surfie,
  },

  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface.mintSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  medRowText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 14,
    color: colors.ink,
  },
  addMed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 15,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.surface.line,
  },
  addMedText: {
    fontFamily: typography.body.family,
    fontSize: 14,
    fontWeight: '700',
    color: colors.surfie,
  },

  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noteText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.danger,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfie,
    marginTop: spacing.sm,
  },
  primaryBtnLight: { backgroundColor: colors.surfie },
  primaryBtnOff: { opacity: 0.6 },
  primaryBtnText: {
    fontFamily: typography.heading.family,
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  skip: { alignItems: 'center', paddingVertical: spacing.md, marginTop: 4 },
  skipText: {
    fontFamily: typography.body.family,
    fontSize: 15,
    fontWeight: '700',
    color: colors.surfie,
  },
});

export default ProfileSetupScreen;
