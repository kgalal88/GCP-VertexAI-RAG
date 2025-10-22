import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
// Assuming this is the correct path for your database connection utility
import { connectToDatabase } from "./database.js";

// Define the structure for the MongoDB connection details and vector store config
interface VectorStoreConfig {
  collection: any; // The MongoDB collection object
  indexName: string;
  textKey: string;
  embeddingKey: string;
}

/**
 * Encapsulates the process of loading, chunking, embedding, and ingesting documents
 * into a MongoDB Atlas Vector Store using LangChain and Vertex AI.
 */
export class IngestionPipeline {
  private pdfDirectory: string;
  private chunkSize: number;
  private chunkOverlap: number;
  private embeddingsModel: VertexAIEmbeddings;
  private vectorStoreConfig: Omit<VectorStoreConfig, 'collection'>;

  /**
   * Initializes the ingestion pipeline configuration.
   * @param pdfDirectory The local directory containing PDF documents.
   * @param chunkSize The maximum size for each text chunk.
   * @param chunkOverlap The overlap between sequential text chunks.
   * @param indexName The name of the Atlas Vector Search index.
   */
  constructor(
    pdfDirectory: string = "pdf_documents/",
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    indexName: string = "default"
  ) {
    this.pdfDirectory = pdfDirectory;
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;

    // Initialize the Vertex AI Embeddings model
    this.embeddingsModel = new VertexAIEmbeddings({
      model: "text-embedding-005"
    });

    // Configuration for the MongoDB Atlas Vector Store
    this.vectorStoreConfig = {
      indexName: indexName,
      textKey: "text",
      embeddingKey: "embedding",
    };
  }

  // ------------------------------------------------------------------
  // Private Helper Methods
  // ------------------------------------------------------------------

  /**
   * Loads documents from the specified local directory.
   */
  private async loadDocuments() {
    console.log(`\n--- Starting Document Loading ---`);
    const directoryLoader = new DirectoryLoader(
      this.pdfDirectory,
      {
        ".pdf": (path: string) => new PDFLoader(path),
      }
    );

    const docs = await directoryLoader.load();
    console.log(`Loaded ${docs.length} PDFs from '${this.pdfDirectory}'.`);
    return docs;
  }

  /**
   * Splits the loaded documents into smaller text chunks.
   * @param docs The array of loaded documents.
   */
  private async splitDocuments(docs: any[]) {
    console.log(`\n--- Starting Document Splitting ---`);
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
    });

    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Split into ${splitDocs.length} text chunks (Chunk Size: ${this.chunkSize}, Overlap: ${this.chunkOverlap}).`);
    return splitDocs;
  }

  /**
   * Initializes the MongoDBAtlasVectorSearch instance.
   * @param collection The connected MongoDB collection.
   */
  private initializeVectorStore(collection: any) {
    console.log(`\n--- Initializing Vector Store ---`);
    const vectorStore = new MongoDBAtlasVectorSearch(
      this.embeddingsModel,
      {
        collection: collection,
        ...this.vectorStoreConfig,
      }
    );
    console.log(`Vector Store initialized for index: ${this.vectorStoreConfig.indexName}`);
    return vectorStore;
  }

  // ------------------------------------------------------------------
  // Public Execution Method
  // ------------------------------------------------------------------

  /**
   * Executes the full ingestion pipeline: load, split, connect, and ingest.
   */
  public async run() {
    try {
      // 1. Load and Split Documents
      const docs = await this.loadDocuments();
      if (docs.length === 0) {
        console.log("No documents found. Exiting pipeline.");
        return;
      }
      const splitDocs = await this.splitDocuments(docs);

      // 2. Connect to Database
      console.log(`\n--- Connecting to Database ---`);
      // Assuming 'collections.context' is the correct collection for the vector store
      const collections = await connectToDatabase(); 
      const contextCollection = collections.context;
      
      // 3. Initialize Vector Store
      const vectorStore = this.initializeVectorStore(contextCollection);

      // 4. Insert Documents
      console.log(`\n--- Ingesting Documents into MongoDB Atlas ---`);
      const result = await vectorStore.addDocuments(splitDocs);

      console.log(`\n✅ Success: Imported ${result.length} documents into the MongoDB Atlas vector store.`);
    } catch (error) {
      console.error("\n❌ An error occurred during the ingestion pipeline:", error);
    } finally {
      process.exit(0);
    }
  }
}
