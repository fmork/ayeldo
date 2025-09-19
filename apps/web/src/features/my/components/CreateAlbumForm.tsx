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
import { useCreateAlbumMutation } from '../../../services/api/backendApi';

const MAX_DESCRIPTION_LENGTH = 2000;

interface Props {
    readonly tenantId?: string;
}

const CreateAlbumForm: FC<Props> = ({ tenantId }) => {
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [formError, setFormError] = useState<string | undefined>();
    const [submitError, setSubmitError] = useState<string | undefined>();

    const [createAlbum, { isLoading: isCreating }] = useCreateAlbumMutation();

    const handleCreateAlbum = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const trimmedTitle = title.trim();
        const trimmedDescription = description.trim();

        if (trimmedTitle.length === 0) {
            setFormError('Album title is required.');
            return;
        }

        setFormError(undefined);
        setSubmitError(undefined);

        try {
            await createAlbum({
                tenantId: tenantId as string,
                title: trimmedTitle,
                ...(trimmedDescription.length > 0 ? { description: trimmedDescription } : {}),
            }).unwrap();
            setTitle('');
            setDescription('');
        } catch {
            setSubmitError('Unable to create the album right now. Please try again.');
        }
    };

    return (
        <Card component="section">
            <CardContent>
                <Stack component="form" spacing={3} onSubmit={handleCreateAlbum} noValidate autoComplete="off">
                    <Box>
                        <Typography variant="h6">Create a new album</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Give your album a short title and an optional description. You can add media after creating it.
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
                        label="Album title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        required
                        fullWidth
                        inputProps={{ maxLength: 200 }}
                    />

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        fullWidth
                        multiline
                        minRows={3}
                        helperText={`${description.length}/${MAX_DESCRIPTION_LENGTH}`}
                        inputProps={{ maxLength: MAX_DESCRIPTION_LENGTH }}
                    />

                    <Box display="flex" justifyContent="flex-end">
                        <Button type="submit" variant="contained" disabled={isCreating} startIcon={<AddPhotoAlternateOutlinedIcon />}>
                            {isCreating ? 'Creating…' : 'Create album'}
                        </Button>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default CreateAlbumForm;
