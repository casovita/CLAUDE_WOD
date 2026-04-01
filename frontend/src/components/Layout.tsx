import { NavLink, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink as MantineNavLink,
  Text,
  ActionIcon,
  useMantineColorScheme,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHome,
  IconBarbell,
  IconTrophy,
  IconList,
  IconUpload,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: IconHome },
  { path: '/strength', label: 'Strength', icon: IconBarbell },
  { path: '/prs', label: 'PR Board', icon: IconTrophy },
  { path: '/log', label: 'Workout Log', icon: IconList },
  { path: '/upload', label: 'Import', icon: IconUpload },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg" c="violet">
              WOD Analytics
            </Text>
          </Group>
          <ActionIcon
            variant="subtle"
            onClick={toggleColorScheme}
            size="lg"
            aria-label="Toggle colour scheme"
          >
            {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} onClick={close} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <MantineNavLink
                active={isActive || (path !== '/' && location.pathname.startsWith(path))}
                label={label}
                leftSection={<Icon size={18} />}
                mb={4}
              />
            )}
          </NavLink>
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1200} mx="auto">
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
