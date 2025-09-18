import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../app/contexts/SessionContext';
import { backendApi } from '../../../services/api/backendApi';

// Local types for form validation
interface OnboardFormData {
  name: string;
  ownerEmail: string;
  adminName?: string;
}

interface FormErrors {
  name?: string;
  ownerEmail?: string;
  adminName?: string;
}

const OnboardPage: FC = () => {
  const navigate = useNavigate();
  const session = useSession();
  const [onboard, { isLoading, error }] = backendApi.useOnboardMutation();

  const [formData, setFormData] = useState<OnboardFormData>({
    name: '',
    ownerEmail: '',
    adminName: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Redirect if already authenticated and has tenant
  useEffect(() => {
    if (session?.loggedIn && (session.tenantIds?.length ?? 0) > 0) {
      // If user is already authenticated with a tenant, redirect to albums
      navigate('/albums/demo');
    } else if (session?.loggedIn && (session.tenantIds?.length ?? 0) === 0) {
      setFormData((prev) => {
        const next: OnboardFormData = {
          ...prev,
          ownerEmail: session.user.email,
        };
        if (session.user.fullName.trim().length > 0) {
          next.adminName = session.user.fullName;
        }
        return next;
      });
    }
  }, [session, navigate]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Tenant name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Tenant name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Tenant name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Tenant name must be less than 100 characters';
    }

    // Owner email validation
    if (!formData.ownerEmail.trim()) {
      newErrors.ownerEmail = 'Owner email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.ownerEmail)) {
        newErrors.ownerEmail = 'Please enter a valid email address';
      }
    }

    // Admin name validation (optional but if provided must be valid)
    if (formData.adminName && formData.adminName.length > 100) {
      newErrors.adminName = 'Admin name must be less than 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof OnboardFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const payload: {
        name: string;
        ownerEmail: string;
        adminName?: string;
      } = {
        name: formData.name,
        ownerEmail: formData.ownerEmail,
      };

      if (formData.adminName) {
        payload.adminName = formData.adminName;
      }

      await onboard(payload).unwrap();

      // Success - navigate to albums
      navigate('/albums/demo');
    } catch (err) {
      // Error handling is done by RTK Query error state
      console.error('Onboarding failed:', err);
    }
  };

  const getErrorMessage = (): string | null => {
    if (!error) return null;

    if ('status' in error) {
      const status = Number(error.status);
      if (status === 400) {
        return 'Please check your input and try again.';
      }
      if (status === 409) {
        return 'A tenant with this information already exists.';
      }
      if (status >= 500) {
        return 'Server error. Please try again later.';
      }
    }

    return 'An unexpected error occurred. Please try again.';
  };

  if (session === undefined) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Welcome to Ayeldo
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Let's set up your tenant account to get started.
              </Typography>
            </Box>

            <Divider />

            {error && (
              <Alert severity="error">
                {getErrorMessage()}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={3}>
                <FormControl required>
                  <FormLabel>Tenant Name</FormLabel>
                  <TextField
                    fullWidth
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    error={!!errors.name}
                    helperText={errors.name}
                    placeholder="Your company or organization name"
                    disabled={isLoading}
                  />
                </FormControl>

                <FormControl required>
                  <FormLabel>Owner Email</FormLabel>
                  <TextField
                    fullWidth
                    type="email"
                    value={formData.ownerEmail}
                    onChange={handleInputChange('ownerEmail')}
                    error={!!errors.ownerEmail}
                    helperText={errors.ownerEmail}
                    placeholder="admin@yourcompany.com"
                    disabled={true /* Always disabled to use session email */}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Admin Name (Optional)</FormLabel>
                  <TextField
                    fullWidth
                    value={formData.adminName}
                    onChange={handleInputChange('adminName')}
                    error={!!errors.adminName}
                    helperText={errors.adminName}
                    placeholder="John Doe"
                    disabled={isLoading}
                  />
                </FormControl>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={isLoading}
                  sx={{ mt: 2 }}
                >
                  {isLoading ? 'Creating Tenant...' : 'Create Tenant'}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OnboardPage;
