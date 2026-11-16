/// <reference lib="webworker" />

import { handleWorkerRequest, WorkerRequest } from './recommendation-scoring';

addEventListener('message', ({ data }: MessageEvent<WorkerRequest>) => {
  postMessage(handleWorkerRequest(data));
});
