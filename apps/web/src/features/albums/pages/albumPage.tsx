import type { FC } from 'react';
import { useParams } from 'react-router-dom';

const AlbumPage: FC = () => {
  const { id } = useParams();

  return (
    <>
      <section>
        <h2>Album {id}</h2>
        <p>Album content will load here.</p>
      </section>
    </>
  );

}


export default AlbumPage;
