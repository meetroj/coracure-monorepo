import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, type ImageSourcePropType } from 'react-native';

import { colors, radius, spacing } from '../theme/brand';
import { typeStyles, fontWeight } from '../theme/typography';
import { Icon } from './Icon';
import { BottomSheet } from './BottomSheet';
import { confirm } from './confirm';

/**
 * Attaching a file: pick → upload → attached, with a way out at every step.
 *
 *   empty ─pick─▶ selecting ─choose─▶ uploading ─done─▶ uploaded
 *                     │                   │                 │
 *                  cancel              cancel         replace / remove
 *                     ▼                   ▼                 ▼
 *                 (as before)        (as before)     selecting / empty
 *   a file over the size limit ─▶ error ─▶ try again (selecting)
 *
 * There is no native picker in the app yet and no server to upload to, so the
 * picker offers sample files and the upload is simulated. Replacing keeps the
 * existing file until the new one has finished, as a real upload would.
 */
export type PickedFile = { name: string; kind: 'pdf' | 'image'; size: string };

/** How long a simulated upload takes. Tests set it to 0. */
export const uploadConfig = { durationMs: 1200 };

const sizeInMb = (size: string) => {
  const m = size.match(/([\d.]+)\s*(KB|MB)/i);
  if (!m) return 0;
  const n = Number(m[1]);
  return m[2].toUpperCase() === 'KB' ? n / 1024 : n;
};

const SAMPLE_DOCUMENTS: PickedFile[] = [
  { name: 'Registration_Certificate.pdf', kind: 'pdf', size: '1.2 MB' },
  { name: 'Aadhaar_Front_Back.pdf', kind: 'pdf', size: '640 KB' },
  { name: 'Degree_Certificate.pdf', kind: 'pdf', size: '2.4 MB' },
  { name: 'Experience_Letter.jpg', kind: 'image', size: '880 KB' },
  { name: 'Scan_0921.pdf', kind: 'pdf', size: '14.8 MB' },
];

const SAMPLE_PHOTOS: PickedFile[] = [
  { name: 'IMG_2041.jpg', kind: 'image', size: '1.8 MB' },
  { name: 'IMG_2044.jpg', kind: 'image', size: '2.1 MB' },
  { name: 'Profile_Studio.png', kind: 'image', size: '6.2 MB' },
];

/**
 * The pictures behind the sample photos, so a chosen photo shows as itself.
 * They are drawn illustrations, never photographs of real people.
 */
const SAMPLE_PREVIEWS: Record<string, ImageSourcePropType> = {
  'IMG_2041.jpg': require('../assets/samples/portrait-1.png'),
  'IMG_2044.jpg': require('../assets/samples/portrait-2.png'),
  'Profile_Studio.png': require('../assets/samples/portrait-3.png'),
};

/** The picture for a chosen photo, when this demo has one. */
export const photoPreview = (file?: { name: string } | null): ImageSourcePropType | undefined =>
  file ? SAMPLE_PREVIEWS[file.name] : undefined;

/* --------------------------------- picker --------------------------------- */

