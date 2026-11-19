import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };

const loadLeaderboard = () => getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard');

export default function Leaderboard() {
  return (
    <CapabilityCard<LeaderboardEntry>
      title="Leaderboard"
      description="Compare team point totals."
      loadData={loadLeaderboard}
      collectionKey="leaderboard"
      emptyMessage="No leaderboard scores yet."
      renderItem={(entry) => `${entry.rank}. ${entry.teamName} · ${entry.totalPoints} points`}
    />
  );
}
