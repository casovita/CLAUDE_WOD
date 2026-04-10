import { useState, useMemo } from 'react';
import {
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Badge,
  TextInput,
  Select,
  Table,
  Pagination,
  ActionIcon,
  Box,
  Image,
  Skeleton,
} from '@mantine/core';
import { IconSearch, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { Workout } from '../types/workout';
import dayjs from 'dayjs';
import { useExerciseDb, getMuscleMatch } from '../lib/exerciseDb';

interface WorkoutLogPageProps {
  workouts: Workout[];
}

const PAGE_SIZE = 20;

export function WorkoutLogPage({ workouts }: WorkoutLogPageProps) {
  const dbLoaded = useExerciseDb();
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState<string | null>(null);
  const [rxFilter, setRxFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return workouts
      .filter((w) => {
        const matchSearch =
          !search ||
          w.title.toLowerCase().includes(search.toLowerCase()) ||
          w.description.toLowerCase().includes(search.toLowerCase());
        const matchScore = !scoreFilter || w.score_type === scoreFilter;
        const matchRx = !rxFilter || w.rx_or_scaled === rxFilter;
        return matchSearch && matchScore && matchRx;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [workouts, search, scoreFilter, rxFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const scoreTypes = useMemo(() => {
    const types = new Set(workouts.map((w) => w.score_type).filter(Boolean));
    return Array.from(types).map((t) => ({ value: t, label: t }));
  }, [workouts]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Workout Log</Title>
          <Text c="dimmed" size="sm">
            {filtered.length} of {workouts.length} workouts
          </Text>
        </div>
      </Group>

      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Search workouts…"
          leftSection={<IconSearch size={14} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          w={260}
        />
        <Select
          placeholder="Score type"
          data={scoreTypes}
          value={scoreFilter}
          onChange={(v) => { setScoreFilter(v); setPage(1); }}
          clearable
          w={150}
        />
        <Select
          placeholder="RX / Scaled"
          data={[{ value: 'RX', label: 'RX' }, { value: 'SCALED', label: 'Scaled' }]}
          value={rxFilter}
          onChange={(v) => { setRxFilter(v); setPage(1); }}
          clearable
          w={140}
        />
      </Group>

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Workout</Table.Th>
              <Table.Th>Result</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>RX</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          {paginated.map((w, i) => {
              const idx = (page - 1) * PAGE_SIZE + i;
              const isOpen = expandedRow === idx;
              return (
                <Table.Tbody key={`group-${idx}`}>
                  <Table.Tr>
                    <Table.Td>
                      <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {dayjs(w.date).format('MMM D, YYYY')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={6}>
                        <Text size="sm" fw={500}>{w.title}</Text>
                        {w.pr && <Badge size="xs" color="yellow">PR</Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{w.best_result_display || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm" color="violet">
                        {w.score_type || '—'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={w.rx_or_scaled === 'RX' ? 'green' : 'gray'}
                      >
                        {w.rx_or_scaled || '—'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {(w.description || w.notes || dbLoaded) && (
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() => setExpandedRow(isOpen ? null : idx)}
                        >
                          {isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                        </ActionIcon>
                      )}
                    </Table.Td>
                  </Table.Tr>
                  {isOpen && (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Box p="sm" bg="var(--mantine-color-default-hover)" style={{ borderRadius: 8 }}>
                          {(() => {
                            const match = dbLoaded ? getMuscleMatch(w.title) : null;
                            return (
                              <Group align="flex-start" gap="md" wrap="nowrap">
                                {match?.imageUrl && (
                                  <Skeleton visible={false} w={80} h={80} radius="md" style={{ flexShrink: 0 }}>
                                    <Image
                                      src={match.imageUrl}
                                      w={80}
                                      h={80}
                                      radius="md"
                                      fit="cover"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  </Skeleton>
                                )}
                                <Stack gap={6} style={{ flex: 1 }}>
                                  {match && (match.primary.length > 0 || match.secondary.length > 0) && (
                                    <Group gap={4} wrap="wrap">
                                      {match.primary.map(m => (
                                        <Badge key={m} size="xs" variant="light" color="violet">{m}</Badge>
                                      ))}
                                      {match.secondary.map(m => (
                                        <Badge key={m} size="xs" variant="outline" color="gray">{m}</Badge>
                                      ))}
                                    </Group>
                                  )}
                                  {w.description && (
                                    <Text size="sm">{w.description}</Text>
                                  )}
                                  {w.notes && (
                                    <Text size="sm" c="dimmed" fs="italic">Notes: {w.notes}</Text>
                                  )}
                                </Stack>
                              </Group>
                            );
                          })()}
                        </Box>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              );
            })}
        </Table>
      </Paper>

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination total={totalPages} value={page} onChange={setPage} />
        </Group>
      )}
    </Stack>
  );
}
