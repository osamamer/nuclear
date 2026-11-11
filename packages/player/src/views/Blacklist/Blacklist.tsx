import { BanIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, ViewShell } from '@nuclearplayer/ui';

import type {
  BlacklistSchedule,
  BlacklistTarget,
} from '../../stores/blacklistStore';
import { useBlacklistStore } from '../../stores/blacklistStore';

const inputClassName =
  'border-foreground/20 bg-background text-foreground placeholder:text-foreground/40 focus-visible:ring-primary h-10 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2';

export const Blacklist = () => {
  const { t } = useTranslation('preferences');
  const { rules, addRule, removeRule } = useBlacklistStore();
  const [target, setTarget] = useState<BlacklistTarget>('track');
  const [value, setValue] = useState('');
  const [scheduleType, setScheduleType] = useState<'always' | 'time-window'>(
    'always',
  );
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }

    const schedule: BlacklistSchedule =
      scheduleType === 'always'
        ? { type: 'always' }
        : { type: 'time-window', startTime, endTime };

    addRule({ target, value: trimmedValue, schedule });
    setValue('');
  };

  const getRuleTargetLabel = (ruleTarget: BlacklistTarget): string =>
    t(`blacklist.targets.${ruleTarget}`);

  const getRuleScheduleLabel = (schedule: BlacklistSchedule): string =>
    schedule.type === 'always'
      ? t('blacklist.always')
      : `${schedule.startTime}–${schedule.endTime}`;

  return (
    <ViewShell title={t('blacklist.title')}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-10">
        <div className="text-foreground/70 text-sm">
          <p>{t('blacklist.description')}</p>
          <p className="mt-2">{t('blacklist.skipBehavior')}</p>
        </div>

        <form
          className="border-foreground/15 bg-background/60 flex flex-col gap-4 rounded-xl border p-4"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <label className="flex flex-col gap-2 text-sm font-medium">
              {t('blacklist.matchType')}
              <select
                className={inputClassName}
                value={target}
                onChange={(event) =>
                  setTarget(event.target.value as BlacklistTarget)
                }
              >
                {(['track', 'artist', 'album', 'keyword'] as const).map(
                  (item) => (
                    <option key={item} value={item}>
                      {getRuleTargetLabel(item)}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium">
              {t('blacklist.matchValue')}
              <input
                className={inputClassName}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={t(`blacklist.placeholders.${target}`)}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
            <label className="flex flex-col gap-2 text-sm font-medium">
              {t('blacklist.schedule')}
              <select
                className={inputClassName}
                value={scheduleType}
                onChange={(event) =>
                  setScheduleType(event.target.value as typeof scheduleType)
                }
              >
                <option value="always">{t('blacklist.always')}</option>
                <option value="time-window">{t('blacklist.timeWindow')}</option>
              </select>
            </label>

            {scheduleType === 'time-window' && (
              <>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  {t('blacklist.from')}
                  <input
                    className={inputClassName}
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  {t('blacklist.to')}
                  <input
                    className={inputClassName}
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    required
                  />
                </label>
              </>
            )}
          </div>

          <div>
            <Button type="submit" disabled={!value.trim()}>
              <PlusIcon className="mr-2 size-4" />
              {t('blacklist.addRule')}
            </Button>
          </div>
        </form>

        <section
          className="flex flex-col gap-3"
          aria-label={t('blacklist.rules')}
        >
          <h2 className="text-lg font-semibold">
            {t('blacklist.rules')}{' '}
            <span className="text-foreground/50">({rules.length})</span>
          </h2>
          {rules.length === 0 ? (
            <div className="border-foreground/15 text-foreground/60 flex items-center gap-3 rounded-xl border border-dashed p-5 text-sm">
              <BanIcon className="size-5 shrink-0" />
              {t('blacklist.empty')}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="border-foreground/15 bg-background/40 flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{rule.value}</p>
                    <p className="text-foreground/60 text-xs">
                      {getRuleTargetLabel(rule.target)} ·{' '}
                      {getRuleScheduleLabel(rule.schedule)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('blacklist.removeRule', {
                      value: rule.value,
                    })}
                    onClick={() => removeRule(rule.id)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ViewShell>
  );
};
