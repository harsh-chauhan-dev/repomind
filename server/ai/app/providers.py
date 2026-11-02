from abc import ABC, abstractmethod
from typing import Any
import httpx


class LLMProvider(ABC):
    @abstractmethod
    async def complete_json(self, system: str, user: str) -> dict[str, Any]: ...


class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class OpenAICompatibleLLM(LLMProvider):
    def __init__(self, base_url: str, api_key: str, model: str, client: httpx.AsyncClient | None = None):
        self.base_url, self.api_key, self.model = base_url.rstrip("/"), api_key, model
        self.client = client or httpx.AsyncClient(timeout=45)

    async def complete_json(self, system: str, user: str) -> dict[str, Any]:
        response = await self.client.post(f"{self.base_url}/chat/completions", headers={"Authorization": f"Bearer {self.api_key}"}, json={"model": self.model, "temperature": 0, "response_format": {"type": "json_object"}, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        import json
        return json.loads(content)


class OpenAICompatibleEmbeddings(EmbeddingProvider):
    def __init__(self, base_url: str, api_key: str, model: str, client: httpx.AsyncClient | None = None):
        self.base_url, self.api_key, self.model = base_url.rstrip("/"), api_key, model
        self.client = client or httpx.AsyncClient(timeout=45)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        response = await self.client.post(f"{self.base_url}/embeddings", headers={"Authorization": f"Bearer {self.api_key}"}, json={"model": self.model, "input": texts})
        response.raise_for_status()
        return [item["embedding"] for item in sorted(response.json()["data"], key=lambda item: item["index"])]
