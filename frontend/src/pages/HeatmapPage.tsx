import { useMemo, useState } from 'react';
import {
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Select,
  Badge,
  Tooltip,
  Box,
  SimpleGrid,
  Progress,
  ThemeIcon,
  SegmentedControl,
  useMantineColorScheme,
} from '@mantine/core';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import type { Workout } from '../types/workout';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import { MuscleBodyModel } from '../components/MuscleBodyModel';
import type { MuscleId } from '../components/MuscleBody3D';
import type { GapData } from '../types/muscleGap';
import { GAP_COLORS } from '../types/muscleGap';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconFlame,
} from '@tabler/icons-react';

dayjs.extend(isoWeek);
dayjs.extend(dayOfYear);

const MUSCLE_LABELS: Record<MuscleId, string> = {
  frontDelts: 'Front Delts', rearDelts: 'Rear Delts', chest: 'Chest',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  traps: 'Traps', lats: 'Lats', abs: 'Abs', obliques: 'Obliques',
  lowerBack: 'Lower Back', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves',
};

const ALL_MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleId[];

// Rules applied in order — all matching rules are unioned
const MUSCLE_RULES: [RegExp, MuscleId[]][] = [
  [/squat/i,                        ['quads', 'glutes', 'hamstrings', 'abs']],
  [/deadlift/i,                     ['hamstrings', 'glutes', 'lowerBack', 'traps']],
  [/bench press/i,                  ['chest', 'frontDelts', 'triceps']],
  [/overhead press|shoulder press|strict press/i, ['frontDelts', 'triceps', 'abs']],
  [/push press/i,                   ['frontDelts', 'triceps', 'quads', 'abs']],
  [/clean/i,                        ['quads', 'glutes', 'hamstrings', 'traps', 'lats', 'abs']],
  [/snatch/i,                       ['quads', 'glutes', 'hamstrings', 'traps', 'lats', 'frontDelts', 'abs']],
  [/jerk/i,                         ['frontDelts', 'triceps', 'quads', 'abs']],
  [/pull.?up|chin.?up/i,            ['lats', 'biceps', 'rearDelts', 'forearms']],
  [/row/i,                          ['lats', 'rearDelts', 'biceps', 'traps']],
  [/thruster/i,                     ['quads', 'glutes', 'frontDelts', 'triceps', 'abs']],
  [/lunge/i,                        ['quads', 'glutes', 'hamstrings']],
  [/push.?up/i,                     ['chest', 'triceps', 'frontDelts']],
  [/dip/i,                          ['chest', 'triceps', 'frontDelts']],
  [/curl/i,                         ['biceps', 'forearms']],
  [/tricep/i,                       ['triceps']],
  [/box jump/i,                     ['quads', 'glutes', 'calves']],
  [/kettlebell|swing/i,             ['glutes', 'hamstrings', 'lowerBack', 'abs']],
  [/farmers? (carry|walk)/i,        ['forearms', 'traps']],
  [/handstand/i,                    ['frontDelts', 'triceps', 'abs']],
  [/muscle.?up/i,                   ['chest', 'lats', 'triceps', 'biceps']],
  [/run|sprint/i,                   ['quads', 'hamstrings', 'calves', 'glutes']],
  [/press/i,                        ['frontDelts', 'triceps']],
];

function getMusclesForTitle(title: string): Set<MuscleId> {
  const s = new Set<MuscleId>();
  for (const [re, list] of MUSCLE_RULES) if (re.test(title)) list.forEach(m => s.add(m));
  return s;
}

// ── Heatmap helpers ──────────────────────────────────────────────────────────

const DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getHeatColor(count: number, max: number, isDark: boolean): string {
  if (count === 0) return isDark ? '#2c2e33' : '#e9ecef';
  const t = Math.min(count / Math.max(max, 1), 1);
  if (t < 0.25) return '#9775fa';
  if (t < 0.5)  return '#7950f2';
  if (t < 0.75) return '#6741d9';
  return '#5f3dc4';
}

// Coverage thresholds (% of total sessions a muscle appears in)
const THRESHOLD_NEGLECTED = 10;  // < 10% → neglected
const THRESHOLD_LOW       = 25;  // < 25% → light

function coverageStatus(pct: number): 'neglected' | 'low' | 'good' {
  if (pct < THRESHOLD_NEGLECTED) return 'neglected';
  if (pct < THRESHOLD_LOW)       return 'low';
  return 'good';
}

const STATUS_META = {
  neglected: { color: 'red',    label: 'Neglected', icon: IconAlertTriangle },
  low:       { color: 'orange', label: 'Light',     icon: IconFlame },
  good:      { color: 'green',  label: 'Good',      icon: IconCircleCheck },
};

