import { Box, Container, Typography } from '@mui/material';
import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

const AdminPage: FC = () => {


  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h3" >
          Admin
        </Typography>
      </Box>
      {/* Outlet for nested admin routes (e.g. /admin/tenants) */}
      <Outlet />
    </Container>
  );

}


export default AdminPage;
