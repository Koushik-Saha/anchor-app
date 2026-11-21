import { useNavigation } from '../app/navigation';
import { BottomBar } from '../components/BottomBar';
import { BreathMark } from '../components/BreathMark';
import { CalmButton } from '../components/CalmButton';
import { Screen } from '../components/Screen';

// Reset flow rules: max ~8 words on screen, every tap target ≥ 64px, exit + skip always visible.
export function Reset() {
  const { navigate } = useNavigation();

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('done')}>Skip</CalmButton>
        </BottomBar>
      }
    >
      <div className="flex justify-end">
        <CalmButton variant="quiet" aria-label="Exit reset" className="size-tap" onClick={() => navigate('home')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </CalmButton>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <BreathMark className="size-48 text-accent/80" />
        <p className="text-2xl text-ink">Reset flow coming in Phase 1</p>
      </div>
    </Screen>
  );
}
