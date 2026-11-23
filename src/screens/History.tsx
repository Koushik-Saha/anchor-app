import { useEffect, useState } from 'react';
import { useNavigation } from '../app/navigation';
import { useStrings } from '../app/settings';
import { BottomBar } from '../components/BottomBar';
import { CalmButton } from '../components/CalmButton';
import { Screen } from '../components/Screen';
import { ScreenTitle } from '../components/ScreenTitle';
import { formatWhen, helpedLabel } from '../content/format';
import { protocolText } from '../content/strings';
import { storage, type HistoryEntry } from '../platform/storage';

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const s = useStrings();
  const name = entry.protocolName ?? protocolText(s, entry.protocolId)?.name ?? s.history.fallbackName;
  return (
    <li className="flex flex-col gap-1 rounded-2xl bg-surface px-5 py-4">
      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-medium text-ink">{name}</span>
        <span className={entry.completed ? 'text-sm text-accent' : 'text-sm text-muted'}>
          {entry.completed ? s.history.completed : s.history.stopped}
        </span>
      </span>
      <span className="text-sm text-muted">
        <time dateTime={entry.at}>{formatWhen(entry.at, s.dateLocale)}</time>
        {entry.helped && <> · {s.history.helped(helpedLabel(entry.helped, s))}</>}
      </span>
    </li>
  );
}

export function History() {
  const { navigate } = useNavigation();
  const s = useStrings();
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
          <CalmButton onClick={() => navigate('home')}>{s.common.home}</CalmButton>
        </BottomBar>
      }
    >
      <ScreenTitle>{s.history.title}</ScreenTitle>

      {entries?.length === 0 && (
        <p className="flex flex-1 items-center justify-center pb-16 text-center text-muted">
          {s.history.empty}
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
            {s.history.deleteAll}
          </CalmButton>
          <p className="text-center text-sm text-muted">{s.common.storedOnDevice}</p>
        </>
      )}
    </Screen>
  );
}
