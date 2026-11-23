import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useNavigation } from '../app/navigation';
import { useStrings } from '../app/settings';
import { PLAN_LIMITS } from '../app/plan';
import { getCachedPlan, savePlan } from '../app/planStore';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { cx, focusRing } from '../components/cx';
import { PRIVATE_FIELD } from '../components/privateField';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import type { PanicPlan } from '../platform/storage';

type Fields = Required<Record<keyof PanicPlan, string>>;
const EMPTY: Fields = { note: '', contactName: '', contactPhone: '', medsNote: '' };
const SAVE_DELAY_MS = 500;

/** Saves the cleaned plan; an all-empty plan is removed rather than stored as blanks. */
const persist = (values: Fields): Promise<void> => savePlan(values);

const inputClass = cx(
  'w-full rounded-2xl bg-surface px-4 py-3 text-lg text-ink placeholder:text-muted/70',
  'min-h-tap focus-visible:outline-2 focus-visible:outline-accent',
);

function Field({ label, hint, children }: { label: string; hint?: string; children: (ids: { input: string; hint?: string }) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink">
        {label}
      </label>
      {children({ input: id, hint: hintId })}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function PlanForm() {
  const s = useStrings();
  // Starts from the startup cache: the form is complete on its first frame.
  const [fields, setFields] = useState<Fields>(() => ({ ...EMPTY, ...getCachedPlan() }));
  const [saved, setSaved] = useState(false);
  const pending = useRef<Fields | null>(null);

  // Autosave shortly after typing stops, and flush on leaving the screen.
  useEffect(() => {
    if (!pending.current) return;
    const values = pending.current;
    const timer = setTimeout(() => {
      pending.current = null;
      void persist(values).then(() => setSaved(true));
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [fields]);

  useEffect(
    () => () => {
      if (pending.current) void persist(pending.current);
    },
    [],
  );

  const update = (key: keyof Fields, value: string) => {
    const next = { ...fields, [key]: value };
    pending.current = next;
    setSaved(false);
    setFields(next);
  };

  const deletePlan = async () => {
    pending.current = null;
    await savePlan(EMPTY);
    setFields(EMPTY);
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-center gap-2 text-sm text-accent">
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="7" width="10" height="7" rx="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
        </svg>
        {s.plan.private}
      </p>

      <Field label={s.plan.noteLabel} hint={s.plan.noteHint}>
        {({ input, hint }) => (
          <textarea
            {...PRIVATE_FIELD}
            id={input}
            aria-describedby={hint}
            rows={2}
            maxLength={PLAN_LIMITS.note}
            value={fields.note}
            placeholder={s.plan.notePlaceholder}
            onChange={(e) => update('note', e.target.value)}
            className={cx(inputClass, 'resize-none')}
          />
        )}
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-ink">{s.plan.contact}</legend>
        <Field label={s.plan.name}>
          {({ input }) => (
            <input
              {...PRIVATE_FIELD}
              id={input}
              type="text"
              autoComplete="off"
              maxLength={PLAN_LIMITS.contactName}
              value={fields.contactName}
              onChange={(e) => update('contactName', e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label={s.plan.phone} hint={s.plan.phoneHint}>
          {({ input, hint }) => (
            <input
              {...PRIVATE_FIELD}
              id={input}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              aria-describedby={hint}
              maxLength={PLAN_LIMITS.contactPhone}
              value={fields.contactPhone}
              onChange={(e) => update('contactPhone', e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
      </fieldset>

      <Field label={s.plan.privateLabel} hint={s.plan.privateHint}>
        {({ input, hint }) => (
          <textarea
            {...PRIVATE_FIELD}
            id={input}
            aria-describedby={hint}
            rows={3}
            maxLength={PLAN_LIMITS.medsNote}
            value={fields.medsNote}
            onChange={(e) => update('medsNote', e.target.value)}
            className={cx(inputClass, 'resize-none')}
          />
        )}
      </Field>

      <p aria-live="polite" className="min-h-5 text-sm text-muted">
        {saved && s.common.savedOnDevice}
      </p>

      <button
        type="button"
        onClick={() => void deletePlan()}
        className={cx('min-h-12 self-start rounded-xl px-1 text-muted underline underline-offset-4', focusRing)}
      >
        {s.plan.delete}
      </button>
    </div>
  );
}

export function Plan() {
  const { navigate } = useNavigation();
  const s = useStrings();
  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>{s.common.home}</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>{s.plan.title}</ScreenTitle>
      <PlanForm />
    </Screen>
  );
}
