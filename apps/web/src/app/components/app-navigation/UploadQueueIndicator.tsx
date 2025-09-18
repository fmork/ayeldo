import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import type { FC } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import { useUploadQueue, useUploadQueueActions, type UploadStatus } from '../../contexts/UploadQueueContext';

const UploadQueueIndicator: FC = () => {
  const { jobs } = useUploadQueue();
  const { removeCompleted } = useUploadQueueActions();
  const [expanded, setExpanded] = useState<boolean>(false);

  const summary = useMemo(() => {
    const active = jobs.filter((job) =>
      ['queued', 'registering', 'uploading', 'completing'].includes(job.status),
    );
    const failed = jobs.filter((job) => job.status === 'failed');
    const completed = jobs.filter((job) => job.status === 'completed');
    return { active, failed, completed };
  }, [jobs]);

  const shouldRender = summary.active.length > 0 || summary.failed.length > 0;
  if (!shouldRender) return null;

  const toggleExpanded = (): void => {
    setExpanded((prev) => !prev);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        maxWidth: 360,
      }}
    >
      <Paper elevation={6} sx={{ p: 2, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <CloudUploadOutlinedIcon color="primary" />
            <Box>
              <Typography variant="subtitle1">Uploading media</Typography>
              <Typography variant="caption" color="text.secondary">
                {summary.active.length} in progress · {summary.failed.length} failed
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center">
            <Tooltip title={expanded ? 'Hide details' : 'Show details'}>
              <IconButton size="small" onClick={toggleExpanded}>
                {expanded ? <CloseIcon fontSize="small" /> : <CloudUploadOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {summary.completed.length > 0 && (
              <Tooltip title="Clear completed uploads">
                <IconButton size="small" onClick={removeCompleted}>
                  <CheckCircleOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List dense sx={{ mt: 1, maxHeight: 240, overflowY: 'auto' }}>
            {jobs.map((job) => (
              <ListItem key={job.id} sx={{ display: 'block', py: 0.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" noWrap title={job.fileName} sx={{ maxWidth: 220 }}>
                    {job.fileName}
                  </Typography>
                  <Chip
                    size="small"
                    color={chipColorForStatus(job.status)}
                    label={labelForStatus(job.status)}
                  />
                </Box>
                {job.status === 'failed' && job.error && (
                  <Typography variant="caption" color="error.main">
                    {job.error}
                  </Typography>
                )}
                {['queued', 'registering', 'uploading', 'completing'].includes(job.status) && (
                  <LinearProgress
                    variant="determinate"
                    value={job.progress}
                    sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        </Collapse>

        {summary.failed.length > 0 && !expanded && (
          <Box display="flex" alignItems="center" gap={0.5} mt={1} color="error.main">
            <ErrorOutlineOutlinedIcon fontSize="small" />
            <Typography variant="caption">Some uploads failed. Expand for details.</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

function labelForStatus(status: UploadStatus): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'registering':
      return 'Preparing';
    case 'uploading':
      return 'Uploading';
    case 'completing':
      return 'Finishing';
    case 'completed':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function chipColorForStatus(status: UploadStatus):
  | 'default'
  | 'error'
  | 'primary'
  | 'success'
  | 'warning'
  | 'info' {
  switch (status) {
    case 'queued':
    case 'registering':
      return 'info';
    case 'uploading':
    case 'completing':
      return 'primary';
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'cancelled':
      return 'warning';
    default:
      return 'default';
  }
}

export default UploadQueueIndicator;
