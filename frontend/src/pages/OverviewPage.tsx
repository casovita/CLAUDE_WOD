import {
  Title,
  Text,
  Stack,
  SimpleGrid,
  Paper,
  Group,
  Badge,
  RingProgress,
  Center,
  Button,
  ThemeIcon,
  Progress,
} from '@mantine/core';
import {
  IconBarbell,
  IconTrophy,
  IconFlame,
  IconCalendar,
  IconUpload,
  IconMuscle,
  IconTool,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { Workout } from '../types/workout';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useExerciseDb, getWeightedMuscles, getMuscleMatch } from '../lib/exerciseDb';

dayjs.extend(isoWeek);

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group>
        <ThemeIcon color={color} size={44} radius="md" variant="light">
          {icon}
        </ThemeIcon>
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={500}>
            {label}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
        </div>
      </Group>
    </Paper>
  );
}

interface OverviewPageProps {
  workouts: Workout[];
}

// Human-readable labels for MuscleId values
const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', frontDelts: 'Shoulders', rearDelts: 'Rear Delts',
  triceps: 'Triceps', biceps: 'Biceps', forearms: 'Forearms',
  lats: 'Lats', traps: 'Traps', lowerBack: 'Lower Back',
  abs: 'Abs', obliques: 'Obliques', quads: 'Quads',
  hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
};

