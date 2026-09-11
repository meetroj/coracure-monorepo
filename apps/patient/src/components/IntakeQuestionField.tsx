import React from 'react';
import { View, StyleSheet } from 'react-native';

import type { IntakeQuestion } from '@coracure/api';
import { spacing } from '@coracure/brand';
import { Checkbox, ChoiceGroup, Field, TextField } from '@coracure/ui';
import { useT } from '@coracure/i18n';

/**
 * One intake question, rendered from its backend description (PT-11-03).
 *
 * *** THE FORM IS DATA, NOT A SCREEN. *** PT-11-03 says the intake form is
 * specialty-specific and rendered from the backend, so nothing here knows what
 * a psychologist asks versus a dermatologist. It renders a question by its
 * `type`, shows the backend's own `label` and `help` verbatim, and enforces the
 * `required` flag it is given. A new specialty with new questions needs no app
 * release.
 *
 * While gap G-4 is open the backend cannot serve the form (see
 * `endpoints/intake.ts`), so today this renders the single free-text fallback.
 * The component is already the one the real contract will drive.
 */

export type IntakeAnswer = string | string[];
export type IntakeAnswers = Record<string, IntakeAnswer>;

export const isAnswered = (value: IntakeAnswer | undefined): boolean =>
  Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;

const isNumeric = (value: string) => /^-?\d+(\.\d+)?$/.test(value.trim());

/** Which rule an answer breaks, or null. */
export const problemWith = (
  question: IntakeQuestion,
  value: IntakeAnswer | undefined,
): 'required' | 'number' | null => {
  if (!isAnswered(value)) return question.required ? 'required' : null;
  if (question.type === 'number' && typeof value === 'string' && !isNumeric(value)) return 'number';
  return null;
};

/** The ids of every question that would block submission. */
export const requiredMissing = (questions: IntakeQuestion[], answers: IntakeAnswers): string[] =>
  questions.filter((q) => problemWith(q, answers[q.id]) !== null).map((q) => q.id);

/**
 * What is actually sent in `intakeAnswers`.
 *
 * Built key by key, trimmed, with empty answers dropped — an object of empty
 * strings is not an answer, and the professional should not read one as if the
 * patient had said nothing on purpose.
 */
export const cleanAnswers = (answers: IntakeAnswers): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  Object.entries(answers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) out[key] = value;
    } else if (value.trim().length > 0) {
      out[key] = value.trim();
    }
  });
  return out;
};

export const IntakeQuestionField = ({
  question,
  value,
  onChange,
  showErrors,
  editable = true,
  labelOverride,
  placeholder,
  hint,
}: {
  question: IntakeQuestion;
  value: IntakeAnswer | undefined;
  onChange: (next: IntakeAnswer) => void;
  /** False until the patient first tries to continue — no nagging while typing. */
  showErrors: boolean;
  editable?: boolean;
  /** Only for the app's own fallback question; backend labels render verbatim. */
  labelOverride?: string;
  placeholder?: string;
  hint?: string;
}) => {
  const t = useT();
  const label = labelOverride ?? question.label;
  const helpText = hint ?? question.help;

  const problem = showErrors ? problemWith(question, value) : null;
  const error =
    problem === 'required'
      ? t('intake.required')
      : problem === 'number'
        ? t('intake.numberInvalid')
        : null;

  if (question.type === 'single') {
    return (
      <ChoiceGroup<string>
        label={label}
        choices={(question.options ?? []).map((o) => ({ value: o.value, label: o.label }))}
        value={typeof value === 'string' && value ? value : null}
        onChange={(next) => editable && onChange(next)}
        error={error}
        hint={helpText}
        required={question.required}
      />
    );
  }

  if (question.type === 'multi') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <Field
        label={label}
        error={error}
        hint={helpText ?? t('intake.selectMany')}
        required={question.required}
      >
        <View style={s.options}>
          {(question.options ?? []).map((o) => (
            <Checkbox
              key={o.value}
              label={o.label}
              checked={selected.includes(o.value)}
              disabled={!editable}
              onChange={(on) =>
                onChange(on ? [...selected, o.value] : selected.filter((v) => v !== o.value))
              }
            />
          ))}
        </View>
      </Field>
    );
  }

  // text, longtext, number — and anything newer the backend adds, which is
  // better shown as a text box than dropped silently.
  return (
    <TextField
      label={label}
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
      placeholder={placeholder}
      accessibilityLabel={label}
      multiline={question.type === 'longtext'}
      keyboardType={question.type === 'number' ? 'decimal-pad' : 'default'}
      inputMode={question.type === 'number' ? 'decimal' : 'text'}
      maxLength={question.maxLength}
      editable={editable}
      error={error}
      hint={helpText}
      required={question.required}
    />
  );
};

const s = StyleSheet.create({
  options: { gap: spacing.xs },
});

export default IntakeQuestionField;
