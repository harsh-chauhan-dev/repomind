from fastapi import FastAPI

app = FastAPI(title="RepoMind AI Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "ai", "status": "ok"}
