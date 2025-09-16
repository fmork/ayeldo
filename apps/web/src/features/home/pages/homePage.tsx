import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

const HomePage: FC = () => {
    const { t } = useTranslation();
    return (
        <>
            <h1>{t('app.title')}</h1>
            <p>{t('app.welcome')}</p>
        </>
    );
};

export default HomePage;
