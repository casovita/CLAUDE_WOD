import { useCallback, useState, useEffect } from 'react';
import {
  Title,
  Text,
  Stack,
  Paper,
  Group,
  Badge,
  Alert,
  List,
  ThemeIcon,
  Button,
  Tabs,
  Loader,
  Card,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import {
  IconUpload,
  IconX,
  IconFile,
  IconCheck,
  IconAlertCircle,
  IconBrandGoogle,
  IconMail,
  IconRefresh,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { parseCSV } from '../lib/parseWorkouts';
import { uploadEml, listGmailExports, fetchGmailExport, type ExportSummary } from '../lib/api';
import { useGmailAuth } from '../hooks/useGmailAuth';
import type { Workout } from '../types/workout';
import dayjs from 'dayjs';

interface UploadPageProps {
  onImport: (workouts: Workout[]) => void;
  currentCount: number;
}

export function UploadPage({ onImport, currentCount }: UploadPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gmailExports, setGmailExports] = useState<ExportSummary[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { connected, connect, disconnect } = useGmailAuth();

  // Load Gmail exports when connected
  useEffect(() => {
    if (connected) {
      setGmailLoading(true);
      listGmailExports()
        .then((r) => setGmailExports(r.data))
        .catch(() => setGmailExports([]))
        .finally(() => setGmailLoading(false));
    }
  }, [connected]);

  const handleFile = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setLoading(true);
      setError(null);
      try {
        let workouts: Workout[];

        // Try backend first (handles EML server-side with mailparser)
        try {
          const response = await uploadEml(file);
          workouts = response.data.workouts as Workout[];
        } catch {
          // Fallback: parse entirely in browser (works for .eml and .csv)
          const text = await file.text();
          const csvMatch = text.match(
            /Content-Type: text\/csv[\s\S]*?Content-Transfer-Encoding: base64\s+([\s\S]+?)(?=--|$)/,
          );
          let csvText: string;
          if (csvMatch) {
            csvText = atob(csvMatch[1].replace(/\s+/g, ''));
          } else if (text.includes('date,title,description')) {
            csvText = text;
          } else {
            throw new Error('No CSV found in file. Upload a SugarWOD .eml or .csv file.');
          }
          workouts = parseCSV(csvText);
        }

        if (workouts.length === 0) throw new Error('Parsed 0 workouts — file may be empty.');
        onImport(workouts);
        notifications.show({
          title: 'Import successful',
          message: `${workouts.length} workouts loaded`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        navigate('/');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [onImport, navigate],
  );

  const handleGmailImport = async (messageId: string) => {
    setImportingId(messageId);
    setError(null);
    try {
      const response = await fetchGmailExport(messageId);
      const workouts = response.data.workouts as Workout[];
      if (workouts.length === 0) throw new Error('No workouts found in this export.');
      onImport(workouts);
      notifications.show({
        title: 'Import successful',
        message: `${workouts.length} workouts loaded from Gmail`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Import Workouts</Title>
          <Text c="dimmed" size="sm">Upload your SugarWOD export or fetch it from Gmail</Text>
        </div>
        {currentCount > 0 && (
          <Badge variant="light" color="violet" size="lg">{currentCount} workouts loaded</Badge>
        )}
      </Group>

      <Tabs defaultValue="upload">
        <Tabs.List>
          <Tabs.Tab value="upload" leftSection={<IconUpload size={14} />}>Manual Upload</Tabs.Tab>
          <Tabs.Tab value="gmail" leftSection={<IconMail size={14} />}>
            Gmail
            {connected && <Badge size="xs" color="green" ml={6}>Connected</Badge>}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="upload" pt="md">
          <Stack gap="md">
            <Dropzone
              onDrop={handleFile}
              onReject={() => setError('Only .eml or .csv files are accepted.')}
              accept={['message/rfc822', 'text/csv', 'application/octet-stream']}
              maxFiles={1}
              loading={loading}
            >
              <Group justify="center" gap="xl" mih={160} style={{ pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={44} color="var(--mantine-color-violet-6)" stroke={1.5} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={44} color="var(--mantine-color-red-6)" stroke={1.5} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconFile size={44} color="var(--mantine-color-dimmed)" stroke={1.5} />
                </Dropzone.Idle>
                <Stack gap={4} align="center">
                  <Text size="lg" fw={500}>Drop your SugarWOD export here</Text>
                  <Text size="sm" c="dimmed">
                    Supports <strong>.eml</strong> and <strong>.csv</strong> files
                  </Text>
                </Stack>
              </Group>
            </Dropzone>

            <Paper withBorder p="md" radius="md">
              <Text fw={500} mb="xs">How to export from SugarWOD</Text>
              <List spacing="xs" size="sm" icon={
                <ThemeIcon color="violet" size={20} radius="xl"><IconCheck size={12} /></ThemeIcon>
              }>
                <List.Item>Open SugarWOD app → Profile → Settings</List.Item>
                <List.Item>Tap &ldquo;Export My Data&rdquo;</List.Item>
                <List.Item>Wait for the email from hello@sugarwod.com</List.Item>
                <List.Item>Gmail: open email → ⋮ → Download message (.eml)</List.Item>
              </List>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="gmail" pt="md">
          <Stack gap="md">
            {!connected ? (
              <Paper withBorder p="xl" radius="md">
                <Stack align="center" gap="md">
                  <ThemeIcon size={64} variant="light" color="violet">
                    <IconBrandGoogle size={32} />
                  </ThemeIcon>
                  <div style={{ textAlign: 'center' }}>
                    <Text fw={600} size="lg">Connect Gmail</Text>
                    <Text c="dimmed" size="sm" mt={4}>
                      Grant read-only access to automatically find SugarWOD export emails
                    </Text>
                  </div>
                  <Button leftSection={<IconBrandGoogle size={16} />} onClick={connect} size="md">
                    Connect Gmail
                  </Button>
                  <Text size="xs" c="dimmed">
                    Read-only access · Only searches for SugarWOD emails
                  </Text>
                </Stack>
              </Paper>
            ) : (
              <Stack gap="md">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Badge color="green" variant="light">Gmail connected</Badge>
                    <Text size="sm" c="dimmed">{gmailExports.length} export{gmailExports.length !== 1 ? 's' : ''} found</Text>
                  </Group>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<IconRefresh size={14} />}
                      onClick={() => {
                        setGmailLoading(true);
                        listGmailExports()
                          .then((r) => setGmailExports(r.data))
                          .catch(() => setGmailExports([]))
                          .finally(() => setGmailLoading(false));
                      }}
                    >
                      Refresh
                    </Button>
                    <Button size="xs" variant="subtle" color="red" onClick={disconnect}>
                      Disconnect
                    </Button>
                  </Group>
                </Group>

                {gmailLoading ? (
                  <Group justify="center" py="xl"><Loader /></Group>
                ) : gmailExports.length === 0 ? (
                  <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                    No SugarWOD export emails found in your Gmail inbox.
                    Request an export in the SugarWOD app first.
                  </Alert>
                ) : (
                  <Stack gap="sm">
                    {gmailExports.map((exp) => (
                      <Card key={exp.messageId} withBorder radius="md" p="md">
                        <Group justify="space-between">
                          <div>
                            <Text fw={500} size="sm">{exp.subject}</Text>
                            <Text size="xs" c="dimmed">{dayjs(exp.date).format('MMM D, YYYY')}</Text>
                            {exp.snippet && (
                              <Text size="xs" c="dimmed" mt={2} lineClamp={1}>{exp.snippet}</Text>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="light"
                            loading={importingId === exp.messageId}
                            onClick={() => handleGmailImport(exp.messageId)}
                          >
                            Import
                          </Button>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
