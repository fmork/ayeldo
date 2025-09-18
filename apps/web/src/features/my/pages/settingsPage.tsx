import type { FC } from 'react';
import ComingSoonMessage from '../components/comingSoonMessage';

const SettingsPage: FC = () => {
  return (
    <ComingSoonMessage
      title="Settings"
      description="Configure branding, collaborators, and payment preferences for your studio."
    />
  );
};

export default SettingsPage;
