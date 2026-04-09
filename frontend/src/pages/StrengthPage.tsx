import { useMemo, useState } from 'react';
import {
  Title,
  Text,
  Stack,
  Paper,
  Select,
  Group,
  Badge,
  SimpleGrid,
  Center,
  ThemeIcon,
  Tooltip as MantineTooltip,
} from '@mantine/core';
import { IconBarbell, IconStar } from '@tabler/icons-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import type { Workout } from '../types/workout';
import dayjs from 'dayjs';
import { getStrengthLevel, getStrengthStandards } from '../lib/exerciseDb';

interface StrengthPageProps {
  workouts: Workout[];
}

// Epley 1RM formula: weight * (1 + reps / 30)
export function epley1RM(load: number, reps: number): number {
  if (reps === 1) return load;
  return Math.round(load * (1 + reps / 30));
}

export function StrengthPage({ workouts }: StrengthPageProps) {
  const lifts = useMemo(() => {
    const liftSet = new Set<string>();
    workouts
      .filter((w) => w.score_type === 'Load' && w.barbell_lift)
      .forEach((w) => liftSet.add(w.barbell_lift));
    return Array.from(liftSet).sort();
  }, [workouts]);

  const [selectedLift, setSelectedLift] = useState<string | null>(lifts[0] ?? null);

  const liftData = useMemo(() => {
    if (!selectedLift) return [];
    return workouts
      .filter((w) => w.barbell_lift === selectedLift && w.best_result_raw != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((w) => ({
        date: dayjs(w.date).format('MMM D'),
        load: w.best_result_raw as number,
        pr: w.pr,
        display: w.best_result_display,
        fullDate: w.date,
        est1RM: w.set_details.length > 0
          ? epley1RM(
              Math.max(...w.set_details.map((s) => s.load ?? 0)),
              w.set_details.length,
            )
          : w.best_result_raw as number,
      }));
  }, [workouts, selectedLift]);

  const prPoints = liftData.filter((d) => d.pr);

  const maxLoad = liftData.length > 0 ? Math.max(...liftData.map((d) => d.load)) : 0;
  const firstLoad = liftData[0]?.load ?? 0;
  const progression = firstLoad > 0 ? Math.round(((maxLoad - firstLoad) / firstLoad) * 100) : 0;

  const liftWorkouts = workouts.filter(
    (w) => w.barbell_lift === selectedLift && w.score_type === 'Load',
  );

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Strength Progression</Title>
        <Text c="dimmed" size="sm">Track your barbell lift performance over time</Text>
      </div>

      <Select
        label="Select lift"
        placeholder="Choose a lift"
        data={lifts}
        value={selectedLift}
        onChange={setSelectedLift}
        w={280}
      />

      {!selectedLift || liftData.length === 0 ? (
        <Center mih={300}>
          <Stack align="center">
            <ThemeIcon size={60} variant="light" color="violet">
              <IconBarbell size={30} />
            </ThemeIcon>
            <Text c="dimmed">No data for selected lift</Text>
          </Stack>
        </Center>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 5 }}>
            <Paper withBorder p="md" radius="md" ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Sessions</Text>
              <Text fw={700} size="xl">{liftWorkouts.length}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md" ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Max Load</Text>
              <Text fw={700} size="xl">{maxLoad} kg</Text>
            </Paper>
            <Paper withBorder p="md" radius="md" ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>PRs</Text>
              <Text fw={700} size="xl">{prPoints.length}</Text>
            </Paper>
            <Paper withBorder p="md" radius="md" ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Progression</Text>
              <Text fw={700} size="xl" c={progression >= 0 ? 'green' : 'red'}>
                {progression >= 0 ? '+' : ''}{progression}%
              </Text>
            </Paper>
            {selectedLift && (() => {
              const level = getStrengthLevel(selectedLift, maxLoad);
              const levelColors: Record<string, string> = {
                beginner: 'gray', novice: 'blue', intermediate: 'teal',
                advanced: 'violet', elite: 'yellow',
              };
              return (
                <MantineTooltip label="Based on CrossFit strength standards (kg)" withArrow>
                  <Paper withBorder p="md" radius="md" ta="center" style={{ cursor: 'default' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={500}>Level</Text>
                    {level ? (
                      <Group justify="center" gap={4} mt={4}>
                        <IconStar size={16} color={`var(--mantine-color-${levelColors[level]}-5)`} />
                        <Text fw={700} size="lg" c={levelColors[level]} tt="capitalize">{level}</Text>
                      </Group>
                    ) : (
                      <Text fw={700} size="xl" c="dimmed">—</Text>
                    )}
                  </Paper>
                </MantineTooltip>
              );
            })()}
          </SimpleGrid>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={600}>{selectedLift} — Load over time</Text>
              <Badge variant="light" color="yellow" size="sm">★ = PR</Badge>
            </Group>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={liftData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                <Tooltip
                  formatter={(value) => [`${value} kg`, 'Load']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="load"
                  stroke="var(--mantine-color-violet-6)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                {prPoints.map((p, i) => (
                  <ReferenceDot
                    key={i}
                    x={p.date}
                    y={p.load}
                    r={8}
                    fill="var(--mantine-color-yellow-5)"
                    stroke="none"
                    label={{ value: '★', position: 'top', fontSize: 12 }}
                  />
                ))}
                {selectedLift && (() => {
                  const std = getStrengthStandards(selectedLift);
                  if (!std) return null;
                  const lines: { key: string; value: number; color: string; label: string }[] = [
                    { key: 'novice',       value: std.novice,       color: '#74c0fc', label: 'Novice' },
                    { key: 'intermediate', value: std.intermediate, color: '#63e6be', label: 'Inter.' },
                    { key: 'advanced',     value: std.advanced,     color: '#b197fc', label: 'Advanced' },
                    { key: 'elite',        value: std.elite,        color: '#ffd43b', label: 'Elite' },
                  ];
                  return lines.map(l => (
                    <ReferenceLine
                      key={l.key}
                      y={l.value}
                      stroke={l.color}
                      strokeDasharray="4 3"
                      strokeOpacity={0.7}
                      label={{ value: l.label, position: 'insideTopRight', fontSize: 10, fill: l.color }}
                    />
                  ));
                })()}
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Text fw={600} mb="md">Session History</Text>
            <Stack gap={6}>
              {liftWorkouts
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((w, i) => (
                  <Group key={i} justify="space-between" py={6}
                    style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                    <Group gap="sm">
                      <Text size="sm" c="dimmed" w={96}>
                        {dayjs(w.date).format('MMM D, YYYY')}
                      </Text>
                      <Text size="sm" fw={500}>{w.title}</Text>
                    </Group>
                    <Group gap={6}>
                      {w.pr && <Badge size="xs" color="yellow">PR</Badge>}
                      <Text size="sm" fw={600}>{w.best_result_display} kg</Text>
                    </Group>
                  </Group>
                ))}
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
}
