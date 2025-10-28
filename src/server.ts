import express from "express";
import cors from "cors";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";

import { config } from "./config.js";
import { connectToDatabase, collections } from "./database.js";

import { IngestionPipeline } from "./embed.js";

import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url'; // <-- Import to convert URL to path

import Multer from 'multer';
import { format } from 'util';


await connectToDatabase();

// Initialize the conversational Vertex AI model
const model = new ChatVertexAI({
  // We will use the Gemini 1.5 Pro model
  model: "gemini-2.0-flash",
  // The maximum number of tokens to generate in the response
  maxOutputTokens: 2048,
  // The temperature parameter controls the randomness of the output — the higher the value, the more random the output
  temperature: 0.5,
  // The topP parameter controls the diversity of the output — the higher the value, the more diverse the output
  topP: 0.9,
  // The topK parameter controls the diversity of the output — the higher the value, the more diverse the output
  topK: 20,
});

// Connect to the MongoDB Atlas vector store
const vectorStore = new MongoDBAtlasVectorSearch(
  // Google Cloud Vertex AI's text embeddings model will be used for vectorizing the text chunks
  new VertexAIEmbeddings({
    model: "text-embedding-005"
  }),
  {
    collection: collections.context as any,
    // The name of the Atlas Vector Search index. You must create this in the Atlas UI.
    indexName: "vector_index",
    // The name of the collection field containing the raw content. Defaults to "text"
    textKey: "text",
    // The name of the collection field containing the embedded text. Defaults to "embedding"
    embeddingKey: "embedding",
  }
);

// Initialize a retriever wrapper around the MongoDB Atlas vector store
const vectorStoreRetriever = vectorStore.asRetriever();

// Store chat history, starting with the system message that the assistant is a helpful insurance policies assistant
const history: BaseLanguageModelInput = [
  [
    "system",
``
  ],
];


const app = express();
app.use(cors());

const router = express.Router();
router.use(express.json());

router.get("/", async (_, res) => {
  res.send("Welcome to the Insurance Chatbot API! 🤖");
});

router.post("/messages", async (req, res) => {
  let message = req.body.text;
  if (!message) {
    return res.status(400).send({ error: 'Message is required' });
  }

  let prompt = `User question: ${message}.`;

  // If RAG is enabled, retrieve context from the MongoDB Atlas vector store
  const rag = req.body.rag;
  if (rag) {
    const context = await vectorStoreRetriever.invoke(message);

    if (context) {
      prompt += `

      Context:
      ${context?.map(doc => doc.pageContent).join("\n")}
    `;
    } else {
      console.error("Retrieval of context failed");
    }

    console.log(context);
    console.log('history ==> ' + [...history]);
  }

  try {
    const modelResponse = await model.invoke([...history, prompt]);
    const textResponse = modelResponse?.content;

    if (!textResponse) {
      return res.status(500).send({ error: 'Model invocation failed.' });
    }

    history.push([
      "human",
      message // Append only the user message to the history
    ]);

    history.push([
      "assistant",
      textResponse
    ]);

    return res.send({ text: textResponse });
  } catch (e) {
    console.error(e);
    return res.status(500).send({ error: 'Model invocation failed.' });
  }
});

// --- Configuration ---
const GCS_BUCKET_NAME = 'rag-chat-bot-88';
const GCS_PDF_PREFIX = 'pdfs/'; // The folder/prefix in your GCS bucket
const LOCAL_DOWNLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'temp_downloads');
const ATLAS_INDEX_NAME = "default";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Initialize GCS Client
const storage = new Storage();

/**
 * Downloads all PDF files from a GCS folder to a local directory.
 * @returns {Promise<void>}
 */
