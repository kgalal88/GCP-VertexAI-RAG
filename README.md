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

# 🤖 GCP VertexAI RAG Chatbot — Full Deployment Guide

This project demonstrates a **Retrieval-Augmented Generation (RAG)** chatbot powered by **Google Cloud Vertex AI**, **MongoDB Atlas**, and **Cloud Run**.  
It provides end-to-end setup — from document ingestion and embedding to serving the chatbot API and frontend.

---

## 🧠 Prerequisites

Ensure you have:
- Google Cloud SDK installed → [Install gcloud CLI](https://cloud.google.com/sdk/docs/install)
- Docker and Node.js (>=18)
- Project ID: `project-ecdcfdd2-bb6a-4b14-94a`
- Region: `asia-south1`
```
---

## ⚙️ Step 1: Authentication & Environment Setup

```bash
gcloud auth application-default login
gcloud auth configure-docker us-docker.pkg.dev

gcloud services enable artifactregistry.googleapis.com     cloudbuild.googleapis.com     eventarc.googleapis.com     run.googleapis.com     logging.googleapis.com     pubsub.googleapis.com

export REGION=asia-south1
gcloud config set run/region ${REGION}
gcloud config set run/platform managed
gcloud config set eventarc/location ${REGION}
```

---

## 🧩 Step 2: Build and Run Backend (RAG API)

```bash
npm start
```

### 🐳 Build & Push Backend Image

```bash
docker build -t chat-rag:latest .
docker tag chat-rag:latest us.gcr.io/project-ecdcfdd2-bb6a-4b14-94a/my-ai-rag-app:latest
docker push us.gcr.io/project-ecdcfdd2-bb6a-4b14-94a/my-ai-rag-app:latest
```

---

## 💻 Step 3: Build and Deploy Frontend Client

```bash
cd ../client/
npm run build

docker build -t chat-rag-client:latest .
docker tag chat-rag-client:latest us.gcr.io/project-ecdcfdd2-bb6a-4b14-94a/my-ai-rag-app-client:latest
docker push us.gcr.io/project-ecdcfdd2-bb6a-4b14-94a/my-ai-rag-app-client:latest
```

---

## 🌐 Step 4: Deploy Services to Cloud Run

```bash
# Backend
gcloud run deploy my-ai-rag-app     --image=us.gcr.io/project-ecdcfdd2-bb6a-4b14-94a/my-ai-rag-app:latest     --network=default     --subnet=default     --region=asia-south1     --vpc-egress=all-traffic

# Frontend
gcloud run deploy my-ai-rag-app-client     --image=us.gcr.io/project-ecdcfdd2-bb6a-4b14-94a/my-ai-rag-app-client:latest     --network=default     --subnet=default     --region=asia-south1
```

---

## 🌉 Step 5: Configure VPC NAT

```bash
gcloud compute routers create rag-chatbot-router --network=default --region=asia-south1
gcloud compute addresses create rag-chatbot-ip --region=asia-south1
gcloud compute routers nats create rag-chatbot-nat   --router=rag-chatbot-router   --region=asia-south1   --nat-custom-subnet-ip-ranges=default   --nat-external-ip-pool=rag-chatbot-ip
```

---

## 🔒 Step 6: Test API Endpoint

```bash
curl --location 'https://my-ai-rag-app-1091313701655.asia-south1.run.app/messages' --header "Authorization: Bearer $(gcloud auth print-identity-token)" --header 'Content-Type: application/json' --data '{
    "text": "Who is Khalid Galal?",
    "rag": "true"
}'
```

---

## 🚪 Step 7: Deploy API Gateway (ESPv2)

```bash
gcloud endpoints services deploy openapi-run.yaml   --project project-ecdcfdd2-bb6a-4b14-94a

gcloud services enable my-ai-rag-app-1091313701655.asia-south1.run.app

chmod +x gcloud_build_image

./gcloud_build_image -s my-ai-rag-app-1091313701655.asia-south1.run.app     -c 2025-10-26r4 -p project-ecdcfdd2-bb6a-4b14-94a

gcloud run deploy my-ai-rag-app-endpoint   --image="gcr.io/project-ecdcfdd2-bb6a-4b14-94a/endpoints-runtime-serverless:no-new-use-public-image-2.48-my-ai-rag-app-1091313701655.asia-south1.run.app-2025-10-26r4"   --allow-unauthenticated   --platform managed   --project=project-ecdcfdd2-bb6a-4b14-94a
```

### IAM Binding

```bash
gcloud projects add-iam-policy-binding 1091313701655        --member "serviceAccount:1091313701655-compute@developer.gserviceaccount.com"        --role roles/servicemanagement.serviceController
```

---

## ☁️ Step 8: EventArc + Pub/Sub for Embedding Trigger

```bash
SERVICE_ACCOUNT=eventarc-trigger-sa
gcloud iam service-accounts create $SERVICE_ACCOUNT

gcloud run deploy rag-chatbot-function     --source .     --function embedFromGCS     --base-image nodejs22

gcloud projects add-iam-policy-binding 1091313701655     --member=serviceAccount:1091313701655-compute@developer.gserviceaccount.com     --role=roles/eventarc.eventReceiver

gcloud eventarc triggers create rag-chatbot-trigger      --location=${REGION}     --destination-run-service=rag-chatbot-function      --destination-run-region=${REGION}     --event-filters="type=google.cloud.storage.object.v1.finalized"     --event-filters="bucket=rag-chat-bot-88"     --service-account=1091313701655-compute@developer.gserviceaccount.com
```

---

## 🔍 Step 9: MongoDB Atlas Vector Search Index

```json
{
  "fields": [
    {
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "euclidean",
      "type": "vector"
    }
  ]
}
```

---

## ✅ Deployment Complete

Your RAG Chatbot is now deployed with:
- Vertex AI integration
- Cloud Run backend & frontend
- MongoDB Atlas vector search
- Event-driven GCS document embedding

