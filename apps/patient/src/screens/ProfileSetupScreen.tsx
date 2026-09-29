import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Keyboard,
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { pickImageFromLibrary } from '../utils/imagePicker';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography, radius } from '@coracure/brand';
import { Icon, Sheet } from '@coracure/ui';
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
const ALL_LANGUAGES = [
  'English', 'Hindi', 'Hinglish', 'Marathi', 'Kannada', 'Punjabi',
  'Tamil', 'Telugu', 'Bengali', 'Gujarati', 'Malayalam', 'Urdu',
];

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
      underlineColorAndroid="transparent"
    />
    {right}
  </View>
);

/**
 * Multi-pick in the doctor app's shape: a one-line scrolling chip row with an
 * "Add" control that opens a bottom sheet — search, the picked chips, a ticked
 * list, and Clear all / Apply. The sheet holds the pick until Apply, so a
 * mis-tap costs nothing.
 */
const MultiSelect = ({
  values,
  options,
  onChange,
  addLabel = 'Add',
  sheetTitle,
  sheetSubtitle,
  searchPlaceholder = 'Search',
}: {
  values: string[];
  options: string[];
  onChange: (v: string[]) => void;
  addLabel?: string;
  sheetTitle: string;
  sheetSubtitle?: string;
  searchPlaceholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(values);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggleDraft = (o: string) =>
    setDraft((d) => (d.includes(o) ? d.filter((v) => v !== o) : [...d, o]));

  const close = () => {
    setQuery('');
    setOpen(false);
  };

  return (
    <View style={s.selectWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {values.map((v) => (
          <View key={v} style={s.chip}>
            <Text style={s.chipText}>{v}</Text>
            <Pressable
              onPress={() => onChange(values.filter((x) => x !== v))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${v}`}
            >
              <Icon name="x" size={13} color={colors.surfie} />
            </Pressable>
          </View>
        ))}
        <Pressable
          style={s.chipAdd}
          onPress={() => {
            Keyboard.dismiss();
            setDraft(values);
            setOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={addLabel}
        >
          <Icon name="plus" size={13} color={colors.surfie} />
          <Text style={s.chipAddText}>{addLabel}</Text>
        </Pressable>
      </ScrollView>

      <Sheet
        visible={open}
        onClose={close}
        title={sheetTitle}
        subtitle={sheetSubtitle}
        maxHeightRatio={0.55}
        footer={
          <View style={s.sheetFoot}>
            <Pressable
              onPress={() => setDraft([])}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear all"
            >
              <Text style={s.sheetClear}>Clear all</Text>
            </Pressable>
            <Pressable
              style={s.sheetApply}
              onPress={() => {
                onChange(draft);
                close();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Apply ${draft.length} selected`}
            >
              <Text style={s.sheetApplyText}>
                {draft.length ? `Apply (${draft.length})` : 'Apply'}
              </Text>
            </Pressable>
          </View>
        }
      >
        <View style={s.sheetSearch}>
          <Icon name="search" size={17} color={colors.inkMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.inkFaint}
            style={s.sheetSearchInput}
            accessibilityLabel={searchPlaceholder}
            underlineColorAndroid="transparent"
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Icon name="x" size={16} color={colors.inkMuted} />
            </Pressable>
          )}
        </View>

        {draft.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.sheetPicked}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.sheetCount}>{draft.length} selected</Text>
            {draft.map((v) => (
              <Pressable
                key={v}
                style={s.chip}
                onPress={() => toggleDraft(v)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${v}`}
              >
                <Text style={s.chipText}>{v}</Text>
                <Icon name="x" size={13} color={colors.surfie} />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {list.map((o) => {
          const on = draft.includes(o);
          return (
            <Pressable
              key={o}
              onPress={() => toggleDraft(o)}
              style={[s.sheetRow, on && s.sheetRowOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <View style={[s.sheetBox, on && s.sheetBoxOn]}>
                {on && <Icon name="check" size={13} color={colors.white} />}
              </View>
              <Text style={[s.sheetRowText, on && s.sheetRowTextOn]}>{o}</Text>
            </Pressable>
          );
        })}
        {list.length === 0 && <Text style={s.sheetEmpty}>No match for “{query}”.</Text>}
      </Sheet>
    </View>
  );
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const daysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

/**
 * Date of birth picker. Three tap-to-scroll columns in the existing Sheet
 * rather than `@react-native-community/datetimepicker` — a native module would
 * mean a pod install and a Gradle rebuild for one field, and this behaves the
 * same on both platforms.
 */
const DobSheet = ({
  visible,
  onClose,
  value,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  /** Digits-only DDMMYYYY, or '' when nothing has been entered yet. */
  value: string;
  onApply: (digits: string) => void;
}) => {
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 120 }, (_, i) => thisYear - i), [thisYear]);

  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(thisYear - 30);

  // Re-seed from the field each time it opens, so Cancel really cancels.
  useEffect(() => {
    if (!visible || value.length !== 8) return;
    setDay(parseInt(value.slice(0, 2), 10) || 1);
    setMonth(parseInt(value.slice(2, 4), 10) || 1);
    setYear(parseInt(value.slice(4, 8), 10) || thisYear - 30);
  }, [visible, value, thisYear]);

  const maxDay = daysInMonth(month, year);
  // 31 Jan then switch to February: the day has to come back to 28/29.
  const safeDay = Math.min(day, maxDay);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Date of Birth"
      subtitle="Your doctor uses this to judge dosing and risk."
      maxHeightRatio={0.6}
      footer={
        <View style={s.sheetFoot}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={s.sheetClear}>Cancel</Text>
          </Pressable>
          <Pressable
            style={s.sheetApply}
            onPress={() => {
              onApply(pad(safeDay) + pad(month) + year);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Apply date of birth"
          >
            <Text style={s.sheetApplyText}>
              {pad(safeDay) + ' ' + MONTHS[month - 1].slice(0, 3) + ' ' + year}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View style={s.dobCols}>
        <View style={s.dobCol}>
          <Text style={s.dobColLabel}>Day</Text>
          <ScrollView style={s.dobList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {days.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDay(d)}
                style={[s.dobItem, d === safeDay && s.dobItemOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: d === safeDay }}
              >
                <Text style={[s.dobItemText, d === safeDay && s.dobItemTextOn]}>{d}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={[s.dobCol, s.dobColWide]}>
          <Text style={s.dobColLabel}>Month</Text>
          <ScrollView style={s.dobList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {MONTHS.map((m, i) => (
              <Pressable
                key={m}
                onPress={() => setMonth(i + 1)}
                style={[s.dobItem, i + 1 === month && s.dobItemOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: i + 1 === month }}
              >
                <Text style={[s.dobItemText, i + 1 === month && s.dobItemTextOn]}>{m}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={s.dobCol}>
          <Text style={s.dobColLabel}>Year</Text>
          <ScrollView style={s.dobList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {years.map((y) => (
              <Pressable
                key={y}
                onPress={() => setYear(y)}
                style={[s.dobItem, y === year && s.dobItemOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: y === year }}
              >
                <Text style={[s.dobItemText, y === year && s.dobItemTextOn]}>{y}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Sheet>
  );
};

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
  const [dobOpen, setDobOpen] = useState(false);
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);

  const pickPhoto = async () => {
    Keyboard.dismiss();
    try {
      const res = await pickImageFromLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
      if (res.didCancel) return;
      if (res.errorCode) return setError(res.errorMessage ?? 'Could not open your photos.');
      const uri = res.assets?.[0]?.uri;
      if (uri) setPhoto(uri);
    } catch (e: any) {
      /* Show what actually failed rather than a guess at why. */
      setError(e?.message ?? 'Could not open your photos.');
    }
  };

  /**
   * Keyboard handling. Android resizes the window but does not reliably scroll
   * the focused field into view inside a nested layout, so each Field records
   * its offset and focusing an input scrolls to it.
   */
  const scrollRef = useRef<ScrollView>(null);
  const fieldTops = useRef<Record<string, { y: number; height: number }>>({});
  /** The scroll viewport's full laid-out height. See `scrollToField`. */
  const viewH = useRef(0);
  const focusedField = useRef<string | null>(null);
  /**
   * The open keyboard's height, added to the scroll padding while it is up.
   * Without it `scrollTo` clamps at the end of the content and the last few
   * fields can never reach the top of the viewport — which is the whole
   * mechanism by which a field escapes the keyboard.
   */
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const rememberTop = (key: string) => (e: any) => {
    const { y, height } = e.nativeEvent.layout;
    fieldTops.current[key] = { y, height };
  };
  /**
   * Bring the field to rest just above the keyboard rather than at the top of
   * the page: scroll its bottom edge to the bottom of the visible viewport.
   *
   * What counts as "visible" differs by platform. iOS's `KeyboardAvoidingView`
   * pads this view, so `onLayout` already reports the shrunken height. Android
   * does not: the app targets SDK 36, so Android 15+ forces edge-to-edge, where
   * `windowSoftInputMode="adjustResize"` no longer resizes the window — the IME
   * comes in as an inset over a still-full-height window (verified: the window
   * frame stays [0,0][1080,2400] with the keyboard up). So subtract the
   * keyboard ourselves there, or every scroll lands a keyboard's-worth short
   * and the focused field stays covered.
   */
  const scrollToField = (key: string | null) => {
    const box = key === null ? undefined : fieldTops.current[key];
    if (!box) return;
    const view = viewH.current && viewH.current - (Platform.OS === 'android' ? kbHeight : 0);
    const y = view ? box.y + box.height + 16 - view : box.y - 24;
    scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });
  };
  const revealField = (key: string) => () => {
    focusedField.current = key;
    scrollToField(key);
  };
  /* Re-run once the padding above has actually been laid out. */
  useEffect(() => {
    if (kbHeight) scrollToField(focusedField.current);
  }, [kbHeight]);
  const goToStep = (next: 1 | 2 | 3) => {
    Keyboard.dismiss();
    setStep(next);
    // Otherwise the next step opens scrolled to wherever this one ended.
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

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
    // Sign-in resets the stack to this screen, so there is nothing to pop on
    // step 1 and goBack() was a silent no-op.
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Welcome');
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={s.scrollView}
        onLayout={(e) => {
          viewH.current = e.nativeEvent.layout.height;
        }}
        contentContainerStyle={[s.scrollContent, { paddingBottom: spacing.xl + kbHeight }]}
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
              <Pressable
                style={s.photoCircle}
                onPress={pickPhoto}
                accessibilityRole="button"
                accessibilityLabel="Add profile photo"
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={s.photoImage} resizeMode="cover" />
                ) : (
                  <Icon name="camera" size={26} color={colors.surfie} />
                )}
              </Pressable>
              <View style={s.flex}>
                <Text style={s.photoTitle}>Profile Photo</Text>
                <Text style={s.photoHint}>JPG or PNG</Text>
              </View>
              <Pressable style={s.photoBtn} onPress={pickPhoto} accessibilityRole="button">
                <Text style={s.photoBtnText}>{photo ? 'Change' : 'Add Photo'}</Text>
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
                right={
                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setDobOpen(true);
                    }}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Pick date of birth"
                  >
                    <Icon name="calendar" size={18} color={colors.inkMuted} />
                  </Pressable>
                }
              />
              <DobSheet
                visible={dobOpen}
                onClose={() => setDobOpen(false)}
                value={dob.replace(/[^0-9]/g, '')}
                onApply={onDobChange}
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
              <MultiSelect
                values={languages}
                options={ALL_LANGUAGES}
                onChange={setLanguages}
                addLabel="Add language"
                sheetTitle="Preferred Language(s)"
                sheetSubtitle="Select all languages you are comfortable consulting in"
                searchPlaceholder="Search languages"
              />
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

            <View style={s.row} onLayout={rememberTop('State / PIN')}>
              <Field label="State" required style={s.flex}>
                <Select value={stateName} placeholder="Select state" options={STATES} onSelect={setStateName} />
              </Field>
              <Field label="PIN Code" required style={s.flex}>
                <Input
                  value={pin}
                  onChangeText={(v) => {
                    const digits = v.replace(/\D/g, '').slice(0, 6);
                    setPin(digits);
                    // A numeric keypad has no return key, so a full PIN closes it.
                    if (digits.length === 6) Keyboard.dismiss();
                  }}
                  placeholder="Enter PIN code"
                  onFocus={revealField('State / PIN')}
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

            <View style={s.row} onLayout={rememberTop('Blood Group / Height')}>
              <Field label="Blood Group" style={s.flex}>
                <Select value={bloodGroup} placeholder="Select" options={BLOOD_GROUPS} onSelect={setBloodGroup} />
              </Field>
              <Field label="Height" style={s.flex}>
                <Input
                  value={height}
                  onChangeText={(v) => setHeight(v.replace(/\D/g, '').slice(0, 3))}
                  placeholder="Height in cm"
                  onFocus={revealField('Blood Group / Height')}
                  keyboardType="numeric"
                />
              </Field>
            </View>

            <View style={s.row} onLayout={rememberTop('Weight / BMI')}>
              <Field label="Weight" style={s.flex}>
                <Input
                  value={weight}
                  onChangeText={(v) => setWeight(v.replace(/\D/g, '').slice(0, 3))}
                  placeholder="Weight in kg"
                  onFocus={revealField('Weight / BMI')}
                  keyboardType="numeric"
                />
              </Field>
              <Field label="BMI" style={s.flex}>
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
                  underlineColorAndroid="transparent"
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
                      underlineColorAndroid="transparent"
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
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  photoHint: {
    fontFamily: typography.body.family,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  photoTitle: {
    fontFamily: typography.heading.family,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
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
  sheetSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
  sheetSearchInput: {
    flex: 1,
    fontFamily: typography.body.family,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  sheetPicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  sheetCount: {
    fontFamily: typography.body.family,
    fontSize: 13,
    color: colors.inkMuted,
    marginRight: 2,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderRadius: radius.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.line,
  },
  sheetRowOn: {
    backgroundColor: colors.successSoft,
    borderBottomColor: 'transparent',
  },
  sheetBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.surface.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBoxOn: {
    backgroundColor: colors.surfie,
    borderColor: colors.surfie,
  },
  sheetRowText: {
    fontFamily: typography.body.family,
    fontSize: 15,
    color: colors.ink,
  },
  sheetRowTextOn: { fontWeight: '700' },
  sheetEmpty: {
    fontFamily: typography.body.family,
    fontSize: 14,
    color: colors.inkMuted,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  sheetFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  sheetClear: {
    fontFamily: typography.body.family,
    fontSize: 15,
    fontWeight: '700',
    color: colors.surfie,
    paddingVertical: 12,
  },
  sheetApply: {
    flex: 1,
    maxWidth: 200,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetApplyText: {
    fontFamily: typography.body.family,
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
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

  dobCols: { flexDirection: 'row', gap: spacing.sm },
  dobCol: { flex: 1, gap: 6 },
  dobColWide: { flex: 1.5 },
  dobColLabel: {
    fontFamily: typography.body.family,
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dobList: {
    height: 220,
    borderWidth: 1,
    borderColor: colors.surface.line,
    borderRadius: radius.md,
  },
  dobItem: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  dobItemOn: { backgroundColor: '#EEF8F5' },
  dobItemText: {
    fontFamily: typography.body.family,
    fontSize: 14,
    color: colors.ink,
  },
  dobItemTextOn: { color: colors.surfie, fontWeight: '700' },

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