async function downloadPdfsFromGCS(fileName : string) {
    console.log(`Starting download from gs://${GCS_BUCKET_NAME}/${GCS_PDF_PREFIX}`);

    // 1. Ensure the local directory exists
    await fs.mkdir(LOCAL_DOWNLOAD_DIR, { recursive: true });

    // 2. List all files under the specified prefix
    const [files] = await storage.bucket(GCS_BUCKET_NAME).getFiles({
        prefix: GCS_PDF_PREFIX,
        // Optional: Exclude the prefix itself if it's a directory object
        autoPaginate: false,
    });

    if (files.length === 0) {
        console.log("No files found in the GCS path.");
        return;
    }

    // 3. Filter for PDF files and download them
    const downloadPromises = files
        .filter(file => file.name.toLowerCase().endsWith('.pdf') && file.name == fileName)
        .map(file => {
            // Get the base filename (e.g., 'report.pdf' from 'pdf_documents/report.pdf')
            const basename = path.basename(file.name);
            const destinationPath = path.join(LOCAL_DOWNLOAD_DIR, basename);

            console.log(`Downloading ${file.name} to ${destinationPath}`);
            return file.download({ destination: destinationPath });
        });

    await Promise.all(downloadPromises);
    console.log(`Successfully downloaded ${downloadPromises.length} PDF files.`);
}

router.post("/embed", async (req, res) => {
    // The original API had 'message', but ingestion doesn't need a message.
    // If this route is *only* for ingestion, we can ignore the body entirely or 
    // simply check for a security token if deployed publicly.
    const fileName = req.body.fileName; // Retaining for error check, though unused for ingestion

    if (!fileName) {
        // Keeping the original error check for consistency, though it's confusing here
        return res.status(400).send({ error: 'Message is required (or API should be renamed/repurposed)' });
    }

    try{
        console.log("Clean up the temporary local directory " + LOCAL_DOWNLOAD_DIR);
        await fs.rm(LOCAL_DOWNLOAD_DIR, { recursive: true, force: true });

        // 1. Download PDFs from Cloud Storage
        await downloadPdfsFromGCS(fileName);

        // 2. Initialize and run the Ingestion Pipeline on the local directory
        const pipeline = new IngestionPipeline(
            LOCAL_DOWNLOAD_DIR, // <-- Now uses the local download path
            CHUNK_SIZE,
            CHUNK_OVERLAP,
            ATLAS_INDEX_NAME
        );

        // Run the ingestion process (This might take a long time and should be done in the background)
        // If 'pipeline.run()' is synchronous, the user will wait.
        // If 'pipeline.run()' returns a Promise, use 'await'.
        pipeline.run(); 
        
        // 3. Clean up the temporary local directory (optional but recommended)
        // await fs.rm(LOCAL_DOWNLOAD_DIR, { recursive: true, force: true });
        
        return res.status(200).send({ 
            message: 'Successfully downloaded documents and ran the ingestion pipeline.',
            source_path: `gs://${GCS_BUCKET_NAME}/${GCS_PDF_PREFIX}`
        });

    } catch (e) {
        console.error("Ingestion Error:", e);
        return res.status(500).send({ 
            error: 'Ingestion pipeline execution failed.', 
            details: e.message 
        });
    }
});

// 1. Configure GCS
// Uses Application Default Credentials by default
const bucket = storage.bucket(GCS_BUCKET_NAME);

// 2. Configure Multer
// Use memory storage to avoid saving the file to the server's disk
const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
});

// --- REST API ENDPOINT ---
router.post(
  '/upload',
  multer.single('file'), // 'file' is the key expected in the form-data
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }

      // Create a new blob in the bucket and name it with a timestamp
      const gcsFileName = `${GCS_PDF_PREFIX}${req.file.originalname}`;
      console.log('Uploading file to ' + gcsFileName);
      const blob = bucket.file(gcsFileName);

      // Create a write stream for the GCS blob
      const blobStream = blob.createWriteStream({
        resumable: false, // Simple upload
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      // Handle stream events
      blobStream.on('error', (err) => {
        next(err); // Pass error to Express error handler
      });

      blobStream.on('finish', async () => {

        // Optional: Make the file public (requires 'Storage Object Admin' permission)
        // await blob.makePublic();

        res.status(200).send({
          message: 'File uploaded successfully to GCS',
          filename: gcsFileName,
        });
      });

      // Pipe the file buffer from Multer (in memory) to the GCS write stream
      blobStream.end(req.file.buffer);

    } catch (error) {
      console.error(error);
      res.status(500).send(`Could not upload the file: ${error.message}`);
    }
  }
);

app.use(router);

// start the Express server
app.listen(config.server.port, () => {
  console.log(`Server running on port:${config.server.port}...`);
});
