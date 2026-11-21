import { useSettings } from '../app/settings';
import { useInstallState } from '../app/useInstall';
import * as install from '../platform/install';
import { CalmButton } from './CalmButton';

/**
 * "Add to Home Screen" hint — mobile browsers only, dismissible (remembered in
 * settings). Shown on calm screens only: never inside the reset flow.
 */
export function InstallHint() {
  const { settings, updateSettings } = useSettings();
  const state = useInstallState();
  if (!install.shouldShowInstallHint(state, settings.installHintDismissed)) return null;

  const dismiss = () => updateSettings({ installHintDismissed: true });
  const addNow = async () => {
    if ((await install.prompt()) === 'accepted') dismiss();
  };

  const how =
    state.platform === 'ios'
      ? 'Tap Share, then “Add to Home Screen”.'
      : state.canPrompt
        ? 'It opens in one tap and works offline.'
        : 'Open your browser menu, then “Add to Home screen”.';

  return (
    <aside aria-labelledby="install-hint-title" className="flex flex-col gap-3 rounded-2xl border border-surface p-4">
      <div>
        <h2 id="install-hint-title" className="font-medium text-ink">
          Keep Anchor on your home screen
        </h2>
        <p className="mt-1 text-sm text-muted">{how}</p>
      </div>
      <div className="flex flex-col gap-1">
        {state.platform !== 'ios' && state.canPrompt && (
          <CalmButton className="w-full" onClick={() => void addNow()}>
            Add to Home Screen
          </CalmButton>
        )}
        <CalmButton variant="quiet" className="w-full" onClick={dismiss}>
          Not now
        </CalmButton>
      </div>
    </aside>
  );
}
