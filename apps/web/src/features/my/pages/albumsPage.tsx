import type { FC } from 'react';
import ComingSoonMessage from '../components/comingSoonMessage';

const AlbumsPage: FC = () => {
  return (
    <ComingSoonMessage
      title="Albums"
      description="Manage drafts, publishing, and featured selections for your album catalog."
    />
  );
};

export default AlbumsPage;
