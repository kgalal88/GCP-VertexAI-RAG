import { IngestionPipeline } from "./embed.js";

const pipeline = new IngestionPipeline(
      "pdf_documents/", // Path to your PDFs
      1000,            // Chunk size
      200,             // Chunk overlap
      "default"        // Atlas Vector Search Index Name
    );

// Run the ingestion process
pipeline.run();