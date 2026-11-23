import { useSettings, useStrings } from '../app/settings';
import { useInstallState } from '../app/useInstall';
import * as install from '../platform/install';
import { CalmButton } from './CalmButton';

/**
 * "Add to Home Screen" hint — mobile browsers only, dismissible (remembered in
 * settings). Shown on calm screens only: never inside the reset flow.
 */
export function InstallHint() {
  const { settings, updateSettings } = useSettings();
  const s = useStrings();
  const state = useInstallState();
  if (!install.shouldShowInstallHint(state, settings.installHintDismissed)) return null;

  const dismiss = () => updateSettings({ installHintDismissed: true });
  const addNow = async () => {
    if ((await install.prompt()) === 'accepted') dismiss();
  };

  const how =
    state.platform === 'ios'
      ? s.install.ios
      : state.canPrompt
        ? s.install.prompt
        : s.install.menu;

  return (
    <aside aria-labelledby="install-hint-title" className="flex flex-col gap-3 rounded-2xl border border-surface p-4">
      <div>
        <h2 id="install-hint-title" className="font-medium text-ink">
          {s.install.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{how}</p>
      </div>
      <div className="flex flex-col gap-1">
        {state.platform !== 'ios' && state.canPrompt && (
          <CalmButton className="w-full" onClick={() => void addNow()}>
            {s.install.add}
          </CalmButton>
        )}
        <CalmButton variant="quiet" className="w-full" onClick={dismiss}>
          {s.install.notNow}
        </CalmButton>
      </div>
    </aside>
  );
}
