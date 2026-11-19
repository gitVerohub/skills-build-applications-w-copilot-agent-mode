import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = { title: string; reason?: string };

const loadWorkoutSuggestions = () => getJson<{ suggestions: WorkoutSuggestion[] }>(
  '/api/workouts/suggestions/mona@example.com',
);

export default function Workouts() {
  return (
    <CapabilityCard<WorkoutSuggestion>
      title="Workout suggestions"
      description="Recommend workouts from activity patterns."
      loadData={loadWorkoutSuggestions}
      collectionKey="suggestions"
      emptyMessage="No workout suggestions yet."
      renderItem={(suggestion) => suggestion.reason
        ? `${suggestion.title} · ${suggestion.reason}`
        : suggestion.title}
    />
  );
}
