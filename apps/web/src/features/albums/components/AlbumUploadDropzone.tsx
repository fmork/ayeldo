import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ChangeEvent, DragEvent, FC } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useUploadQueueActions } from '../../../app/contexts/UploadQueueContext';

interface AlbumUploadDropzoneProps {
  readonly tenantId: string;
  readonly albumId: string;
}

const AlbumUploadDropzone: FC<AlbumUploadDropzoneProps> = ({ tenantId, albumId }) => {
  const { enqueueFiles } = useUploadQueueActions();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const filesArray = Array.from(files).filter((file) => file.size > 0);
      if (filesArray.length === 0) return;
      enqueueFiles({ tenantId, albumId, files: filesArray });
    },
    [albumId, enqueueFiles, tenantId],
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (!event.target.files) return;
    handleFiles(event.target.files);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      handleFiles(event.dataTransfer.files);
      event.dataTransfer.clearData();
    }
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragging(false);
  };

  const openFileDialog = (): void => {
    inputRef.current?.click();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        hidden
        onChange={onInputChange}
      />
      <Paper
        variant="outlined"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        sx={{
          p: 4,
          borderStyle: 'dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
          textAlign: 'center',
          transition: 'border-color 0.2s ease, background-color 0.2s ease',
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CloudUploadOutlinedIcon color={isDragging ? 'primary' : 'action'} sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h6">Upload images</Typography>
            <Typography variant="body2" color="text.secondary">
              Drag and drop files here, or click to select. You can continue browsing while uploads proceed in the background.
            </Typography>
          </Box>
          <Button variant="contained" onClick={openFileDialog} startIcon={<CloudUploadOutlinedIcon />}>
            Select files
          </Button>
        </Box>
      </Paper>
    </>
  );
};

export default AlbumUploadDropzone;

