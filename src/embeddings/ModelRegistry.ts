/**
 * Centralized registry of all supported embedding models
 * Single source of truth for model information, dimensions, and metadata
 */

export interface ModelInfo {
  name: string;
  dimensions: number;
  provider: "ollama" | "transformers" | "openai";
  description: string;
  quality: "low" | "medium" | "high" | "highest";
  installation?: string;
  cost?: string;
}

/**
 * Complete registry of all supported embedding models
 */
export const MODEL_REGISTRY: ModelInfo[] = [
  // Ollama models (local)
  {
    name: "mxbai-embed-large",
    dimensions: 1024,
    provider: "ollama",
    description: "High-quality local embeddings, balanced speed and quality",
    quality: "high",
    installation: "ollama pull mxbai-embed-large",
  },
  {
    name: "nomic-embed-text",
    dimensions: 768,
    provider: "ollama",
    description: "Fast, good quality for general use",
    quality: "medium",
    installation: "ollama pull nomic-embed-text",
  },
  {
    name: "all-minilm",
    dimensions: 384,
    provider: "ollama",
    description: "Lightweight, fast, lower quality",
    quality: "low",
    installation: "ollama pull all-minilm",
  },
  {
    name: "snowflake-arctic-embed",
    dimensions: 1024,
    provider: "ollama",
    description: "High-quality, optimized for retrieval tasks",
    quality: "high",
    installation: "ollama pull snowflake-arctic-embed",
  },

  // Transformers models (offline)
  {
    name: "Xenova/all-MiniLM-L6-v2",
    dimensions: 384,
    provider: "transformers",
    description: "Default model, no setup required, downloads on first use",
    quality: "low",
  },
  {
    name: "Xenova/all-mpnet-base-v2",
    dimensions: 768,
    provider: "transformers",
    description: "Better quality, larger size, no setup required",
    quality: "medium",
  },
  {
    name: "Xenova/bge-small-en-v1.5",
    dimensions: 384,
    provider: "transformers",
    description: "Fast, English-optimized",
    quality: "low",
  },
  {
    name: "Xenova/bge-base-en-v1.5",
    dimensions: 768,
    provider: "transformers",
    description: "Better quality, English-optimized",
    quality: "medium",
  },

  // OpenAI models (cloud)
  {
    name: "text-embedding-3-small",
    dimensions: 1536,
    provider: "openai",
    description: "Cost-effective, high quality cloud embeddings",
    quality: "highest",
    cost: "$0.020 per 1M tokens",
  },
  {
    name: "text-embedding-3-large",
    dimensions: 3072,
    provider: "openai",
    description: "Best quality, higher cost",
    quality: "highest",
    cost: "$0.130 per 1M tokens",
  },
  {
    name: "text-embedding-ada-002",
    dimensions: 1536,
    provider: "openai",
    description: "Legacy model, still supported",
    quality: "high",
    cost: "$0.100 per 1M tokens",
  },
];

/**
 * Get all models for a specific provider
 */
export function getModelsByProvider(provider: string): ModelInfo[] {
  return MODEL_REGISTRY.filter(m => m.provider === provider);
}

/**
 * Get model information by name (supports partial matching)
 */
export function getModelInfo(modelName: string): ModelInfo | null {
  // Return null for empty string
  if (!modelName || modelName.trim().length === 0) {
    return null;
  }

  // Try exact match first
  const exactMatch = MODEL_REGISTRY.find(m => m.name === modelName);
  if (exactMatch) {
    return exactMatch;
  }

  // Try partial match (for Ollama-style matching)
  const partialMatch = MODEL_REGISTRY.find(m =>
    modelName.includes(m.name) || m.name.includes(modelName)
  );
  return partialMatch || null;
}

/**
 * Get dimensions for a model by name
 * Returns null if model is unknown
 */
export function getModelDimensions(modelName: string): number | null {
  const modelInfo = getModelInfo(modelName);
  return modelInfo?.dimensions || null;
}

/**
 * Get all models from the registry
 */
export function getAllModels(): ModelInfo[] {
  return MODEL_REGISTRY;
}

/**
 * Check if a model exists in the registry
 */
export function modelExists(modelName: string): boolean {
  return getModelInfo(modelName) !== null;
}

/**
 * Get models by quality level
 */
export function getModelsByQuality(quality: ModelInfo["quality"]): ModelInfo[] {
  return MODEL_REGISTRY.filter(m => m.quality === quality);
}

/**
 * Get recommended model for a provider
 * Returns the highest quality model available for the provider
 */
export function getRecommendedModel(provider: string): ModelInfo | null {
  const models = getModelsByProvider(provider);

  // Try to find highest quality first
  const highest = models.find(m => m.quality === "highest");
  if (highest) {
    return highest;
  }

  // Then try high quality
  const high = models.find(m => m.quality === "high");
  if (high) {
    return high;
  }

  // Then try medium quality
  const medium = models.find(m => m.quality === "medium");
  if (medium) {
    return medium;
  }

  // Fall back to first available model (likely "low" quality)
  return models[0] || null;
}
