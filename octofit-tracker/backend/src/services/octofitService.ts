import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const { userId, teamId, type, minutes } = body;
  if (
    typeof userId !== 'string' ||
    !mongoose.Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' ||
    !mongoose.Types.ObjectId.isValid(teamId) ||
    typeof type !== 'string' ||
    type.trim().length === 0 ||
    typeof minutes !== 'number' ||
    !Number.isFinite(minutes) ||
    minutes < 1
  ) {
    throw Object.assign(new Error('Invalid activity input'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const { name, mascot } = body;
  const members = body.members ?? [];
  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    typeof mascot !== 'string' ||
    mascot.trim().length === 0 ||
    !Array.isArray(members) ||
    members.some((member) => typeof member !== 'string' || !mongoose.Types.ObjectId.isValid(member))
  ) {
    throw Object.assign(new Error('Invalid team input'), { status: 400 });
  }

  const memberIds = [...new Set(members as string[])].map((memberId) => new mongoose.Types.ObjectId(memberId));
  const users = memberIds.length > 0
    ? await User.find({ _id: { $in: memberIds } })
    : [];
  if (users.length !== memberIds.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberIds,
  });
  if (memberIds.length > 0) {
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { team: team._id } });
  }
  return team;
}

export async function getLeaderboard() {
  const [teams, activityTotals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(
    activityTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]),
  );
  const leaderboard = teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName));

  return leaderboard.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [activity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const activityType = activity?.type.toLowerCase();
  const fitnessGoal = user.fitnessGoal.toLowerCase();
  const activityMatch = workouts.find(({ focus }) => {
    const normalizedFocus = focus.toLowerCase();
    return normalizedFocus === activityType ||
      (activityType !== undefined && /run|jog/.test(activityType) && normalizedFocus.includes('endurance'));
  });
  const workout = activityMatch ??
    workouts.find(({ focus }) => focus.toLowerCase() === fitnessGoal) ??
    workouts[0];

  if (!workout) return [];

  const reason = activityMatch
    ? `Recommended because your recent ${activity?.type} activity aligns with ${workout.focus} training.`
    : `Recommended to support your ${user.fitnessGoal} fitness goal.`;
  return [{ ...workout, reason }];
}

export { User };
