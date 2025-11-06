# Embedding Models Reference

Complete guide to all supported embedding models for semantic search in Claude Conversation Memory.

## Table of Contents

- [Overview](#overview)
- [Model Registry](#model-registry)
- [Ollama Models (Local)](#ollama-models-local)
- [Transformers Models (Offline)](#transformers-models-offline)
- [OpenAI Models (Cloud)](#openai-models-cloud)
- [Choosing a Model](#choosing-a-model)
- [Configuration Examples](#configuration-examples)
- [Switching Models](#switching-models)

## Overview

Claude Conversation Memory uses vector embeddings to enable semantic search across your conversation history. You can choose from three types of embedding providers:

| Provider | Type | Setup | Quality | Cost |
|----------|------|-------|---------|------|
| **Ollama** | Local | Requires Ollama installation | High | Free |
| **Transformers** | Offline | No setup (auto-download) | Medium | Free |
| **OpenAI** | Cloud API | Requires API key | Highest | Paid |

## Model Registry

All supported models are centralized in `ModelRegistry.ts`, ensuring consistency across the codebase. Each model includes:

- **Name**: Model identifier
- **Dimensions**: Vector embedding size (affects database storage)
- **Provider**: ollama, transformers, or openai
- **Quality**: low, medium, high, highest
- **Description**: Use case and characteristics
- **Installation** (Ollama only): Command to pull the model
- **Cost** (OpenAI only): Pricing information

## Ollama Models (Local)

**Requires**: [Ollama](https://ollama.com) installed and running (`ollama serve`)

### mxbai-embed-large (Recommended)

```bash
ollama pull mxbai-embed-large
```

- **Dimensions**: 1024
- **Quality**: High
- **Best for**: General-purpose semantic search with excellent balance of speed and quality
- **Use case**: Default recommendation for most users

### nomic-embed-text

```bash
ollama pull nomic-embed-text
```

- **Dimensions**: 768
- **Quality**: Medium
- **Best for**: Fast semantic search with good quality
- **Use case**: When you need faster indexing and smaller database size

### all-minilm

```bash
ollama pull all-minilm
```

- **Dimensions**: 384
- **Quality**: Low
- **Best for**: Lightweight, fast embeddings
- **Use case**: Resource-constrained environments or very large conversation histories

### snowflake-arctic-embed

```bash
ollama pull snowflake-arctic-embed
```

- **Dimensions**: 1024
- **Quality**: High
- **Best for**: Retrieval-optimized tasks
- **Use case**: When search recall is critical

## Transformers Models (Offline)

**Requires**: `@xenova/transformers` npm package (auto-installed as optional dependency)

**No setup required** - models download automatically on first use to `~/.cache/huggingface/transformers/`

### Xenova/all-MiniLM-L6-v2 (Default Fallback)

- **Dimensions**: 384
- **Quality**: Low
- **Best for**: Quick setup, no configuration needed
- **Use case**: Default fallback when Ollama is not available

### Xenova/all-mpnet-base-v2

- **Dimensions**: 768
- **Quality**: Medium
- **Best for**: Better quality without external setup
- **Use case**: Improved search quality without Ollama

### Xenova/bge-small-en-v1.5

- **Dimensions**: 384
- **Quality**: Low
- **Best for**: English-optimized, lightweight
- **Use case**: English-only conversations, fast indexing

### Xenova/bge-base-en-v1.5

- **Dimensions**: 768
- **Quality**: Medium
- **Best for**: English-optimized, higher quality
- **Use case**: English-only conversations, better search quality

## OpenAI Models (Cloud)

**Requires**: OpenAI API key (set via `OPENAI_API_KEY` environment variable or config file)

### text-embedding-3-small (Recommended)

- **Dimensions**: 1536
- **Quality**: Highest
- **Cost**: $0.020 per 1M tokens (~$0.02 per 100K messages)
- **Best for**: High-quality semantic search with cost-effectiveness
- **Use case**: Production use with budget constraints

### text-embedding-3-large

- **Dimensions**: 3072
- **Quality**: Highest
- **Cost**: $0.130 per 1M tokens (~$0.13 per 100K messages)
- **Best for**: Best possible search quality
- **Use case**: When search quality is paramount and cost is secondary
- **Note**: Significantly larger database size due to 3072 dimensions

### text-embedding-ada-002 (Legacy)

- **Dimensions**: 1536
- **Quality**: High
- **Cost**: $0.100 per 1M tokens
- **Best for**: Legacy compatibility
- **Use case**: Existing deployments using ada-002

## Choosing a Model

### Decision Matrix

**I want the best quality and have an API budget:**
- ✅ OpenAI `text-embedding-3-small` (best value)
- ✅ OpenAI `text-embedding-3-large` (highest quality)

**I want high quality without API costs:**
- ✅ Ollama `mxbai-embed-large` (recommended)
- ✅ Ollama `snowflake-arctic-embed` (retrieval-focused)

**I want fast, good-enough results:**
- ✅ Ollama `nomic-embed-text`
- ✅ Transformers `Xenova/all-mpnet-base-v2`

**I want zero setup:**
- ✅ Transformers `Xenova/all-MiniLM-L6-v2` (auto-fallback)

**I have limited disk space:**
- ✅ Transformers `Xenova/bge-small-en-v1.5` (384 dims)
- ✅ Ollama `all-minilm` (384 dims)

### Quality Tiers

**Highest Quality** (Best semantic understanding):
- OpenAI `text-embedding-3-small`
- OpenAI `text-embedding-3-large`

**High Quality** (Excellent for most use cases):
- Ollama `mxbai-embed-large` ⭐ **Recommended**
- Ollama `snowflake-arctic-embed`

**Medium Quality** (Good balance):
- Ollama `nomic-embed-text`
- Transformers `Xenova/all-mpnet-base-v2`
- Transformers `Xenova/bge-base-en-v1.5`

**Low Quality** (Fast and lightweight):
- Ollama `all-minilm`
- Transformers `Xenova/all-MiniLM-L6-v2`
- Transformers `Xenova/bge-small-en-v1.5`

## Configuration Examples

### Using Ollama (Recommended)

```json
{
  "embedding": {
    "provider": "ollama",
    "model": "mxbai-embed-large",
    "dimensions": 1024,
    "baseUrl": "http://localhost:11434"
  }
}
```

### Using Transformers (No Setup)

```json
{
  "embedding": {
    "provider": "transformers",
    "model": "Xenova/all-mpnet-base-v2",
    "dimensions": 768
  }
}
```

### Using OpenAI

```json
{
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1536,
    "apiKey": "sk-..."
  }
}
```

**Note**: You can also set `OPENAI_API_KEY` environment variable instead of including the API key in the config file.

## Switching Models

### Important: Database Reset Required

⚠️ **Changing embedding models requires re-indexing** because different models produce different vector dimensions and representations.

When you switch models:

1. **Backup your database** (optional):
   ```bash
   cp .claude-conversations-memory.db .claude-conversations-memory.db.backup
   ```

2. **Update configuration**:
   ```bash
   # Via CLI
   claude-conversation-memory-mcp set provider ollama
   claude-conversation-memory-mcp set model mxbai-embed-large
   claude-conversation-memory-mcp set dimensions 1024

   # Or edit ~/.claude-memory-config.json directly
   ```

3. **Reset and re-index**:
   ```bash
   claude-conversation-memory-mcp reset
   claude-conversation-memory-mcp index
   ```

   Or via Claude Code CLI:
   ```
   "Reset the conversation memory database and reindex with the new model"
   ```

### Switching Within Same Dimensions

If you switch between models with the **same dimensions**, the database will still work, but search quality may degrade because embeddings are not compatible across models. **Always re-index after switching models.**

### Dimension Changes

Changing dimensions (e.g., 384 → 1024) **requires** database reset because vector table schema is dimension-specific.

## Advanced Topics

### Custom Models

You can use custom Ollama models not in the registry. Simply specify the model name and dimensions:

```json
{
  "embedding": {
    "provider": "ollama",
    "model": "my-custom-model:latest",
    "dimensions": 768
  }
}
```

The system will use the specified dimensions and fall back to 768 if not specified.

### Performance Considerations

**Indexing Speed** (100K messages):
- OpenAI: ~5-10 minutes (depends on network and API rate limits)
- Ollama: ~15-30 minutes (depends on local hardware)
- Transformers: ~30-60 minutes (CPU-only, no GPU acceleration in Node.js)

**Database Size** (per 100K messages):
- 384 dimensions: ~150 MB
- 768 dimensions: ~300 MB
- 1024 dimensions: ~400 MB
- 1536 dimensions: ~600 MB
- 3072 dimensions: ~1.2 GB

**Search Speed** (all models):
- Similar performance (~50-200ms) regardless of model
- Vector search dominates query time, not embedding generation

### Multi-Language Support

**Best for non-English**:
- Ollama `mxbai-embed-large` (multilingual)
- OpenAI `text-embedding-3-small` (100+ languages)

**English-only**:
- Transformers `Xenova/bge-base-en-v1.5` (optimized for English)

---

## Quick Reference

```bash
# View all available models
claude-conversation-memory-mcp config

# Check current configuration
claude-conversation-memory-mcp get provider
claude-conversation-memory-mcp get model
claude-conversation-memory-mcp get dimensions

# Switch to Ollama
claude-conversation-memory-mcp set provider ollama
claude-conversation-memory-mcp set model mxbai-embed-large
claude-conversation-memory-mcp set dimensions 1024

# Switch to Transformers
claude-conversation-memory-mcp set provider transformers
claude-conversation-memory-mcp set model Xenova/all-mpnet-base-v2
claude-conversation-memory-mcp set dimensions 768

# Switch to OpenAI
claude-conversation-memory-mcp set provider openai
claude-conversation-memory-mcp set model text-embedding-3-small
claude-conversation-memory-mcp set dimensions 1536
# Also set: export OPENAI_API_KEY=sk-...
```

---

**Updated**: January 2025
**Version**: 0.4.1
