import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { resolveProtocol } from '../app/customResetStore';
import { useNavigation, type ResetId } from '../app/navigation';
import { useSettings } from '../app/settings';
import { useReducedMotion } from '../app/useReducedMotion';
import { BigButton } from '../components/BigButton';
import { createCircleAnimator } from '../components/breathCircle';
import { CalmButton } from '../components/CalmButton';
import { cx, focusRing } from '../components/cx';
import { ProgressDots } from '../components/ProgressDots';
import { protocolWithChosenPattern } from '../content/breathPatterns';
import { cueText } from '../content/cueText';
import { CUSTOM_RESET_ID } from '../content/customReset';
import { defaultProtocol } from '../content/protocols';
import { createResetEngine, cueAt, type BreathPart, type ResetEngine } from '../engine';
import * as audio from '../platform/audio';
import * as haptics from '../platform/haptics';
import { storage } from '../platform/storage';
import * as wakeLock from '../platform/wakeLock';

// Reset-flow rules (CLAUDE.md 7): ≤ 8 words on screen, every tap target ≥ 64px,
// Skip and ✕ always visible, no popups, no guilt.
export function Reset({ protocolId }: { protocolId: ResetId }) {
  const { navigate } = useNavigation();
  const { settings } = useSettings();
  const reducedMotion = useReducedMotion();
  // Protocols with `choosePattern` breathe the person's last-picked pattern; others run as written.
  // Memoised on the ids so the engine isn't recreated on unrelated settings changes.
  const patternId = settings.breathPattern;
  const protocol = useMemo(
    () => protocolWithChosenPattern(resolveProtocol(protocolId) ?? defaultProtocol, patternId),
    [protocolId, patternId],
  );

  // History keeps a custom reset's own name; built-ins are looked up by id.
  const historyName = protocolId === CUSTOM_RESET_ID ? { protocolName: protocol.name } : {};

  const circleRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ResetEngine | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [text, setText] = useState('');
  const [interrupted, setInterrupted] = useState(false);
  const resumeRef = useRef<HTMLButtonElement>(null);

  // At very large text the middle can overflow and scroll; only then is it a keyboard stop.
  const mainRef = useRef<HTMLElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const check = () => setScrollable(main.scrollHeight > main.clientHeight + 1);
    const observer = new ResizeObserver(check);
    observer.observe(main);
    if (main.firstElementChild) observer.observe(main.firstElementChild);
    check();
    return () => observer.disconnect();
  }, []);

  // Coming back to "Welcome back.": put keyboard / screen-reader focus on the choice.
  useEffect(() => {
    if (interrupted) resumeRef.current?.focus();
  }, [interrupted]);

  // Latest values for engine callbacks, without restarting the engine when they change.
  const live = useRef({
    navigate,
    reducedMotion,
    tonePitch: settings.tonePitch,
    historyName,
  });
  useEffect(() => {
    live.current = { navigate, reducedMotion, tonePitch: settings.tonePitch, historyName };
  });

  // Layout effect: the first cue is painted on the very first frame — no empty flash.
  useLayoutEffect(() => {
    const engine = createResetEngine(protocol);
    engineRef.current = engine;
    const animateCircle = createCircleAnimator();
    let lastText: string | null = null;
    let lastPart: BreathPart | null = null;

    const unsubscribe = engine.subscribe({
      onPhaseChange(e) {
        setPhaseIndex(e.phaseIndex);
        haptics.pulse('phase'); // adapter no-ops if haptics are off
        if (!protocol.noTones) audio.toneOnPhaseChange(live.current.tonePitch); // no-ops if sound is off
        lastPart = null;
      },

      onTick(e) {
        const cue = cueAt(e.phase, e.phaseElapsedMs);

        // 60fps path: write transform/opacity straight to the DOM — no React render per frame.
        const { scale, opacity } = animateCircle(cue, e.phaseElapsedMs, e.at, live.current.reducedMotion);
        const el = circleRef.current;
        if (el) {
          el.style.transform = `scale(${scale})`;
          el.style.opacity = String(opacity);
        }

        // A soft tap at each turn of the breath, so it can be followed with eyes closed.
        if (cue.kind === 'breathing') {
          if (lastPart !== null && cue.part !== lastPart) haptics.pulse('tap');
          lastPart = cue.part;
        }

        const next = cueText(cue);
        if (next !== lastText) {
          lastText = next;
          setText(next);
        }
      },

      onStateChange(state) {
        setInterrupted(state.status === 'paused' && state.wasInterrupted);
      },

      onComplete() {
        haptics.pulse('done');
        // Saved now, so the run is in history even if "What helped?" is never answered.
        const completedAt = new Date().toISOString();
        void storage.addHistoryEntry({
          at: completedAt,
          protocolId,
          ...live.current.historyName,
          completed: true,
        });
        live.current.navigate({ view: 'done', protocolId, completedAt });
      },
    });

    // The page being hidden pauses the run; on return we offer Resume / Start over.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') engine.interrupt();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    void wakeLock.acquire();
    engine.start();

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      unsubscribe();
      // Replaced mid-run by a shortcut: recorded as stopped, the same as Close.
      const { status } = engine.getState();
      if (status === 'running' || status === 'paused') {
        void storage.addHistoryEntry({ at: new Date().toISOString(), protocolId, ...live.current.historyName, completed: false });
      }
      engine.dispose();
      engineRef.current = null;
      void wakeLock.release();
    };
  }, [protocol, protocolId]);

  const skip = () => engineRef.current?.skipPhase();
  // No confirmation, no "are you sure" — leaving is always fine.
  const close = () => {
    const engine = engineRef.current;
    const status = engine?.getState().status;
    if (engine && (status === 'running' || status === 'paused')) {
      engine.abort();
      void storage.addHistoryEntry({
        at: new Date().toISOString(),
        protocolId,
        ...historyName,
        completed: false,
      });
    }
    navigate('home');
  };

  // Keyboard / switch access: Space skips, Escape closes (buttons keep their own Space/Enter).
  const keys = useRef({ skip, close });
  useEffect(() => {
    keys.current = { skip, close };
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        keys.current.close();
        return;
      }
      if (e.key !== ' ' || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input')) return; // let buttons handle Space
      e.preventDefault();
      keys.current.skip();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className={cx(
        // Full-height column: ✕ (top) and Skip (bottom) are always on screen; the circle
        // takes whatever space is left, so the words stay visible even at 200% text.
        'mx-auto flex h-dvh w-full max-w-[480px] flex-col px-4 sm:px-6',
        protocol.extraDim && 'opacity-60',
      )}
    >
      <header className="flex shrink-0 justify-end pt-safe">
        {/* Not visible (≤ 8 words on screen), but names the screen for assistive tech; focused on arrival. */}
        <h1 tabIndex={-1} className="sr-only">
          Reset
        </h1>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className={cx('grid size-tap place-items-center rounded-2xl text-muted active:text-ink', focusRing)}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <main
        ref={mainRef}
        tabIndex={scrollable ? 0 : undefined}
        className={cx('flex min-h-0 flex-1 flex-col overflow-y-auto py-2', focusRing)}
      >
        {/* my-auto centres when there is room and starts at the top when there is not — never unreachable. */}
        <div className="my-auto flex max-h-full min-h-0 w-full flex-col items-center gap-6">
          {/* Circle area: 18rem, shrinking when space is short (large text) so the words stay visible. */}
          <div className="flex min-h-16 w-full flex-[0_1_18rem] items-center justify-center">
            <div aria-hidden="true" className="relative aspect-square h-[min(100%,72vw,18rem)]">
              <div className="absolute inset-0 rounded-full border border-accent/15" />
              <div
                ref={circleRef}
                className="absolute inset-0 rounded-full bg-accent/25 shadow-[0_0_80px_rgb(94_234_212/0.25)] will-change-transform"
                style={{ transform: 'scale(0.5)' }}
              />
            </div>
          </div>

          {interrupted ? (
            <div className="flex w-full flex-col items-center gap-4">
              <p className="text-[1.75rem] leading-tight font-medium text-ink">Welcome back.</p>
              <BigButton ref={resumeRef} onClick={() => engineRef.current?.resume()}>
                Resume
              </BigButton>
              <CalmButton className="w-full" onClick={() => engineRef.current?.restart()}>
                Start over
              </CalmButton>
            </div>
          ) : (
            <>
              <p
                aria-live="polite"
                className="flex min-h-[4.5rem] items-center text-center text-[1.75rem] leading-tight font-medium text-ink"
              >
                {text}
              </p>
              <ProgressDots count={protocol.phases.length} current={phaseIndex} />
            </>
          )}
        </div>
      </main>

      <footer className="flex shrink-0 justify-end pt-4 pb-safe">
        <CalmButton className="min-w-28" onClick={skip}>
          Skip
        </CalmButton>
      </footer>
    </div>
  );
}
