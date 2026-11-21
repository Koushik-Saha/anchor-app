import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigation } from '../app/navigation';
import { useSettings } from '../app/settings';
import { usePrefersReducedMotion } from '../app/useReducedMotion';
import { BigButton } from '../components/BigButton';
import { createCircleAnimator } from '../components/breathCircle';
import { CalmButton } from '../components/CalmButton';
import { cx, focusRing } from '../components/cx';
import { ProgressDots } from '../components/ProgressDots';
import { cueText } from '../content/cueText';
import { defaultProtocol } from '../content/protocols';
import { createResetEngine, cueAt, type BreathPart, type ResetEngine } from '../engine';
import * as audio from '../platform/audio';
import * as haptics from '../platform/haptics';
import * as wakeLock from '../platform/wakeLock';

// Reset-flow rules (CLAUDE.md 7): ≤ 8 words on screen, every tap target ≥ 64px,
// Skip and ✕ always visible, no popups, no guilt.
export function Reset() {
  const { navigate } = useNavigation();
  const { settings } = useSettings();
  const reducedMotion = usePrefersReducedMotion();
  const protocol = defaultProtocol;

  const circleRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ResetEngine | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [text, setText] = useState('');
  const [interrupted, setInterrupted] = useState(false);

  // Latest values for engine callbacks, without restarting the engine when they change.
  const live = useRef({ navigate, reducedMotion, tonePitch: settings.tonePitch });
  useEffect(() => {
    live.current = { navigate, reducedMotion, tonePitch: settings.tonePitch };
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
        live.current.navigate('done');
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
      engine.dispose();
      engineRef.current = null;
      void wakeLock.release();
    };
  }, [protocol]);

  const skip = () => engineRef.current?.skipPhase();
  const close = () => {
    engineRef.current?.abort();
    navigate('home');
  };

  // Keyboard / switch access: Space skips, Escape closes (buttons keep their own Space/Enter).
  const keys = useRef({ skip, close });
  useEffect(() => {
    keys.current = { skip, close };
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input')) return;
      if (e.key === ' ') {
        e.preventDefault();
        keys.current.skip();
      } else if (e.key === 'Escape') {
        keys.current.close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div
      className={cx(
        'mx-auto flex h-dvh w-full max-w-[480px] flex-col overflow-hidden px-4 pt-safe pb-safe sm:px-6',
        protocol.extraDim && 'opacity-60',
      )}
    >
      <header className="flex justify-end">
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className={cx('grid size-tap place-items-center rounded-2xl text-muted active:text-ink', focusRing)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10">
        <div aria-hidden="true" className="relative size-[min(72vw,18rem)]">
          <div className="absolute inset-0 rounded-full border border-accent/15" />
          <div
            ref={circleRef}
            className="absolute inset-0 rounded-full bg-accent/25 shadow-[0_0_80px_rgb(94_234_212/0.25)] will-change-transform"
            style={{ transform: 'scale(0.5)' }}
          />
        </div>

        {interrupted ? (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-[1.75rem] leading-tight font-medium text-ink">Welcome back.</p>
            <BigButton onClick={() => engineRef.current?.resume()}>Resume</BigButton>
            <CalmButton className="w-full" onClick={() => engineRef.current?.restart()}>
              Start over
            </CalmButton>
          </div>
        ) : (
          <>
            <p aria-live="polite" className="flex min-h-[4.5rem] items-center text-center text-[1.75rem] leading-tight font-medium text-ink">
              {text}
            </p>
            <ProgressDots count={protocol.phases.length} current={phaseIndex} />
          </>
        )}
      </main>

      <footer className="flex justify-end pt-4">
        <CalmButton className="min-w-28" onClick={skip}>
          Skip
        </CalmButton>
      </footer>
    </div>
  );
}
