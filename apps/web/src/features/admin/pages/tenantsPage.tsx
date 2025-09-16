import { Box, Container, Typography } from '@mui/material';
import type { FC } from 'react';

const TenantsPage: FC = () => {


  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h4">
          Tenants
        </Typography>
      </Box>
    </Container>
  );

}


export default TenantsPage;
