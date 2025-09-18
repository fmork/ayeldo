import type { FC, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { registerAlbumUpload, completeAlbumUpload } from '../../services/uploads/uploadApi';

export type UploadStatus =
  | 'queued'
  | 'registering'
  | 'uploading'
  | 'completing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface UploadJob {
  readonly id: string;
  readonly tenantId: string;
  readonly albumId: string;
  readonly file: File;
  readonly fileName: string;
  readonly fileSize: number;
  status: UploadStatus;
  progress: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  imageId?: string;
}

interface UploadQueueState {
  readonly jobs: readonly UploadJob[];
}

type UploadQueueAction =
  | { type: 'enqueue'; jobs: readonly UploadJob[] }
  | { type: 'update'; id: string; patch: Partial<UploadJob> }
  | { type: 'set-progress'; id: string; progress: number }
  | { type: 'remove-completed' };

function uploadQueueReducer(state: UploadQueueState, action: UploadQueueAction): UploadQueueState {
  switch (action.type) {
    case 'enqueue':
      return { jobs: [...state.jobs, ...action.jobs] };
    case 'update':
      return {
        jobs: state.jobs.map((job) => (job.id === action.id ? { ...job, ...action.patch } : job)),
      };
    case 'set-progress':
      return {
        jobs: state.jobs.map((job) =>
          job.id === action.id ? { ...job, progress: action.progress } : job,
        ),
      };
    case 'remove-completed':
      return {
        jobs: state.jobs.filter((job) => job.status !== 'completed'),
      };
    default:
      return state;
  }
}

interface UploadQueueContextValue {
  readonly jobs: readonly UploadJob[];
}

interface UploadQueueActions {
  readonly enqueueFiles: (params: { tenantId: string; albumId: string; files: readonly File[] }) => void;
  readonly removeCompleted: () => void;
}

const UploadQueueStateContext = createContext<UploadQueueContextValue | undefined>(undefined);
const UploadQueueActionsContext = createContext<UploadQueueActions | undefined>(undefined);

const MAX_CONCURRENT_UPLOADS = 3;

function makeJobId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const UploadQueueProvider: FC<{ readonly children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(uploadQueueReducer, { jobs: [] });
  const activeJobsRef = useRef(new Set<string>());
  const jobsRef = useRef<readonly UploadJob[]>(state.jobs);

  useEffect(() => {
    jobsRef.current = state.jobs;
  }, [state.jobs]);

  const updateJob = useCallback((id: string, patch: Partial<UploadJob>) => {
    dispatch({ type: 'update', id, patch });
  }, []);

  const setProgress = useCallback((id: string, progress: number) => {
    dispatch({ type: 'set-progress', id, progress });
  }, []);

  const processJob = useCallback(
    async (jobId: string) => {
      const job = jobsRef.current.find((item) => item.id === jobId);
      if (!job) {
        activeJobsRef.current.delete(jobId);
        return;
      }

      try {
        updateJob(jobId, { status: 'registering', startedAt: Date.now(), progress: 0 });
        const registerResult = await registerAlbumUpload({
          tenantId: job.tenantId,
          albumId: job.albumId,
          file: job.file,
        });

        updateJob(jobId, {
          status: 'uploading',
          imageId: registerResult.imageId,
          progress: 5,
        });

        await uploadToS3(registerResult.upload.url, registerResult.upload.fields, job.file, (value) =>
          setProgress(jobId, value),
        );

        updateJob(jobId, { status: 'completing', progress: 95 });

        await completeAlbumUpload({
          tenantId: job.tenantId,
          albumId: job.albumId,
          imageId: registerResult.imageId,
        });

        updateJob(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: Date.now(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        updateJob(jobId, { status: 'failed', error: message });
      } finally {
        activeJobsRef.current.delete(jobId);
      }
    },
    [setProgress, updateJob],
  );

  useEffect(() => {
    const queued = jobsRef.current.filter(
      (job) => job.status === 'queued' && !activeJobsRef.current.has(job.id),
    );
    if (queued.length === 0) return;

    const availableSlots = MAX_CONCURRENT_UPLOADS - activeJobsRef.current.size;
    if (availableSlots <= 0) return;

    queued.slice(0, availableSlots).forEach((job) => {
      activeJobsRef.current.add(job.id);
      void processJob(job.id);
    });
  }, [state.jobs, processJob]);

  const enqueueFiles = useCallback(
    ({ tenantId, albumId, files }: { tenantId: string; albumId: string; files: readonly File[] }) => {
      if (files.length === 0) return;
      const now = Date.now();
      const jobs = files.map((file) => ({
        id: makeJobId(),
        tenantId,
        albumId,
        file,
        fileName: file.name,
        fileSize: file.size,
        status: 'queued' as UploadStatus,
        progress: 0,
        startedAt: now,
      }));
      dispatch({ type: 'enqueue', jobs });
    },
    [],
  );

  const removeCompleted = useCallback(() => {
    dispatch({ type: 'remove-completed' });
  }, []);

  const stateValue = useMemo<UploadQueueContextValue>(
    () => ({ jobs: state.jobs }),
    [state.jobs],
  );

  const actionsValue = useMemo<UploadQueueActions>(
    () => ({ enqueueFiles, removeCompleted }),
    [enqueueFiles, removeCompleted],
  );

  return (
    <UploadQueueStateContext.Provider value={stateValue}>
      <UploadQueueActionsContext.Provider value={actionsValue}>
        {children}
      </UploadQueueActionsContext.Provider>
    </UploadQueueStateContext.Provider>
  );
};

export function useUploadQueue(): UploadQueueContextValue {
  const ctx = useContext(UploadQueueStateContext);
  if (!ctx) throw new Error('useUploadQueue must be used within UploadQueueProvider');
  return ctx;
}

export function useUploadQueueActions(): UploadQueueActions {
  const ctx = useContext(UploadQueueActionsContext);
  if (!ctx) throw new Error('useUploadQueueActions must be used within UploadQueueProvider');
  return ctx;
}

async function uploadToS3(
  url: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  formData.append('file', file);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>): void => {
      if (event.lengthComputable) {
        const percent = Math.min(90, Math.round((event.loaded / event.total) * 90));
        onProgress(percent);
      }
    };

    xhr.onload = (): void => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(95);
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = (): void => {
      reject(new Error('S3 upload failed')); 
    };

    xhr.send(formData);
  });
}
