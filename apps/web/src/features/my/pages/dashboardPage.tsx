import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { FC, ReactElement } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useSession } from '../../../app/contexts/SessionContext';

interface MetricCardItem {
  readonly label: string;
  readonly value: string;
  readonly helperText: string;
  readonly icon: ReactElement;
}

interface QuickActionItem {
  readonly label: string;
  readonly description: string;
  readonly to: string;
}

const metricCards: readonly MetricCardItem[] = [
  {
    label: 'Total Albums',
    value: '12',
    helperText: 'Published and draft albums',
    icon: <CollectionsOutlinedIcon color="primary" fontSize="large" />,
  },
  {
    label: 'Monthly Views',
    value: '4,580',
    helperText: 'Unique visitors in the last 30 days',
    icon: <TrendingUpOutlinedIcon color="primary" fontSize="large" />,
  },
  {
    label: 'Orders Pending',
    value: '8',
    helperText: 'Awaiting fulfillment',
    icon: <ReceiptLongOutlinedIcon color="primary" fontSize="large" />,
  },
  {
    label: 'Top Releases',
    value: '3',
    helperText: 'Albums trending this week',
    icon: <InsightsOutlinedIcon color="primary" fontSize="large" />,
  },
];

const quickActions: readonly QuickActionItem[] = [
  {
    label: 'Create new album',
    description: 'Start a new album to collect photos or videos.',
    to: '/my/albums',
  },
  {
    label: 'Review orders',
    description: 'Check pending and fulfilled customer orders.',
    to: '/my/orders',
  },
  {
    label: 'Check analytics',
    description: 'Dive into engagement metrics for your content.',
    to: '/my/analytics',
  },
];

const DashboardPage: FC = () => {
  const session = useSession();

  const heading = session && session.loggedIn ? `Welcome back, ${session.user.fullName}` : 'Welcome back';

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" gutterBottom>{heading}</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Plan your next release, monitor performance, and keep your fans engaged.
        </Typography>
      </Box>

      <Box
        display="grid"
        gap={3}
        sx={{ gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}
      >
        {metricCards.map((card) => (
          <Card key={card.label} elevation={1}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                {card.icon}
                <Box>
                  <Typography variant="h6">{card.value}</Typography>
                  <Typography variant="subtitle2" color="text.secondary">{card.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{card.helperText}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card elevation={1}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" gutterBottom>Quick actions</Typography>
              <Typography variant="body1" color="text.secondary">
                Shortcuts to the most common creator tasks.
              </Typography>
            </Box>
            <Box
              display="grid"
              gap={2}
              sx={{ gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}
            >
              {quickActions.map((action) => (
                <Card key={action.to} elevation={0} variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6">{action.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{action.description}</Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        component={RouterLink}
                        to={action.to}
                        endIcon={<ArrowForwardIcon />}
                      >
                        Go
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default DashboardPage;
