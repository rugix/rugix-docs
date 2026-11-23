---
title: HTTP API
description: Reference the unstable HTTP interface used by Rugix Admin's frontend.
order: 5
---

Rugix Admin exposes an HTTP API used by its web interface.

::::danger[Unstable API]

This API is an implementation detail of Rugix Admin. Do not build external
tooling or integrations on top of it yet. **The API may change at any time,
including in breaking ways, without the compatibility guarantees that apply to
documented Rugix interfaces.**

::::

## Request Headers

Starting with the upcoming Rugix Admin release, every POST request requires
`X-Rugix-Admin: 1`. For example, the following command submits a job to make
the active system the default boot choice. Rugix Ctrl must allow system commit.

```sh
curl --fail-with-body -X POST -H 'X-Rugix-Admin: 1' \
  http://127.0.0.1:7492/api/system/actions/commit
```

The browser interface sends this header automatically. Update existing API
scripts to include it. Read-only requests, including event streams, can omit
the header. Rugix Admin returns `403 cross-site-request` if the header is
missing or invalid, or if the browser reports that the request came from
another origin. An unapproved host name returns `421 host-not-allowed`.

## Error Responses

API failures use a JSON object with a machine-readable code and an
operator-facing message:

```json
{
  "error": {
    "code": "invalid-query",
    "message": "invalid query parameters: ..."
  }
}
```

When Rugix Ctrl exits unsuccessfully, the error may also contain its exit status
and non-empty standard output or standard error. The web interface displays the
relevant diagnostic instead of representing the failed resource as empty device
state.

## Operations

The current API provides these operation families:

- `GET /api/health` reports whether the service is ready to accept requests.
- `GET /api/info` reports the Rugix Admin build version shown by the frontend.
- `GET /api/daemon`, `/api/system/info`, `/api/components`, `/api/apps`, and
  `/api/apps/:app` query the current device and daemon policy.
- `POST /api/system/update/:job-id` and
  `POST /api/system/update/:job-id/url` install uploaded and remote system
  bundles.
- `POST /api/apps/install/:job-id` and
  `POST /api/apps/install/:job-id/url` install uploaded and remote application
  bundles.
- `POST /api/system/actions/:action`,
  `POST /api/apps/:app/actions/:action`, and `POST /api/apps/actions/gc` start
  daemon-authorized lifecycle operations.
- `GET /api/jobs`, `/api/jobs/:job-id`, and `/api/jobs/:job-id/events` expose
  in-memory job status, output, progress, compatibility-bypass notices, and
  activation outcomes.
- `GET /api/events` exposes service-wide server-sent events. It emits an
  `invalidate-all` event whenever a job reaches `succeeded` or `failed`, so
  clients can refetch device information that the operation may have changed.

Installations and lifecycle actions return a job. Subscribe to the job's event
stream to follow it until its status becomes `succeeded` or `failed`. Each job
event has a monotonically increasing SSE event ID. A reconnecting client can
send `Last-Event-ID`; the service then replays newer events from the most recent 512 events per job.

Starting with the upcoming release, generate a UUID for each new job ID. URL
installation requests accept up to 64 KiB of JSON. Multipart installations
stream the bundle to Rugix Ctrl and have no fixed bundle size limit.

Rugix Admin allows up to four queued or running jobs. If all slots are in use,
the API returns `409 too-many-jobs`. Rugix Admin keeps up to 50 jobs in memory
and evicts the oldest finished job first. A restart clears all jobs and their
buffered events.
