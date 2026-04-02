import { Link, useLocation } from 'react-router-dom';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  ActionIcon,
  Tooltip,
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
  IconCalendarStats,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: IconHome },
  { path: '/strength', label: 'Strength', icon: IconBarbell },
  { path: '/prs', label: 'PR Board', icon: IconTrophy },
  { path: '/log', label: 'Workout Log', icon: IconList },
  { path: '/heatmap', label: 'Heatmap', icon: IconCalendarStats },
  { path: '/upload', label: 'Import', icon: IconUpload },
];

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 56;

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [collapsed, { toggle: toggleCollapsed }] = useDisclosure(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            {!collapsed && (
              <Text fw={700} size="lg" c="violet">WOD Analytics</Text>
            )}
          </Group>
          <ActionIcon variant="subtle" onClick={toggleColorScheme} size="lg" aria-label="Toggle colour scheme">
            {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs" style={{ overflow: 'hidden' }}>
        <Box style={{ flex: 1 }}>
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);

            if (collapsed) {
              return (
                <Tooltip key={path} label={label} position="right" withArrow>
                  <Box
                    component={Link}
                    to={path}
                    onClick={closeMobile}
                    mb={4}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: 36,
                      borderRadius: 6,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      color: isActive ? 'var(--mantine-color-violet-6)' : 'inherit',
                      backgroundColor: isActive
                        ? 'var(--mantine-color-violet-light)'
                        : 'transparent',
                      transition: 'background-color 0.1s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor =
                        'var(--mantine-color-default-hover)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <Icon size={18} />
                  </Box>
                </Tooltip>
              );
            }

            return (
              <NavLink
                key={path}
                component={Link}
                to={path}
                label={label}
                leftSection={<Icon size={18} />}
                active={isActive}
                mb={4}
                onClick={closeMobile}
              />
            );
          })}
        </Box>

        <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="right" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={toggleCollapsed}
            visibleFrom="sm"
            style={{ width: '100%', borderRadius: 6 }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <IconLayoutSidebarLeftExpand size={18} />
              : <IconLayoutSidebarLeftCollapse size={18} />
            }
          </ActionIcon>
        </Tooltip>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1200} mx="auto">
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