// ── Main page ────────────────────────────────────────────────────────────────

interface HeatmapPageProps { workouts: Workout[] }

export function HeatmapPage({ workouts }: HeatmapPageProps) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const years = useMemo(() => {
    const ys = new Set(workouts.map(w => dayjs(w.date).year()));
    return Array.from(ys).sort((a, b) => b - a).map(String);
  }, [workouts]);

  const [selectedYear, setSelectedYear] = useState(() => String(dayjs().year()));
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [highlightedMuscle, setHighlightedMuscle] = useState<MuscleId | null>(null);
  const [gapTimeRange, setGapTimeRange] = useState<30 | 90 | 180 | 'all'>('all');

  const toggleWorkout = (name: string) =>
    setSelectedWorkouts(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });

  const { cells, monthLabels, totalCount, maxPerDay } = useMemo(() => {
    const year = parseInt(selectedYear, 10);
    const countByDate: Record<string, number> = {};
    workouts.forEach(w => {
      if (dayjs(w.date).year() === year)
        countByDate[w.date] = (countByDate[w.date] ?? 0) + 1;
    });
    const maxPerDay = Math.max(...Object.values(countByDate), 1);
    const totalCount = Object.values(countByDate).reduce((a, b) => a + b, 0);

    const start = dayjs(`${year}-01-01`);
    const offset = start.isoWeekday() - 1;
    const daysInYear = dayjs(`${year}-12-31`).dayOfYear();
    const weeks = Math.ceil((offset + daysInYear) / 7);

    const cells: Array<{ date: string | null; count: number }> = [];
    for (let i = 0; i < weeks * 7; i++) {
      const di = i - offset;
      if (di < 0 || di >= daysInYear) { cells.push({ date: null, count: 0 }); continue; }
      const date = start.add(di, 'day').format('YYYY-MM-DD');
      cells.push({ date, count: countByDate[date] ?? 0 });
    }

    const monthLabels: Array<{ month: string; col: number }> = [];
    let lastMonth = -1;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell.date) continue;
      const m = dayjs(cell.date).month();
      if (m !== lastMonth) { monthLabels.push({ month: MONTHS[m], col: Math.floor(i / 7) }); lastMonth = m; }
    }
    return { cells, monthLabels, totalCount, maxPerDay };
  }, [workouts, selectedYear]);

  const numWeeks = Math.ceil(cells.length / 7);
  const CELL = 14, GAP = 3;
  const year = parseInt(selectedYear, 10);
  const yearWorkouts = workouts.filter(w => dayjs(w.date).year() === year);
  const totalSessions = yearWorkouts.length;

  // Time-range filtered workouts for gap analysis (independent of year selector)
  const gapWorkouts = useMemo(() => {
    if (gapTimeRange === 'all') return yearWorkouts;
    const cutoff = dayjs().subtract(gapTimeRange, 'day').toDate();
    return workouts.filter(w => new Date(w.date) >= cutoff);
  }, [yearWorkouts, workouts, gapTimeRange]);

  // Top workouts by frequency
  const topWorkouts = useMemo(() => {
    const counts: Record<string, number> = {};
    yearWorkouts.forEach(w => { counts[w.title] = (counts[w.title] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15)
      .map(([name, count]) => ({ name, count }));
  }, [yearWorkouts]);

  // Heatmap mode: muscle counts from selected year + multiselect filter
  const { muscleCounts, maxMuscleCount, activeMuscles } = useMemo(() => {
    const muscleCounts = new Map<MuscleId, number>();
    yearWorkouts.forEach(w => {
      const muscles = getMusclesForTitle(w.title);
      muscles.forEach(m => muscleCounts.set(m, (muscleCounts.get(m) ?? 0) + 1));
    });
    const maxMuscleCount = Math.max(...muscleCounts.values(), 1);

    let activeMuscles: Set<MuscleId> | null = null;
    if (selectedWorkouts.size > 0) {
      activeMuscles = new Set<MuscleId>();
      for (const name of selectedWorkouts) {
        getMusclesForTitle(name).forEach(m => activeMuscles!.add(m));
      }
    }
    return { muscleCounts, maxMuscleCount, activeMuscles };
  }, [yearWorkouts, selectedWorkouts]);

  // Gap analysis data (recomputed from gapWorkouts for time-range sensitivity)
  const { gapMuscleCounts, gapMaxMuscleCount, gapTotalSessions, muscleGaps, balanceScore, lastTrainedByMuscle } = useMemo(() => {
    const gapMuscleCounts = new Map<MuscleId, number>();
    gapWorkouts.forEach(w => {
      getMusclesForTitle(w.title).forEach(m =>
        gapMuscleCounts.set(m, (gapMuscleCounts.get(m) ?? 0) + 1)
      );
    });
    const gapTotalSessions = gapWorkouts.length;
    const gapMaxMuscleCount = Math.max(...Array.from(gapMuscleCounts.values()), 1);

    const muscleGaps = ALL_MUSCLES.map(id => {
      const count = gapMuscleCounts.get(id) ?? 0;
      const pct = gapTotalSessions > 0 ? (count / gapTotalSessions * 100) : 0;
      return { id, label: MUSCLE_LABELS[id], count, pct, status: coverageStatus(pct) };
    }).sort((a, b) => a.pct - b.pct);

    const goodCount = muscleGaps.filter(m => m.status === 'good').length;
    const balanceScore = Math.round((goodCount / ALL_MUSCLES.length) * 100);

    const lastTrainedByMuscle = new Map<MuscleId, string>();
    const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
    for (const w of sorted) {
      getMusclesForTitle(w.title).forEach(m => {
        if (!lastTrainedByMuscle.has(m)) lastTrainedByMuscle.set(m, w.date);
      });
    }

    return { gapMuscleCounts, gapMaxMuscleCount, gapTotalSessions, muscleGaps, balanceScore, lastTrainedByMuscle };
  }, [gapWorkouts, workouts]);

  const gapData: GapData = useMemo(() => ({
    entries: muscleGaps,
    totalSessions: gapTotalSessions,
    timeRangeDays: gapTimeRange,
  }), [muscleGaps, gapTotalSessions, gapTimeRange]);

  const neglectedCount = muscleGaps.filter(m => m.status === 'neglected').length;
  const lowCount       = muscleGaps.filter(m => m.status === 'low').length;

  // Radar chart data — normalised to 0-100
  const radarData = useMemo(() =>
    ALL_MUSCLES.map(id => ({
      muscle: MUSCLE_LABELS[id].replace(' ', '\n'),
      fullLabel: MUSCLE_LABELS[id],
      value: totalSessions > 0
        ? Math.round((muscleCounts.get(id) ?? 0) / totalSessions * 100)
        : 0,
    })),
    [muscleCounts, totalSessions],
  );

  const barHeight = 26;
  const chartHeight = topWorkouts.length * barHeight + 20;
  const radarColor = isDark ? '#9775fa' : '#7950f2';
  const gridColor  = isDark ? '#373a40' : '#dee2e6';
  const textColor  = isDark ? '#909296' : '#868e96';

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Activity Heatmap</Title>
          <Text c="dimmed" size="sm">Workout frequency by day</Text>
        </div>
        <Group gap="sm">
          <Badge variant="light" color="violet" size="lg">{totalCount} workouts</Badge>
          <Select data={years} value={selectedYear} onChange={v => v && setSelectedYear(v)} w={90} size="sm" />
        </Group>
      </Group>

      {/* Calendar heatmap */}
      <Paper withBorder p="md" radius="md" style={{ overflowX: 'auto' }}>
        <Box style={{ display: 'inline-block', minWidth: numWeeks * (CELL + GAP) + 40 }}>
          <Box style={{ position: 'relative', marginLeft: 32, marginBottom: 4, height: 16 }}>
            {monthLabels.map(({ month, col }) => (
              <Text key={`${month}-${col}`} size="xs" c="dimmed"
                style={{ position: 'absolute', left: col * (CELL + GAP), pointerEvents: 'none' }}>
                {month}
              </Text>
            ))}
          </Box>
          <Box style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <Box style={{ display: 'flex', flexDirection: 'column', gap: GAP, marginRight: 4 }}>
              {DAYS.map(d => (
                <Text key={d} size="xs" c="dimmed"
                  style={{ height: CELL, lineHeight: `${CELL}px`, width: 24, textAlign: 'right' }}>{d}</Text>
              ))}
            </Box>
            <Box style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${numWeeks}, ${CELL}px)`,
              gridTemplateRows: `repeat(7, ${CELL}px)`,
              gridAutoFlow: 'column',
              gap: GAP,
            }}>
              {cells.map((cell, i) => {
                if (!cell.date) return <Box key={i} style={{ width: CELL, height: CELL, borderRadius: 3 }} />;
                const color = getHeatColor(cell.count, maxPerDay, isDark);
                return (
                  <Tooltip key={cell.date} fz="xs" withArrow
                    label={cell.count > 0
                      ? `${dayjs(cell.date).format('MMM D, YYYY')} — ${cell.count} workout${cell.count > 1 ? 's' : ''}`
                      : dayjs(cell.date).format('MMM D, YYYY')}>
                    <Box
                      style={{ width: CELL, height: CELL, borderRadius: 3, backgroundColor: color, transition: 'transform 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
          </Box>
          <Group gap={4} justify="flex-end" mt="sm">
            <Text size="xs" c="dimmed">Less</Text>
            {[0, 0.2, 0.5, 0.8, 1].map(v => (
              <Box key={v} style={{
                width: CELL, height: CELL, borderRadius: 3,
                backgroundColor: v === 0 ? (isDark ? '#2c2e33' : '#e9ecef') : getHeatColor(v, 1, isDark),
              }} />
            ))}
            <Text size="xs" c="dimmed">More</Text>
          </Group>
        </Box>
      </Paper>

      {/* ── Section 2: Workout frequency + Heatmap 3D ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">

        {/* Frequency bar chart — multi-select */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb={4}>
            <Text fw={600}>Most Frequent Workouts</Text>
            {selectedWorkouts.size > 0 && (
              <Group gap={6}>
                <Badge size="xs" color="violet" variant="filled">{selectedWorkouts.size} selected</Badge>
                <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedWorkouts(new Set())}>✕ clear</Text>
              </Group>
            )}
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            {selectedWorkouts.size > 0
              ? `Showing muscles for ${selectedWorkouts.size} workout${selectedWorkouts.size > 1 ? 's' : ''}`
              : 'Click bars to highlight muscles — select multiple'}
          </Text>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={topWorkouts} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} tickLine={false} />
              <RechartsTooltip
                formatter={(v: number) => [v, 'sessions']}
                contentStyle={{
                  background: isDark ? '#25262b' : '#fff',
                  border: `1px solid ${isDark ? '#373a40' : '#dee2e6'}`,
                  borderRadius: 8, fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data: { name: string }) => toggleWorkout(data.name)}
              >
                {topWorkouts.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={selectedWorkouts.has(entry.name)
                      ? '#7950f2'
                      : selectedWorkouts.size > 0
                        ? (isDark ? '#3a3d47' : '#dee2e6')
                        : (isDark ? '#4a4e57' : '#ced4da')}
                    stroke={selectedWorkouts.has(entry.name) ? '#5f3dc4' : 'none'}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>

        {/* Heatmap 3D — frequency only */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text fw={600}>Muscle Map 3D</Text>
            <Text size="xs" c="dimmed">
              {activeMuscles ? `${activeMuscles.size} muscles highlighted` : 'All workouts (frequency)'}
            </Text>
          </Group>
          <MuscleBodyModel
            activeMuscles={activeMuscles}
            muscleCounts={muscleCounts}
            maxCount={maxMuscleCount}
            isDark={isDark}
            height={480}
          />
          {activeMuscles && activeMuscles.size > 0 && (
            <Group gap={6} mt="xs" wrap="wrap">
              {[...activeMuscles].map(m => (
                <Badge key={m} size="xs" variant="light" color="violet">{MUSCLE_LABELS[m]}</Badge>
              ))}
            </Group>
          )}
        </Paper>
      </SimpleGrid>

      {/* ── Section 3: Gap Analysis 3D + list ── */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">

        {/* Gap Analysis 3D */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs" align="center">
            <div>
              <Text fw={600}>Gap Analysis 3D</Text>
              <Text size="xs" c="dimmed">Neglected muscles pulse red</Text>
            </div>
            <Badge
              size="lg"
              variant="filled"
              color={balanceScore >= 80 ? 'green' : balanceScore >= 50 ? 'orange' : 'red'}
              radius="xl"
            >
              Balance {balanceScore}%
            </Badge>
          </Group>
          <SegmentedControl
            size="xs"
            fullWidth
            mb="xs"
            value={String(gapTimeRange)}
            onChange={v => setGapTimeRange(v === 'all' ? 'all' : Number(v) as 30 | 90 | 180)}
            data={[
              { label: '30d', value: '30' },
              { label: '90d', value: '90' },
              { label: '180d', value: '180' },
              { label: 'All', value: 'all' },
            ]}
          />
          <MuscleBodyModel
            activeMuscles={null}
            muscleCounts={gapMuscleCounts}
            maxCount={gapMaxMuscleCount}
            isDark={isDark}
            height={480}
            gapMode={true}
            gapData={gapData}
            highlightedMuscle={highlightedMuscle}
          />
          <Group gap="md" justify="center" mt="xs">
            {(['neglected', 'low', 'good'] as const).map(s => (
              <Group key={s} gap={4}>
                <Box style={{ width: 10, height: 10, borderRadius: '50%', background: GAP_COLORS[s] }} />
                <Text size="xs" c="dimmed">{STATUS_META[s].label}</Text>
              </Group>
            ))}
          </Group>
        </Paper>

        {/* Gap analysis list */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb={4}>
            <Text fw={600}>Muscle Gap Analysis</Text>
            <Group gap={6}>
              {neglectedCount > 0 && (
                <Badge size="xs" color="red" variant="light">{neglectedCount} neglected</Badge>
              )}
              {lowCount > 0 && (
                <Badge size="xs" color="orange" variant="light">{lowCount} light</Badge>
              )}
            </Group>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Based on {gapTotalSessions} sessions · target: each muscle in &gt;25% · click to highlight
          </Text>
          <Stack gap={8}>
            {muscleGaps.map(({ id, label, pct, status }) => {
              const meta = STATUS_META[status];
              const isSelected = highlightedMuscle === id;
              return (
                <Tooltip
                  key={id}
                  label={
                    <Stack gap={2}>
                      <Text size="xs" fw={600}>{label}</Text>
                      <Text size="xs">Status: {meta.label}</Text>
                      <Text size="xs">{Math.round(pct)}% of sessions</Text>
                      <Text size="xs">
                        Last trained:{' '}
                        {lastTrainedByMuscle.get(id)
                          ? dayjs(lastTrainedByMuscle.get(id)).format('MMM D, YYYY')
                          : 'Never'}
                      </Text>
                    </Stack>
                  }
                  withArrow
                  multiline
                  position="left"
                  w={180}
                >
                  <Box
                    style={{
                      cursor: 'pointer',
                      borderRadius: 6,
                      padding: '4px 6px',
                      background: isSelected
                        ? (isDark ? 'rgba(224,49,49,0.12)' : 'rgba(224,49,49,0.08)')
                        : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onClick={() => setHighlightedMuscle(prev => prev === id ? null : id)}
                  >
                    <Group justify="space-between" mb={3}>
                      <Group gap={6}>
                        <ThemeIcon size={16} color={meta.color} variant="light" radius="xl">
                          <meta.icon size={10} />
                        </ThemeIcon>
                        <Text size="xs" fw={status !== 'good' ? 600 : 400}
                          c={status === 'neglected' ? 'red' : status === 'low' ? 'orange' : undefined}>
                          {label}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">{Math.round(pct)}%</Text>
                    </Group>
                    <Progress
                      value={Math.min(pct, 100)}
                      size="sm"
                      color={status === 'neglected' ? 'red' : status === 'low' ? 'orange' : 'violet'}
                      radius="xl"
                    />
                  </Box>
                </Tooltip>
              );
            })}
          </Stack>
          <Group gap="xs" mt="md" pt="sm" style={{ borderTop: `1px solid ${gridColor}` }}>
            {Object.entries(STATUS_META).map(([key, { color, label, icon: Icon }]) => (
              <Group key={key} gap={4}>
                <ThemeIcon size={14} color={color} variant="light" radius="xl">
                  <Icon size={8} />
                </ThemeIcon>
                <Text size="xs" c="dimmed">
                  {key === 'neglected' ? `< ${THRESHOLD_NEGLECTED}%` : key === 'low' ? `< ${THRESHOLD_LOW}%` : `≥ ${THRESHOLD_LOW}%`}
                  {' '}{label}
                </Text>
              </Group>
            ))}
          </Group>
        </Paper>
      </SimpleGrid>

      {/* ── Section 4: Muscle Balance Radar (bottom) ── */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb={4}>Muscle Balance Radar</Text>
        <Text size="xs" c="dimmed" mb="sm">
          % of sessions each muscle group was trained ({selectedYear})
        </Text>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis
              dataKey="muscle"
              tick={{ fill: textColor, fontSize: 10 }}
            />
            <Radar
              dataKey="value"
              stroke={radarColor}
              fill={radarColor}
              fillOpacity={0.3}
              strokeWidth={2}
              dot={{ r: 3, fill: radarColor }}
            />
            <RechartsTooltip
              formatter={(v: number, _: string, p: { payload?: { fullLabel?: string } }) =>
                [`${v}% of sessions`, p.payload?.fullLabel ?? '']}
              contentStyle={{
                background: isDark ? '#25262b' : '#fff',
                border: `1px solid ${isDark ? '#373a40' : '#dee2e6'}`,
                borderRadius: 8, fontSize: 12,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Paper>
    </Stack>
  );
}
