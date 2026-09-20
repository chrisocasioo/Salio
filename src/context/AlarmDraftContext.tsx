import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Alarm } from '../types/alarm';

type AlarmDraftContextValue = {
  draft: Alarm;
  isNew: boolean;
  setDraft: (updater: Alarm | ((prev: Alarm) => Alarm)) => void;
  updateDraft: (partial: Partial<Alarm>) => void;
};

const AlarmDraftContext = createContext<AlarmDraftContextValue | null>(null);

export function AlarmDraftProvider({
  initialAlarm,
  isNew,
  children,
}: {
  initialAlarm: Alarm;
  isNew: boolean;
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<Alarm>(initialAlarm);

  const value = useMemo<AlarmDraftContextValue>(
    () => ({
      draft,
      isNew,
      setDraft,
      updateDraft: (partial) => setDraft((prev) => ({ ...prev, ...partial })),
    }),
    [draft, isNew]
  );

  return <AlarmDraftContext.Provider value={value}>{children}</AlarmDraftContext.Provider>;
}

export function useAlarmDraft(): AlarmDraftContextValue {
  const ctx = useContext(AlarmDraftContext);
  if (!ctx) {
    throw new Error('useAlarmDraft must be used within an AlarmDraftProvider');
  }
  return ctx;
}
