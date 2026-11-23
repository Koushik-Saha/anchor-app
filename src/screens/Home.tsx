import { useEffect, useRef } from 'react';
import { useNavigation } from '../app/navigation';
import { BigButton } from '../components/BigButton';
import { BreathMark } from '../components/BreathMark';
import { CalmButton } from '../components/CalmButton';
import { CrisisLine } from '../components/CrisisLine';
import { Screen } from '../components/Screen';
import { DEFAULT_PROTOCOL_ID } from '../content/protocols';
import * as audio from '../platform/audio';

export function Home() {
  const { navigate } = useNavigation();

  // One tap — or one key — from app open to a running reset.
  const start = () => {
    audio.prime(); // this gesture enables sound for the reset's timed tones (iOS)
    navigate({ view: 'reset', protocolId: DEFAULT_PROTOCOL_ID });
  };
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea')) return;
      e.preventDefault();
      startRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Screen className="justify-between gap-6">
      <h1 tabIndex={-1} className="flex items-center justify-center gap-2 pt-2 text-lg font-medium text-muted outline-none">
        <BreathMark className="size-5 text-accent" />
        Anchor
      </h1>

      <BigButton
        onClick={start}
        className="h-[40dvh] flex-col rounded-[2.5rem] text-3xl"
      >
        <BreathMark className="size-16" />
        Start reset
      </BigButton>

      <nav aria-label="More" className="flex flex-wrap justify-center gap-1">
        <CalmButton variant="quiet" onClick={() => navigate('library')}>
          Library
        </CalmButton>
        <CalmButton variant="quiet" onClick={() => navigate('plan')}>
          My plan
        </CalmButton>
        <CalmButton variant="quiet" onClick={() => navigate('settings')}>
          Settings
        </CalmButton>
      </nav>

      <footer className="pb-safe">
        <CrisisLine />
      </footer>
    </Screen>
  );
}
