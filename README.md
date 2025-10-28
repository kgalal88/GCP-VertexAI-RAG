# 🤖 GCP VertexAI RAG — Context-Aware Chatbot with Gemini & MongoDB Atlas

A **Retrieval Augmented Generation (RAG)** chatbot powered by **Google Cloud Vertex AI (Gemini)** and **MongoDB Atlas**, designed to provide context-specific answers by combining document retrieval and generative AI.

This project demonstrates a complete RAG pipeline — from document ingestion and vectorization to API serving and an Angular-based user interface.

---

## 💡 Project Goal

This project implements a **context-aware RAG system** that integrates:
- **Google Vertex AI (Gemini 1.0 Pro)** for LLM and embeddings  
- **MongoDB Atlas** as the vector store  
- **LangChain** for RAG orchestration  
- **Node.js / Express.js** backend  
- **Angular** frontend  

It is a **full-stack reference architecture** for deploying a production-ready RAG chatbot on **Google Cloud Run**.

---

## ⚙️ Technical Stack & Structure

| Layer | Technology | Key Files/Folders |
|-------|-------------|-------------------|
| **Orchestration** | LangChain | `src/` (RAG logic) |
| **LLM & Embeddings** | Google Vertex AI (Gemini 1.0 Pro) | `src/` (API calls) |
| **Vector Database** | MongoDB Atlas | `.env` (connection string) |
| **Backend** | Express.js (TypeScript) | `src/`, `package.json`, `tsconfig.json` |
| **Frontend** | Angular + Angular Material | `client/` |
| **Containerization** | Docker | `Dockerfile` |
| **Deployment** | Google Cloud Run | `gcloud_build_image`, `openapi-run.yaml` |

---

## 📁 Repository Contents

| Folder/File | Purpose |
|--------------|----------|
| `client/` | Angular frontend for chat interface |
| `src/` | Express.js backend logic (TypeScript), including RAG endpoint and LangChain setup |
| `eventarc/` | Eventarc trigger configurations for event-driven document ingestion |
| `Dockerfile` | Instructions for building the Docker image |
| `gcloud_build_image` | Shell script to automate Docker image build and push to Google Artifact Registry |
| `openapi-run.yaml` | OpenAPI configuration for Cloud Run or API Gateway deployment |
| `package.json` | Defines project dependencies and scripts (`start`, `embed-documents`) |

---

## ⚡ Quick Start (Local Development)

### 🧩 Prerequisites
Ensure the following are installed and configured:
- [Node.js](https://nodejs.org/) (v18+)
- Access to **Google Cloud Vertex AI**
- A **MongoDB Atlas** cluster

---

### 🚀 Setup

```bash
# Clone the repository
git clone https://github.com/kgalal88/GCP-VertexAI-RAG.git
cd GCP-VertexAI-RAG

# Create environment configuration
echo "ATLAS_URI=<your-mongodb-atlas-connection-string>" > .env
