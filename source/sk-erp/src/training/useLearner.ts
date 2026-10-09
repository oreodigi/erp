// The signed-in learner: their curriculum (from role + effective permissions) and live progress.
import { useMemo } from 'react';
import { useRole } from '../components/AppShell';
import { OPEN_ROUTES } from '../nav';
import { buildCurriculum, type Curriculum } from './curriculum';
import { computeProgress, type Progress } from './progress';
import { useTraining } from './store';

export function useLearner(): { curriculum: Curriculum; progress: Progress; role: any; user: any } {
  const { role, allowed, user } = useRole();
  const records = useTraining((s) => s.records);
  const quizzes = useTraining((s) => s.quizzes);
  const settings = useTraining((s) => s.settings);
  const allowedKey = [...allowed].sort().join('|');
  const curriculum = useMemo(() => buildCurriculum({ role: role.code, allowed: [...allowed, ...OPEN_ROUTES] }), [role.code, allowedKey]);
  const progress = useMemo(() => computeProgress(curriculum, records, quizzes, settings), [curriculum, records, quizzes, settings]);
  return { curriculum, progress, role, user };
}
