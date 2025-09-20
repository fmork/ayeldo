import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { AlbumDto } from '@ayeldo/types';
import type { FC } from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface AlbumBreadcrumbsProps {
  readonly ancestors: readonly AlbumDto[];
  readonly currentAlbum: AlbumDto;
}

const AlbumBreadcrumbs: FC<AlbumBreadcrumbsProps> = ({ ancestors, currentAlbum }) => {
  return (
    <Breadcrumbs aria-label="Album navigation" sx={{ mb: 2 }}>
      <Link component={RouterLink} to="/my/albums" underline="hover" color="inherit">
        Albums
      </Link>
      {ancestors.map((ancestor) => (
        <Link
          key={ancestor.id}
          component={RouterLink}
          to={`/my/albums/${ancestor.id}`}
          underline="hover"
          color="inherit"
        >
          {ancestor.title}
        </Link>
      ))}
      <Typography color="text.primary">{currentAlbum.title}</Typography>
    </Breadcrumbs>
  );
};

export default AlbumBreadcrumbs;
