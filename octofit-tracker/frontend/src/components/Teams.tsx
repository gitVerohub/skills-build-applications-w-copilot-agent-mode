import { CapabilityCard } from './CapabilityCard.js';
import { getJson } from '../api/client.js';

type Team = { name: string; members?: unknown[] };

const loadTeams = () => getJson<{ teams: Team[] }>('/api/teams');

export default function Teams() {
  return (
    <CapabilityCard<Team>
      title="Teams"
      description="Manage teams and members."
      loadData={loadTeams}
      collectionKey="teams"
      emptyMessage="No teams yet."
      renderItem={(team) => `${team.name} · ${team.members?.length ?? 0} members`}
    />
  );
}
