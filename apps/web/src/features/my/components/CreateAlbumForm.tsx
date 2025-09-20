import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateAlbumMutation } from '../../../services/api/backendApi';

const MAX_DESCRIPTION_LENGTH = 2000;

export type CreateAlbumFormContext =
  | { readonly kind: 'root' }
  | { readonly kind: 'child'; readonly parentAlbumId: string };

interface Props {
  readonly tenantId: string;
  readonly context: CreateAlbumFormContext;
}

const CreateAlbumForm: FC<Props> = ({ tenantId, context }) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();

  const [createAlbum, { isLoading: isCreating }] = useCreateAlbumMutation();
  const { t } = useTranslation();

  const isChildAlbum = context.kind === 'child';
  const heading = isChildAlbum ? t('albums.create_sub_album') : t('albums.create_new_album');
  const instructions = isChildAlbum
    ? t('albums.create_sub_album_instructions')
    : t('albums.create_album_instructions');
  const submitLabel = isChildAlbum ? t('albums.create_sub_album_button') : t('albums.create_album');
  const submitLoadingLabel = isChildAlbum ? t('albums.creating_sub_album') : t('albums.creating');

  const handleCreateAlbum = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length === 0) {
      setFormError(t('albums.error_title_required'));
      return;
    }

    setFormError(undefined);
    setSubmitError(undefined);

    try {
      await createAlbum({
        tenantId,
        title: trimmedTitle,
        ...(trimmedDescription.length > 0 ? { description: trimmedDescription } : {}),
        ...(isChildAlbum ? { parentAlbumId: context.parentAlbumId } : {}),
      }).unwrap();
      setTitle('');
      setDescription('');
    } catch {
      setSubmitError(t('albums.error_unable_create'));
    }
  };

  return (
    <Card component="section">
      <CardContent>
        <Stack component="form" spacing={3} onSubmit={handleCreateAlbum} noValidate autoComplete="off">
          <Box>
            <Typography variant="h6">{heading}</Typography>
            <Typography variant="body2" color="text.secondary">
              {instructions}
            </Typography>
          </Box>

          {formError && (
            <Alert severity="warning" onClose={() => setFormError(undefined)}>
              {formError}
            </Alert>
          )}
          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError(undefined)}>
              {submitError}
            </Alert>
          )}

          <TextField
            label={t('albums.field_title')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            fullWidth
            inputProps={{ maxLength: 200 }}
          />

          <TextField
            label={t('albums.field_description')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            fullWidth
            multiline
            minRows={3}
            helperText={`${description.length}/${MAX_DESCRIPTION_LENGTH}`}
            inputProps={{ maxLength: MAX_DESCRIPTION_LENGTH }}
          />

          <Box display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              disabled={isCreating}
              startIcon={<AddPhotoAlternateOutlinedIcon />}
            >
              {isCreating ? submitLoadingLabel : submitLabel}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CreateAlbumForm;
