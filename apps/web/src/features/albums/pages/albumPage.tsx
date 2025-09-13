import React from 'react';
import { useParams } from 'react-router-dom';

export function AlbumPage(): JSX.Element {
  const { id } = useParams();
  return (
    <section>
      <h2>Album {id}</h2>
      <p>Album content will load here.</p>
    </section>
  );
}

