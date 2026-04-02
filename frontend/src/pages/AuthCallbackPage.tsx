import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useGmailAuth } from '../hooks/useGmailAuth';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { saveTokens } = useGmailAuth();
  const handled = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invocation
    if (handled.current) return;
    handled.current = true;

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token') ?? '';

    if (accessToken) {
      saveTokens(accessToken, refreshToken);
      notifications.show({
        title: 'Gmail connected',
        message: 'You can now import workouts directly from Gmail',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      navigate('/upload');
    } else {
      notifications.show({
        title: 'Connection failed',
        message: 'No access token returned. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      });
      navigate('/upload');
    }
  }, [navigate, saveTokens, searchParams]);

  return (
    <Center mih={400}>
      <Stack align="center">
        <Loader size="lg" />
        <Text c="dimmed">Connecting Gmail…</Text>
      </Stack>
    </Center>
  );
}
