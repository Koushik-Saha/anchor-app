import { useNavigation } from '../app/navigation';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { CrisisLine } from '../components/CrisisLine';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';

export function Done() {
  const { navigate } = useNavigation();

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('reset')}>Again</CalmButton>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        <ScreenTitle subtitle="It always passes.">You did it.</ScreenTitle>
        <p className="text-muted">“What helped?” arrives in Phase 1.</p>
      </div>
      <CrisisLine />
    </Screen>
  );
}
