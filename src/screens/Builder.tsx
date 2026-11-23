import { useId, useState } from 'react';
import {
  canLeaveSteps,
  nextStage,
  NEW_CUSTOM_RESET,
  previousStage,
  toggleStep,
  type BuilderStage,
} from '../app/builder';
import { deleteCustomReset, getCachedCustomReset, saveCustomReset } from '../app/customResetStore';
import { useNavigation } from '../app/navigation';
import { BigButton } from '../components/BigButton';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { ChoiceButton } from '../components/ChoiceButton';
import { CrisisLine } from '../components/CrisisLine';
import { PRIVATE_FIELD } from '../components/privateField';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { BREATH_PATTERNS } from '../content/breathPatterns';
import { CUSTOM_RESET_ID, CUSTOM_STEPS, customProtocol } from '../content/customReset';
import { formatDuration } from '../content/format';
import { CUSTOM_NAME_MAX, type CustomReset } from '../platform/storage';

const BREATH_LENGTHS = [30, 60, 90] as const;
const LINE_LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'standard', label: 'Standard' },
] as const;

const TITLES: Readonly<Record<BuilderStage, string>> = {
  steps: 'Pick your steps',
  pattern: 'Pick a rhythm',
  'breath-length': 'How long to breathe?',
  'lines-length': 'How many calm lines?',
  name: 'Name it',
};

/** One decision per screen. Nothing is saved until the last one. */
export function Builder() {
  const { navigate } = useNavigation();
  const [saved, setSaved] = useState(getCachedCustomReset);
  const [editing, setEditing] = useState(!saved);
  const [stage, setStage] = useState<BuilderStage>('steps');
  const [draft, setDraft] = useState<CustomReset>(saved ?? NEW_CUSTOM_RESET);
  const [saveFailed, setSaveFailed] = useState(false);
  const nameId = useId();

  const next = () => setStage(nextStage(stage, draft.steps));
  const choose = (patch: Partial<CustomReset>) => {
    setDraft({ ...draft, ...patch });
    next();
  };
  const back = previousStage(stage, draft.steps);

  const remove = async () => {
    await deleteCustomReset();
    setSaved(undefined);
    setDraft(NEW_CUSTOM_RESET);
    setStage('steps');
    setEditing(true);
  };
  const save = async () => {
    if (await saveCustomReset(draft)) navigate('library');
    else setSaveFailed(true);
  };

  if (!editing && saved) {
    const protocol = customProtocol(saved);
    return (
      <Screen
        bottom={
          <BottomBar>
            <CalmButton onClick={() => navigate('library')}>Library</CalmButton>
          </BottomBar>
        }
      >
        <ScreenTitle subtitle={`${protocol.description} · ${formatDuration(protocol.approxSeconds)}`}>
          <span className="[overflow-wrap:anywhere]">{saved.name}</span>
        </ScreenTitle>
        <div className="flex flex-col gap-3">
          <BigButton onClick={() => navigate({ view: 'reset', protocolId: CUSTOM_RESET_ID })}>Start</BigButton>
          <CalmButton onClick={() => setEditing(true)}>Change it</CalmButton>
          <CalmButton variant="quiet" onClick={() => void remove()}>
            Delete it
          </CalmButton>
        </div>
        <div className="mt-auto pt-6">
          <CrisisLine />
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      bottom={
        <BottomBar>
          {back && <CalmButton onClick={() => setStage(back)}>Back</CalmButton>}
          <CalmButton onClick={() => navigate('library')}>Close</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle subtitle={stage === 'steps' ? 'Tap in order. Breathing is required.' : undefined}>{TITLES[stage]}</ScreenTitle>

      {stage === 'steps' && (
        <div className="flex flex-col gap-3">
          {CUSTOM_STEPS.map(({ value, label }) => {
            const place = draft.steps.indexOf(value);
            return (
              <ChoiceButton
                key={value}
                title={label}
                selected={place >= 0}
                selectedAs="pressed"
                badge={place >= 0 ? String(place + 1) : undefined}
                onClick={() => setDraft({ ...draft, steps: toggleStep(draft.steps, value) })}
              />
            );
          })}
          <BigButton disabled={!canLeaveSteps(draft.steps)} onClick={next}>
            Next
          </BigButton>
        </div>
      )}

      {stage === 'pattern' && (
        <div className="flex flex-col gap-3">
          {BREATH_PATTERNS.map((pattern) => (
            <ChoiceButton
              key={pattern.id}
              title={pattern.name}
              line={pattern.line}
              selected={draft.patternId === pattern.id}
              onClick={() => choose({ patternId: pattern.id })}
            />
          ))}
        </div>
      )}

      {stage === 'breath-length' && (
        <div className="flex flex-col gap-3">
          {BREATH_LENGTHS.map((sec) => (
            <ChoiceButton key={sec} title={`${sec} seconds`} selected={draft.breathSec === sec} onClick={() => choose({ breathSec: sec })} />
          ))}
        </div>
      )}

      {stage === 'lines-length' && (
        <div className="flex flex-col gap-3">
          {LINE_LENGTHS.map(({ value, label }) => (
            <ChoiceButton key={value} title={label} selected={draft.linesLength === value} onClick={() => choose({ linesLength: value })} />
          ))}
        </div>
      )}

      {stage === 'name' && (
        <div className="flex flex-col gap-4">
          <label htmlFor={nameId} className="text-ink">
            Short name
          </label>
          <input
            {...PRIVATE_FIELD}
            id={nameId}
            type="text"
            autoComplete="off"
            maxLength={CUSTOM_NAME_MAX}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="min-h-tap w-full rounded-2xl bg-surface px-4 py-3 text-xl text-ink focus-visible:outline-2 focus-visible:outline-accent"
          />
          <BigButton onClick={() => void save()}>Save</BigButton>
          <p aria-live="polite" className="min-h-6 text-sm text-muted">
            {saveFailed && 'Couldn’t save on this device.'}
          </p>
        </div>
      )}
    </Screen>
  );
}
