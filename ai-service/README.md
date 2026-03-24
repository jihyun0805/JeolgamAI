# AI Forecast Service

FastAPI service that turns Prometheus/Kubernetes metric series into range-based forecasts.

## Why this service exists

- Spring keeps ownership of authentication, connectors, and score calculation.
- Python service owns the forecast logic validated in Jupyter.
- The service does **not** keep Prometheus or Kubernetes credentials.
- Spring should fetch metric series and POST them here.

## Run locally

```bash
cd ai-service
uv run --with fastapi --with uvicorn uvicorn app.main:app --reload --port 8000
```

## Request shape

```json
{
  "workspaceId": "ws-demo",
  "from": "2026-03-01T00:00:00Z",
  "to": "2026-03-08T00:00:00Z",
  "stepSeconds": 3600,
  "metrics": [
    {
      "key": "cpu",
      "label": "CPU 사용률",
      "unit": "%",
      "points": [
        { "timestamp": "2026-03-07T00:00:00Z", "value": 29.3 },
        { "timestamp": "2026-03-07T01:00:00Z", "value": 28.9 }
      ]
    }
  ]
}
```

## Response shape

- `metrics[].forecast1h|6h|24h`: `lower/base/upper`
- `chartSeries[].points[]`: future range bands for chart overlays

## Strategy defaults

- `cpu`: `median3`
- `memory`: `baseline`
- `latency`: `median3`
- `error_rate`: `median3`

These defaults come from the current notebook validation results on the project metrics.
