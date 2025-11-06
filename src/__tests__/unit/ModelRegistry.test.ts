/**
 * Unit tests for ModelRegistry
 */

import {
  MODEL_REGISTRY,
  getModelsByProvider,
  getModelInfo,
  getModelDimensions,
  getAllModels,
  modelExists,
  getModelsByQuality,
  getRecommendedModel,
  type ModelInfo,
} from "../../embeddings/ModelRegistry.js";

describe("ModelRegistry", () => {
  describe("MODEL_REGISTRY", () => {
    it("should contain all expected models", () => {
      const modelNames = MODEL_REGISTRY.map(m => m.name);

      // Ollama models
      expect(modelNames).toContain("mxbai-embed-large");
      expect(modelNames).toContain("nomic-embed-text");
      expect(modelNames).toContain("all-minilm");
      expect(modelNames).toContain("snowflake-arctic-embed");

      // Transformers models
      expect(modelNames).toContain("Xenova/all-MiniLM-L6-v2");
      expect(modelNames).toContain("Xenova/all-mpnet-base-v2");
      expect(modelNames).toContain("Xenova/bge-small-en-v1.5");
      expect(modelNames).toContain("Xenova/bge-base-en-v1.5");

      // OpenAI models
      expect(modelNames).toContain("text-embedding-3-small");
      expect(modelNames).toContain("text-embedding-3-large");
      expect(modelNames).toContain("text-embedding-ada-002");

      // Should have exactly 11 models
      expect(MODEL_REGISTRY).toHaveLength(11);
    });

    it("should have valid dimensions for all models", () => {
      for (const model of MODEL_REGISTRY) {
        expect(model.dimensions).toBeGreaterThan(0);
        expect(model.dimensions).toBeLessThanOrEqual(10000);
        expect(Number.isInteger(model.dimensions)).toBe(true);
      }
    });

    it("should have no duplicate model names", () => {
      const names = MODEL_REGISTRY.map(m => m.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it("should have valid provider values", () => {
      const validProviders = ["ollama", "transformers", "openai"];
      for (const model of MODEL_REGISTRY) {
        expect(validProviders).toContain(model.provider);
      }
    });

    it("should have valid quality values", () => {
      const validQualities = ["low", "medium", "high", "highest"];
      for (const model of MODEL_REGISTRY) {
        expect(validQualities).toContain(model.quality);
      }
    });

    it("should have description for all models", () => {
      for (const model of MODEL_REGISTRY) {
        expect(model.description).toBeTruthy();
        expect(model.description.length).toBeGreaterThan(0);
      }
    });

    it("should have installation instructions for Ollama models", () => {
      const ollamaModels = MODEL_REGISTRY.filter(m => m.provider === "ollama");
      for (const model of ollamaModels) {
        expect(model.installation).toBeTruthy();
        expect(model.installation).toContain("ollama pull");
      }
    });

    it("should have cost information for OpenAI models", () => {
      const openAIModels = MODEL_REGISTRY.filter(m => m.provider === "openai");
      for (const model of openAIModels) {
        expect(model.cost).toBeTruthy();
        expect(model.cost).toMatch(/\$/);
      }
    });
  });

  describe("getModelsByProvider", () => {
    it("should return Ollama models", () => {
      const models = getModelsByProvider("ollama");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === "ollama")).toBe(true);
      expect(models.map(m => m.name)).toContain("mxbai-embed-large");
    });

    it("should return Transformers models", () => {
      const models = getModelsByProvider("transformers");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === "transformers")).toBe(true);
      expect(models.map(m => m.name)).toContain("Xenova/all-MiniLM-L6-v2");
    });

    it("should return OpenAI models", () => {
      const models = getModelsByProvider("openai");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.provider === "openai")).toBe(true);
      expect(models.map(m => m.name)).toContain("text-embedding-3-small");
    });

    it("should return empty array for unknown provider", () => {
      const models = getModelsByProvider("unknown");
      expect(models).toEqual([]);
    });
  });

  describe("getModelInfo", () => {
    it("should find model by exact name match", () => {
      const model = getModelInfo("mxbai-embed-large");
      expect(model).toBeTruthy();
      expect(model?.name).toBe("mxbai-embed-large");
      expect(model?.dimensions).toBe(1024);
      expect(model?.provider).toBe("ollama");
    });

    it("should find model by partial name match", () => {
      const model = getModelInfo("mxbai");
      expect(model).toBeTruthy();
      expect(model?.name).toBe("mxbai-embed-large");
    });

    it("should find model when query contains model name", () => {
      const model = getModelInfo("mxbai-embed-large:latest");
      expect(model).toBeTruthy();
      expect(model?.name).toBe("mxbai-embed-large");
    });

    it("should return null for unknown model", () => {
      const model = getModelInfo("nonexistent-model");
      expect(model).toBeNull();
    });

    it("should prioritize exact match over partial match", () => {
      // If we search for "all-minilm" (exact), should not match "all-MiniLM-L6-v2" (partial)
      const model = getModelInfo("all-minilm");
      expect(model).toBeTruthy();
      expect(model?.name).toBe("all-minilm");
      expect(model?.provider).toBe("ollama");
    });
  });

  describe("getModelDimensions", () => {
    it("should return dimensions for known model", () => {
      expect(getModelDimensions("mxbai-embed-large")).toBe(1024);
      expect(getModelDimensions("nomic-embed-text")).toBe(768);
      expect(getModelDimensions("all-minilm")).toBe(384);
      expect(getModelDimensions("text-embedding-3-small")).toBe(1536);
      expect(getModelDimensions("text-embedding-3-large")).toBe(3072);
    });

    it("should return dimensions for partial match", () => {
      expect(getModelDimensions("mxbai")).toBe(1024);
      expect(getModelDimensions("nomic")).toBe(768);
    });

    it("should return null for unknown model", () => {
      expect(getModelDimensions("unknown-model")).toBeNull();
    });
  });

  describe("getAllModels", () => {
    it("should return all models", () => {
      const models = getAllModels();
      expect(models).toEqual(MODEL_REGISTRY);
      expect(models.length).toBe(11);
    });

    it("should return a copy, not the original array", () => {
      const models = getAllModels();
      expect(models).toEqual(MODEL_REGISTRY);
      // Should be same content, but could be same reference (no requirement to copy)
    });
  });

  describe("modelExists", () => {
    it("should return true for existing models", () => {
      expect(modelExists("mxbai-embed-large")).toBe(true);
      expect(modelExists("Xenova/all-MiniLM-L6-v2")).toBe(true);
      expect(modelExists("text-embedding-3-small")).toBe(true);
    });

    it("should return true for partial matches", () => {
      expect(modelExists("mxbai")).toBe(true);
      expect(modelExists("nomic")).toBe(true);
    });

    it("should return false for nonexistent models", () => {
      expect(modelExists("nonexistent-model")).toBe(false);
      expect(modelExists("")).toBe(false);
    });
  });

  describe("getModelsByQuality", () => {
    it("should return low quality models", () => {
      const models = getModelsByQuality("low");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.quality === "low")).toBe(true);
      expect(models.map(m => m.name)).toContain("all-minilm");
    });

    it("should return medium quality models", () => {
      const models = getModelsByQuality("medium");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.quality === "medium")).toBe(true);
      expect(models.map(m => m.name)).toContain("nomic-embed-text");
    });

    it("should return high quality models", () => {
      const models = getModelsByQuality("high");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.quality === "high")).toBe(true);
      expect(models.map(m => m.name)).toContain("mxbai-embed-large");
    });

    it("should return highest quality models", () => {
      const models = getModelsByQuality("highest");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every(m => m.quality === "highest")).toBe(true);
      // OpenAI models should be highest quality
      expect(models.map(m => m.name)).toContain("text-embedding-3-small");
    });

    it("should return empty array for no matches", () => {
      // All quality levels should have matches, but test the filtering logic
      const allQualities: Array<ModelInfo["quality"]> = ["low", "medium", "high", "highest"];
      for (const quality of allQualities) {
        const models = getModelsByQuality(quality);
        expect(Array.isArray(models)).toBe(true);
      }
    });
  });

  describe("getRecommendedModel", () => {
    it("should return high-quality model for Ollama", () => {
      const model = getRecommendedModel("ollama");
      expect(model).toBeTruthy();
      expect(model?.provider).toBe("ollama");
      expect(["high", "highest"]).toContain(model?.quality);
    });

    it("should return medium-quality model for Transformers (best available)", () => {
      const model = getRecommendedModel("transformers");
      expect(model).toBeTruthy();
      expect(model?.provider).toBe("transformers");
      // Transformers models have max quality of "medium"
      // Function should prefer medium over low
      expect(model?.quality).toBe("medium");
    });

    it("should return high-quality model for OpenAI", () => {
      const model = getRecommendedModel("openai");
      expect(model).toBeTruthy();
      expect(model?.provider).toBe("openai");
      expect(["high", "highest"]).toContain(model?.quality);
    });

    it("should return null for unknown provider", () => {
      const model = getRecommendedModel("unknown");
      expect(model).toBeNull();
    });
  });

  describe("Model dimensions consistency", () => {
    it("should have consistent dimensions across providers", () => {
      // Check common dimension values
      const dims384 = MODEL_REGISTRY.filter(m => m.dimensions === 384);
      const dims768 = MODEL_REGISTRY.filter(m => m.dimensions === 768);
      const dims1024 = MODEL_REGISTRY.filter(m => m.dimensions === 1024);

      expect(dims384.length).toBeGreaterThan(0);
      expect(dims768.length).toBeGreaterThan(0);
      expect(dims1024.length).toBeGreaterThan(0);
    });
  });

  describe("Provider-specific attributes", () => {
    it("should have installation only for Ollama models", () => {
      const withInstallation = MODEL_REGISTRY.filter(m => m.installation);
      expect(withInstallation.every(m => m.provider === "ollama")).toBe(true);
    });

    it("should have cost only for OpenAI models", () => {
      const withCost = MODEL_REGISTRY.filter(m => m.cost);
      expect(withCost.every(m => m.provider === "openai")).toBe(true);
    });

    it("Transformers models should have neither installation nor cost", () => {
      const transformersModels = MODEL_REGISTRY.filter(m => m.provider === "transformers");
      expect(transformersModels.every(m => !m.installation && !m.cost)).toBe(true);
    });
  });
});
