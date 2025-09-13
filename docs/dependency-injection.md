# HttpClient

Inject an instance of `AxiosHttpClient` from `@fmork/backend-core`. The constructor takes one parameter, a `AxiosHttpClientProps` object:

```typescript
interface AxiosHttpClientProps {
  logWriter: ILogWriter;
}
```

# ILogWriter

Inject an instance of `PinoLogWriter`, potentially request-scoped.