export function OverviewPage({ workouts }: OverviewPageProps) {
  const navigate = useNavigate();
  const dbLoaded = useExerciseDb();

  const stats = useMemo(() => {
    const total = workouts.length;
    const prs = workouts.filter((w) => w.pr).length;
    const rx = workouts.filter((w) => w.rx_or_scaled === 'RX').length;
    const rxPct = total > 0 ? Math.round((rx / total) * 100) : 0;

    const dates = workouts.map((w) => w.date).sort();
    const weeks = new Set(dates.map((d) => dayjs(d).isoWeek() + '-' + dayjs(d).year()));
    const activeWeeks = weeks.size;

    // Workouts per month for bar chart
    const byMonth: Record<string, number> = {};
    workouts.forEach((w) => {
      const key = dayjs(w.date).format('MMM YY');
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    });
    const monthlyData = Object.entries(byMonth)
      .map(([month, count]) => ({ month, count }))
      .slice(-12);

    // Longest streak
    const sortedDates = [...new Set(dates)].sort();
    let streak = 1;
    let maxStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = dayjs(sortedDates[i]).diff(dayjs(sortedDates[i - 1]), 'day');
      if (diff === 1) {
        streak++;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }

    // Top muscle groups (weighted: primary=1.0, secondary=0.4)
    const muscleTotals = new Map<string, number>();
    for (const w of workouts) {
      const weighted = getWeightedMuscles(w.title);
      for (const [muscle, weight] of weighted) {
        muscleTotals.set(muscle, (muscleTotals.get(muscle) ?? 0) + weight);
      }
    }
    const topMuscles = [...muscleTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, score]) => ({ id, label: MUSCLE_LABELS[id] ?? id, score }));
    const maxMuscleScore = topMuscles[0]?.score ?? 1;

    // Equipment breakdown
    const equipmentCounts = new Map<string, number>();
    for (const w of workouts) {
      const match = getMuscleMatch(w.title);
      if (match.equipment) {
        const eq = match.equipment;
        equipmentCounts.set(eq, (equipmentCounts.get(eq) ?? 0) + 1);
      }
    }
    const topEquipment = [...equipmentCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return { total, prs, rxPct, activeWeeks, monthlyData, maxStreak, topMuscles, maxMuscleScore, topEquipment };
  }, [workouts, dbLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  if (workouts.length === 0) {
    return (
      <Center mih={400}>
        <Stack align="center" gap="md">
          <ThemeIcon size={80} radius="xl" variant="light" color="violet">
            <IconBarbell size={40} />
          </ThemeIcon>
          <Title order={3}>No workouts yet</Title>
          <Text c="dimmed">Import your SugarWOD export to get started</Text>
          <Button
            leftSection={<IconUpload size={16} />}
            onClick={() => navigate('/upload')}
          >
            Import Workouts
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Overview</Title>
        <Text c="dimmed" size="sm">Your training at a glance</Text>
      </div>

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        <StatCard
          icon={<IconBarbell size={22} />}
          label="Total Workouts"
          value={stats.total}
          color="violet"
        />
        <StatCard
          icon={<IconTrophy size={22} />}
          label="Personal Records"
          value={stats.prs}
          color="yellow"
        />
        <StatCard
          icon={<IconFlame size={22} />}
          label="Longest Streak"
          value={`${stats.maxStreak}d`}
          color="orange"
        />
        <StatCard
          icon={<IconCalendar size={22} />}
          label="Active Weeks"
          value={stats.activeWeeks}
          color="teal"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="md">
            <Text fw={600}>RX Rate</Text>
            <Badge color={stats.rxPct >= 80 ? 'green' : stats.rxPct >= 50 ? 'yellow' : 'red'}>
              {stats.rxPct}%
            </Badge>
          </Group>
          <Center>
            <RingProgress
              size={140}
              thickness={14}
              roundCaps
              sections={[{ value: stats.rxPct, color: 'violet' }]}
              label={
                <Text ta="center" fw={700} size="lg">
                  {stats.rxPct}%
                </Text>
              }
            />
          </Center>
          <Text ta="center" size="sm" c="dimmed" mt="xs">
            of workouts completed RX
          </Text>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="md">Workouts per Month</Text>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--mantine-color-violet-6)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </SimpleGrid>

      {(stats.topMuscles.length > 0 || stats.topEquipment.length > 0) && (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {stats.topMuscles.length > 0 && (
            <Paper withBorder p="md" radius="md">
              <Group gap="xs" mb="md">
                <IconMuscle size={16} />
                <Text fw={600}>Top Muscle Groups</Text>
              </Group>
              <Stack gap={8}>
                {stats.topMuscles.map(({ id, label, score }) => (
                  <div key={id}>
                    <Group justify="space-between" mb={2}>
                      <Text size="sm">{label}</Text>
                      <Text size="xs" c="dimmed">{Math.round(score)}</Text>
                    </Group>
                    <Progress
                      value={(score / stats.maxMuscleScore) * 100}
                      color="violet"
                      size="sm"
                      radius="xl"
                    />
                  </div>
                ))}
              </Stack>
            </Paper>
          )}

          {stats.topEquipment.length > 0 && (
            <Paper withBorder p="md" radius="md">
              <Group gap="xs" mb="md">
                <IconTool size={16} />
                <Text fw={600}>Equipment Used</Text>
              </Group>
              <Stack gap={8}>
                {stats.topEquipment.map(({ name, count }) => (
                  <Group key={name} justify="space-between">
                    <Text size="sm" tt="capitalize">{name}</Text>
                    <Badge size="sm" variant="light" color="violet">{count}</Badge>
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}
        </SimpleGrid>
      )}

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="xs">Recent Workouts</Text>
        <Stack gap={6}>
          {workouts
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 8)
            .map((w, i) => (
              <Group key={i} justify="space-between" py={6} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                <Group gap="sm">
                  <Text size="sm" c="dimmed" w={84}>
                    {dayjs(w.date).format('MMM D, YYYY')}
                  </Text>
                  <Text size="sm" fw={500}>{w.title}</Text>
                </Group>
                <Group gap={6}>
                  {w.pr && <Badge size="xs" color="yellow">PR</Badge>}
                  <Badge size="xs" variant="light" color={w.rx_or_scaled === 'RX' ? 'green' : 'gray'}>
                    {w.rx_or_scaled || '—'}
                  </Badge>
                  {w.best_result_display && (
                    <Text size="sm" c="dimmed">{w.best_result_display}</Text>
                  )}
                </Group>
              </Group>
            ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
