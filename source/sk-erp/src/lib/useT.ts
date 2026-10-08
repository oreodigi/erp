// React hook: const t = useT(); t('Order Board') → text in the chosen screen language.
import { useCallback } from 'react';
import { useUI } from '../store/store';
import { tr, Lang } from './i18n';

export function useT() {
  const lang = useUI((s) => (s as any).lang as Lang) || 'en';
  return useCallback((s: string, vars?: Record<string, any>) => tr(lang, s, vars), [lang]);
}
export type T = ReturnType<typeof useT>;
