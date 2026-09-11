/**
 * `@coracure/ui` — the shared component library for every app in this
 * workspace.
 *
 * Nothing here knows about the patient app or the doctor app. A component that
 * needs a domain type belongs in the app, not here.
 */

export { Icon, type IconName } from './Icon';
export { BrandBackground } from './BrandBackground';

export {
  useLayout,
  type Layout,
  GradientFill,
  Screen,
  AppHeader,
  IconButton,
  PageTitle,
  SectionHeader,
  Card,
  StatusPill,
  /** Alias — `StatusBadge` is the name used in newer screens. */
  StatusPill as StatusBadge,
  FilterChip,
  TrustRow,
  Avatar,
  LogoTile,
  Button,
  ListRow,
  ProgressBar,
  Divider,
  StepDots,
  type Tone,
} from './layout';

export {
  Field,
  TextField,
  type TextFieldProps,
  PhoneField,
  COUNTRY_CODES,
  type CountryCode,
  OTPInput,
  ChoiceGroup,
  type Choice,
  DateOfBirthField,
  ageFromISO,
  Checkbox,
} from './forms';

export {
  DayStrip,
  type DayOption,
  TimeSlot,
  CountdownTimer,
  SuggestionChip,
  StepProgress,
} from './booking';

export {
  Skeleton,
  SkeletonCard,
  LoadingState,
  EmptyState,
  ErrorState,
  OfflineBanner,
  Banner,
  type BannerTone,
  Accordion,
  Sheet,
  useCountdown,
  formatDuration,
} from './feedback';
