export function getCsrfToken(): string | undefined {
  const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

