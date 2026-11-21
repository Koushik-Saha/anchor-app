import { useEffect, useState } from 'react';
import { grantUnlock, useUnlocked } from '../app/unlock';
import * as haptics from '../platform/haptics';
import * as purchases from '../platform/purchases';
import { BigButton } from './BigButton';
import { CalmButton } from './CalmButton';

type Status = 'idle' | 'buying' | 'restoring' | 'pending' | 'failed' | 'not-found';

const MESSAGES: Partial<Record<Status, string>> = {
  pending: 'Waiting for the store to confirm. You can close this.',
  failed: 'The purchase didn’t go through. Please try again later.',
  'not-found': 'No earlier purchase found for this account.',
};

/**
 * The one-time unlock: price, Unlock, Restore purchases. Native only — on the web
 * it just points to the free mobile app (no web payments). Never shown in the reset flow.
 */
export function UnlockPanel({ onDone, doneLabel = 'Continue' }: { onDone?: () => void; doneLabel?: string }) {
  const unlocked = useUnlocked();
  const available = purchases.isAvailable();
  const [price, setPrice] = useState(purchases.UNLOCK_FALLBACK_PRICE);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (available) void purchases.getUnlockPrice().then(setPrice);
  }, [available]);

  if (unlocked) {
    return (
      <div className="flex flex-col gap-4">
        <p aria-live="polite" className="text-lg text-ink">
          Unlocked. Thank you.
        </p>
        {onDone && <BigButton onClick={onDone}>{doneLabel}</BigButton>}
      </div>
    );
  }

  const busy = status === 'buying' || status === 'restoring';

  const buy = async () => {
    setStatus('buying');
    const outcome = await purchases.purchaseUnlock();
    if (outcome === 'purchased') {
      await grantUnlock();
      haptics.pulse('done');
      setStatus('idle');
    } else if (outcome === 'pending') setStatus('pending');
    else if (outcome === 'cancelled') setStatus('idle'); // their choice — no message
    else setStatus('failed');
  };

  const restore = async () => {
    setStatus('restoring');
    if (await purchases.restore()) {
      await grantUnlock();
      setStatus('idle');
    } else setStatus('not-found');
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg text-ink">Part of the one-time unlock — {price}, no subscription.</p>

      {available ? (
        <>
          <BigButton onClick={() => void buy()} disabled={busy} aria-busy={status === 'buying'}>
            {status === 'buying' ? 'Opening the store…' : 'Unlock'}
          </BigButton>
          <CalmButton variant="quiet" onClick={() => void restore()} disabled={busy}>
            {status === 'restoring' ? 'Checking…' : 'Restore purchases'}
          </CalmButton>
          <p aria-live="polite" className="min-h-5 text-center text-sm text-muted">
            {MESSAGES[status] ?? ''}
          </p>
        </>
      ) : (
        <p className="text-muted">Unlock in the free mobile app.</p>
      )}
    </div>
  );
}
