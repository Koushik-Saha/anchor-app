import type { ReactNode } from 'react';
import { useNavigation } from '../app/navigation';
import { BottomBar } from './BottomBar';
import { CalmButton } from './CalmButton';
import { Screen } from './Screen';
import { ScreenTitle } from './ScreenTitle';

interface StubScreenProps {
  title: string;
  note: string;
  children?: ReactNode;
}

/** Temporary scaffold for screens not yet built: title, a note, and a way home. */
export function StubScreen({ title, note, children }: StubScreenProps) {
  const { navigate } = useNavigation();
  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle subtitle={note}>{title}</ScreenTitle>
      {children}
    </Screen>
  );
}
