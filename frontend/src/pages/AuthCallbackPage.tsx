import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useGmailAuth } from '../hooks/useGmailAuth';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { saveTokens } = useGmailAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token') ?? '';

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
  }, [navigate, saveTokens]);

  return (
    <Center mih={400}>
      <Stack align="center">
        <Loader size="lg" />
        <Text c="dimmed">Connecting Gmail…</Text>
      </Stack>
    </Center>
  );
}