export const FilePickerSheet = ({
  visible,
  kind,
  maxMb,
  onPick,
  onClose,
  testID,
}: {
  visible: boolean;
  kind: 'document' | 'photo';
  maxMb: number;
  onPick: (f: PickedFile) => void;
  onClose: () => void;
  testID?: string;
}) => {
  const files = kind === 'photo' ? SAMPLE_PHOTOS : SAMPLE_DOCUMENTS;
  return (
    <BottomSheet
      visible={visible}
      title={kind === 'photo' ? 'Choose a photo' : 'Choose a file'}
      subtitle={`Sample files for this demo · max ${maxMb} MB`}
      onClose={onClose}
      testID={testID ? `${testID}-picker` : undefined}
    >
      <View style={s.pickList}>
        {files.map((f, i) => (
          <Pressable
            key={f.name}
            testID={testID ? `${testID}-pick-${i}` : undefined}
            onPress={() => onPick(f)}
            style={({ pressed }) => [s.pickRow, i < files.length - 1 && s.pickRule, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${f.name}, ${f.size}`}
          >
            {photoPreview(f) ? (
              <Image source={photoPreview(f)} style={s.pickIcon} accessibilityIgnoresInvertColors />
            ) : (
              <View style={[s.pickIcon, f.kind === 'pdf' && s.pickIconPdf]}>
                <Text style={[s.pickKind, f.kind === 'pdf' && s.pickKindPdf]}>{f.kind === 'pdf' ? 'PDF' : 'IMG'}</Text>
              </View>
            )}
            <View style={s.flex}>
              <Text style={s.pickName} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={s.pickMeta}>{f.size}</Text>
            </View>
            <Icon name="chevronRight" size={16} color={colors.inkFaint} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
};

/* --------------------------------- engine --------------------------------- */

export type UploadStatus = 'idle' | 'selecting' | 'uploading' | 'error';

/**
 * The upload lifecycle, shared by the document field and the profile photo.
 * `onDone` receives the file once it has finished uploading.
 */
export const useUpload = ({ maxMb, onDone }: { maxMb: number; onDone: (f: PickedFile) => void }) => {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState<PickedFile | null>(null);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const choose = (f: PickedFile) => {
    if (sizeInMb(f.size) > maxMb) {
      setPending(f);
      setError(`${f.name} is ${f.size}. Choose a file under ${maxMb} MB.`);
      setStatus('error');
      return;
    }
    setPending(f);
    setError('');
    if (uploadConfig.durationMs <= 0) {
      setStatus('idle');
      setPending(null);
      onDoneRef.current(f);
      return;
    }
    setProgress(0);
    setStatus('uploading');
    const steps = 10;
    let step = 0;
    stop();
    timer.current = setInterval(() => {
      step += 1;
      setProgress(Math.round((step / steps) * 100));
      if (step >= steps) {
        stop();
        setStatus('idle');
        setPending(null);
        onDoneRef.current(f);
      }
    }, uploadConfig.durationMs / steps);
  };

  return {
    status,
    progress,
    pending,
    error,
    select: () => setStatus('selecting'),
    closePicker: () => setStatus((st) => (st === 'selecting' ? 'idle' : st)),
    choose,
    cancel: () => {
      stop();
      setPending(null);
      setStatus('idle');
    },
    dismissError: () => {
      setError('');
      setPending(null);
      setStatus('idle');
    },
  };
};

/* ---------------------------------- field --------------------------------- */

export const UploadField = ({
  label,
  hint,
  file,
  onChange,
  required,
  note,
  error: fieldError,
  maxMb = 10,
  testID,
}: {
  label: string;
  hint?: string;
  file: PickedFile | null;
  onChange: (f: PickedFile | null) => void;
  required?: boolean;
  note?: string;
  /** A validation message from the form, e.g. "Upload the ID document." */
  error?: string;
  maxMb?: number;
  testID?: string;
}) => {
  const up = useUpload({ maxMb, onDone: (f) => onChange(f) });

  const remove = () =>
    confirm({
      title: 'Remove this file?',
      message: `${file?.name ?? 'The file'} will be removed from your submission.`,
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: () => onChange(null),
    });

  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required && <Text style={s.star}> *</Text>}
      </Text>

      {up.status === 'uploading' && up.pending ? (
        <View testID={testID ? `${testID}-uploading` : undefined} style={[s.box, s.fileBox]}>
          <View style={s.fileTop}>
            <FileGlyph kind={up.pending.kind} />
            <View style={s.flex}>
              <Text style={s.fileName} numberOfLines={1}>
                {up.pending.name}
              </Text>
              <Text style={s.fileMeta}>
                {file ? 'Replacing… ' : 'Uploading… '}
                {up.progress}%
              </Text>
              <View style={s.track}>
                <View style={[s.fill, { width: `${up.progress}%` }]} />
              </View>
            </View>
            <Pressable
              testID={testID ? `${testID}-cancel` : undefined}
              onPress={up.cancel}
              hitSlop={8}
              style={s.textBtn}
              accessibilityRole="button"
              accessibilityLabel={`Cancel upload of ${up.pending.name}`}
            >
              <Text style={s.textBtnLabel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : up.status === 'error' ? (
        <View testID={testID ? `${testID}-error` : undefined} style={[s.box, s.fileBox, s.errorBox]}>
          <View style={s.fileTop}>
            <View style={s.errorIcon}>
              <Icon name="alertCircle" size={20} color={colors.danger} />
            </View>
            <View style={s.flex}>
              <Text style={s.errorTitle}>Could not attach the file</Text>
              <Text style={s.errorBody}>{up.error}</Text>
            </View>
          </View>
          <View style={s.actionsRow}>
            <Pressable onPress={up.dismissError} hitSlop={6} style={s.ghostBtn} accessibilityRole="button">
              <Text style={s.ghostBtnText}>{file ? 'Keep current file' : 'Cancel'}</Text>
            </Pressable>
            <Pressable
              testID={testID ? `${testID}-retry` : undefined}
              onPress={up.select}
              hitSlop={6}
              style={s.solidBtn}
              accessibilityRole="button"
            >
              <Text style={s.solidBtnText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      ) : file ? (
        <View testID={testID ? `${testID}-file` : undefined} style={[s.box, s.fileBox]}>
          <View style={s.fileTop}>
            <FileGlyph kind={file.kind} />
            <View style={s.flex}>
              <Text style={s.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <View style={s.okRow}>
                <Icon name="checkCircle" size={14} color={colors.surfie} filled />
                <Text style={s.fileOk}>
                  Uploaded · {file.kind === 'pdf' ? 'PDF' : 'Image'} · {file.size}
                </Text>
              </View>
            </View>
          </View>
          <View style={s.actionsRow}>
            <Pressable
              testID={testID ? `${testID}-replace` : undefined}
              onPress={up.select}
              hitSlop={6}
              style={s.ghostBtn}
              accessibilityRole="button"
              accessibilityLabel={`Replace ${label}`}
            >
              <Icon name="refresh" size={14} color={colors.surfie} />
              <Text style={s.ghostBtnText}>Replace</Text>
            </Pressable>
            <Pressable
              testID={testID ? `${testID}-remove` : undefined}
              onPress={remove}
              hitSlop={6}
              style={[s.ghostBtn, s.dangerBtn]}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${label}`}
            >
              <Icon name="trash" size={14} color={colors.danger} />
              <Text style={[s.ghostBtnText, s.dangerText]}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          testID={testID}
          onPress={up.select}
          style={({ pressed }) => [s.box, s.dropzone, !!fieldError && s.boxInvalid, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Upload ${label}`}
        >
          <View style={s.uploadIcon}>
            <Icon name="upload" size={17} color={colors.surfie} />
          </View>
          <Text style={s.dropText}>Upload document</Text>
          {!!hint && <Text style={s.dropHint}>{hint} · max {maxMb} MB</Text>}
        </Pressable>
      )}

      {!!fieldError && !file && up.status === 'idle' && <Text style={s.fieldError}>{fieldError}</Text>}
      {!!note && <Text style={s.note}>{note}</Text>}

      <FilePickerSheet
        visible={up.status === 'selecting'}
        kind="document"
        maxMb={maxMb}
        onPick={up.choose}
        onClose={up.closePicker}
        testID={testID}
      />
    </View>
  );
};

export const FileGlyph = ({ kind }: { kind: 'pdf' | 'image' }) => (
  <View style={s.glyph}>
    <Icon name="pageFold" size={40} filled color={kind === 'pdf' ? '#E5493C' : colors.surfie} />
    <Text style={s.glyphText}>{kind === 'pdf' ? 'PDF' : 'IMG'}</Text>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.75 },
  field: { marginBottom: spacing.lg },
  label: { ...typeStyles.label, color: colors.ink, marginBottom: 6 },
  star: { color: colors.danger },
  box: { borderRadius: radius.md, borderWidth: 1 },
  boxInvalid: { borderColor: colors.danger },
  dropzone: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderColor: colors.surface.inputBorder,
    backgroundColor: colors.surface.page,
    padding: spacing.lg,
  },
  uploadIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dropText: { ...typeStyles.cardTitle, color: colors.surfie },
  dropHint: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 4 },
  fileBox: { borderColor: colors.surface.line, backgroundColor: colors.white, padding: spacing.md },
  fileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileName: { ...typeStyles.cardTitle, color: colors.ink },
  fileMeta: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 1 },
  okRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  fileOk: { ...typeStyles.caption, color: colors.surfie, fontWeight: fontWeight.semibold },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surface.line, marginTop: 6, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.paris },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surface.line,
  },
  textBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  textBtnLabel: { ...typeStyles.buttonSmall, color: colors.surfie },
  ghostBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfie,
  },
  ghostBtnText: { ...typeStyles.buttonSmall, color: colors.surfie },
  dangerBtn: { borderColor: '#F2C6C3' },
  dangerText: { color: colors.danger },
  solidBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidBtnText: { ...typeStyles.buttonSmall, color: colors.white },
  errorBox: { borderColor: '#F2C6C3', backgroundColor: colors.dangerSoft },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { ...typeStyles.cardTitle, color: colors.danger },
  errorBody: { ...typeStyles.caption, color: colors.danger, marginTop: 1 },
  fieldError: { ...typeStyles.caption, color: colors.danger, marginTop: 5 },
  note: { ...typeStyles.caption, color: colors.inkMuted, marginTop: 5 },
  glyph: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  glyphText: {
    ...typeStyles.caption,
    fontSize: 11,
    lineHeight: 13,
    position: 'absolute',
    bottom: 8,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },

  pickList: { borderWidth: 1, borderColor: colors.surface.line, borderRadius: radius.md, overflow: 'hidden' },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  pickRule: { borderBottomWidth: 1, borderBottomColor: colors.surface.line },
  pickIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surface.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickIconPdf: { backgroundColor: colors.dangerSoft },
  pickKind: { ...typeStyles.caption, fontSize: 11, fontWeight: fontWeight.semibold, color: colors.surfie },
  pickKindPdf: { color: colors.danger },
  pickName: { ...typeStyles.body, color: colors.ink },
  pickMeta: { ...typeStyles.caption, color: colors.inkMuted },
});

export default UploadField;
