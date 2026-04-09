import { useMemo } from 'react';
import {
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Badge,
  SimpleGrid,
  ThemeIcon,
  Center,
} from '@mantine/core';
import { IconTrophy, IconMedal } from '@tabler/icons-react';
import type { Workout } from '../types/workout';
import dayjs from 'dayjs';
import { getStrengthLevel } from '../lib/exerciseDb';

interface PRBoardPageProps {
  workouts: Workout[];
}

interface LiftPR {
  lift: string;
  load: number;
  display: string;
  date: string;
  title: string;
  history: { date: string; load: number; display: string }[];
}

export function PRBoardPage({ workouts }: PRBoardPageProps) {
  const prsByLift = useMemo(() => {
    const liftMap = new Map<string, LiftPR>();

    workouts
      .filter((w) => w.score_type === 'Load' && w.barbell_lift && w.best_result_raw != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((w) => {
        const key = w.barbell_lift;
        const existing = liftMap.get(key);
        const entry = {
          date: w.date,
          load: w.best_result_raw as number,
          display: w.best_result_display,
        };
        if (!existing || (w.best_result_raw as number) > existing.load) {
          liftMap.set(key, {
            lift: key,
            load: w.best_result_raw as number,
            display: w.best_result_display,
            date: w.date,
            title: w.title,
            history: [...(existing?.history ?? []), entry],
          });
        } else {
          existing.history.push(entry);
        }
      });

    return Array.from(liftMap.values()).sort((a, b) => b.load - a.load);
  }, [workouts]);

  const allPRWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => w.pr)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [workouts],
  );

  if (prsByLift.length === 0 && allPRWorkouts.length === 0) {
    return (
      <Center mih={400}>
        <Stack align="center">
          <ThemeIcon size={80} variant="light" color="yellow">
            <IconTrophy size={40} />
          </ThemeIcon>
          <Title order={3}>No PRs yet</Title>
          <Text c="dimmed">Import your SugarWOD data to see your personal records</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>PR Board</Title>
        <Text c="dimmed" size="sm">Your personal records by lift</Text>
      </div>

      {prsByLift.length > 0 && (
        <>
          <Text fw={600} size="lg">Barbell Lifts</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {prsByLift.map((pr, i) => (
              <Paper key={pr.lift} withBorder p="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ThemeIcon
                      size={28}
                      variant="light"
                      color={i === 0 ? 'yellow' : i === 1 ? 'gray' : i === 2 ? 'orange' : 'violet'}
                    >
                      {i < 3 ? <IconMedal size={16} /> : <IconTrophy size={16} />}
                    </ThemeIcon>
                    <Text fw={600}>{pr.lift}</Text>
                  </Group>
                  <Badge color="yellow" variant="filled" size="lg">
                    {pr.display} kg
                  </Badge>
                </Group>
                <Group justify="space-between" align="center">
                  <div>
                    <Text size="xs" c="dimmed">
                      Set on {dayjs(pr.date).format('MMM D, YYYY')}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      {pr.history.length} session{pr.history.length !== 1 ? 's' : ''} recorded
                    </Text>
                  </div>
                  {(() => {
                    const level = getStrengthLevel(pr.lift, pr.load);
                    if (!level) return null;
                    const levelColors: Record<string, string> = {
                      beginner: 'gray', novice: 'blue', intermediate: 'teal',
                      advanced: 'violet', elite: 'yellow',
                    };
                    return (
                      <Badge size="sm" variant="light" color={levelColors[level]} tt="capitalize">
                        {level}
                      </Badge>
                    );
                  })()}
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </>
      )}

      {allPRWorkouts.length > 0 && (
        <>
          <Text fw={600} size="lg" mt="sm">All PR Workouts</Text>
          <Paper withBorder p="md" radius="md">
            <Stack gap={6}>
              {allPRWorkouts.map((w, i) => (
                <Group
                  key={i}
                  justify="space-between"
                  py={8}
                  style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
                >
                  <Group gap="sm">
                    <ThemeIcon size={24} variant="light" color="yellow">
                      <IconTrophy size={12} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={500}>{w.title}</Text>
                      <Text size="xs" c="dimmed">{dayjs(w.date).format('MMM D, YYYY')}</Text>
                    </div>
                  </Group>
                  <Group gap={8}>
                    <Badge variant="light" color={w.rx_or_scaled === 'RX' ? 'green' : 'gray'} size="sm">
                      {w.rx_or_scaled || '—'}
                    </Badge>
                    {w.best_result_display && (
                      <Text size="sm" fw={600}>{w.best_result_display}</Text>
                    )}
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
