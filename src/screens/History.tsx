import { useEffect, useState } from 'react';
import { useNavigation } from '../app/navigation';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { formatWhen, helpedLabel } from '../content/format';
import { getProtocol } from '../content/protocols';
import { storage, type HistoryEntry } from '../platform/storage';

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const name = getProtocol(entry.protocolId)?.name ?? 'Reset';
  return (
    <li className="flex flex-col gap-1 rounded-2xl bg-surface px-5 py-4">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-ink">{name}</span>
        <span className={entry.completed ? 'text-sm text-accent' : 'text-sm text-muted'}>
          {entry.completed ? 'Completed' : 'Stopped'}
        </span>
      </span>
      <span className="text-sm text-muted">
        <time dateTime={entry.at}>{formatWhen(entry.at)}</time>
        {entry.helped && <> · Helped: {helpedLabel(entry.helped)}</>}
      </span>
    </li>
  );
}

export function History() {
  const { navigate } = useNavigation();
  // null while loading, so the empty state never flashes before data arrives.
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    void storage.getHistory().then((history) => setEntries([...history].reverse())); // newest first
  }, []);

  // One tap, no confirmation and no guilt-trip.
  const deleteAll = async () => {
    await storage.clearHistory();
    setEntries([]);
  };

  return (
    <Screen
      bottom={
        <BottomBar>
          <CalmButton onClick={() => navigate('home')}>Home</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>History</ScreenTitle>

      {entries?.length === 0 && (
        <p className="flex flex-1 items-center justify-center pb-16 text-center text-muted">
          Nothing here yet. This list never leaves your device.
        </p>
      )}

      {entries && entries.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {entries.map((entry, i) => (
              <HistoryRow key={`${entry.at}-${i}`} entry={entry} />
            ))}
          </ul>
          <CalmButton variant="quiet" className="mt-6 self-center" onClick={() => void deleteAll()}>
            Delete all history
          </CalmButton>
          <p className="text-center text-sm text-muted">Stored on this device only.</p>
        </>
      )}
    </Screen>
  );
}
