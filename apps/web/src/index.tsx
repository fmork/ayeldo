import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/app';

const rootEl = (globalThis as unknown as { document?: { getElementById?: (id: string) => unknown } }).document?.getElementById?.('root');
if (rootEl) {
  (ReactDOM as unknown as { createRoot: (el: unknown) => { render: (n: unknown) => void } })
    .createRoot(rootEl)
    .render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
}
