import { useEffect, useState } from 'react';
import { useNavigation } from '../app/navigation';
import { NO_PATTERNS_YET, statementText, whatHelpedStatements, type WhatHelpedStatement } from '../app/whatHelped';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { CrisisLine } from '../components/CrisisLine';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { storage } from '../platform/storage';

/** The person's own history as a few plain lines. Worked out here, on this device, and never saved. */
export function WhatHelped() {
  const { navigate } = useNavigation();
  // null while loading, so the "not yet" line never flashes before the data arrives.
  const [statements, setStatements] = useState<WhatHelpedStatement[] | null>(null);

  useEffect(() => {
    void storage.getHistory().then((history) => setStatements(whatHelpedStatements(history)));
  }, []);

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>What helped</ScreenTitle>

      <div className="flex flex-1 flex-col justify-center gap-8 py-4">
        {statements?.length === 0 && <p className="text-3xl leading-tight font-medium text-ink">{NO_PATTERNS_YET}</p>}
        {statements && statements.length > 0 && (
          <ul className="flex flex-col gap-8">
            {statements.map((statement) => (
              <li key={statement.kind} className="text-3xl leading-tight font-medium text-ink [overflow-wrap:anywhere]">
                {statementText(statement)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CrisisLine />
    </Screen>
  );
}
