import { useState, useCallback } from "react";
import type { Document as DocumentInterface } from "@langchain/core/documents";
import { v4 as uuidv4 } from "uuid";

// Define a specific metadata type for clarity
export interface RagDocumentMetadata extends Record<string, any> {
  id: string; // Ensure ID is part of metadata for consistency
  name: string;
  collection: string;
  size: string;
  uploadDate: string;
}

// Define the structure of the document more explicitly
export type RagDocument = DocumentInterface<RagDocumentMetadata>;

// Initial sample documents (can be moved outside or fetched)
const initialDocuments: RagDocument[] = [
  {
    pageContent: "Placeholder content for Introduction to AI.pdf",
    metadata: {
      id: "1",
      name: "Introduction to AI.pdf",
      collection: "General Knowledge",
      size: "1.2 MB",
      uploadDate: "2023-05-15",
    },
    id: uuidv4(),
  },
  {
    pageContent: "Placeholder content for Machine Learning Basics.pdf",
    metadata: {
      id: "2",
      name: "Machine Learning Basics.pdf",
      collection: "General Knowledge",
      size: "2.5 MB",
      uploadDate: "2023-05-16",
    },
    id: uuidv4(),
  },
  {
    pageContent: "Placeholder content for Neural Networks.pdf",
    metadata: {
      id: "3",
      name: "Neural Networks.pdf",
      collection: "General Knowledge",
      size: "3.1 MB",
      uploadDate: "2023-05-17",
    },
    id: uuidv4(),
  },
  {
    pageContent: "Placeholder content for API Documentation.pdf",
    metadata: {
      id: "4",
      name: "API Documentation.pdf",
      collection: "Technical Documentation",
      size: "1.8 MB",
      uploadDate: "2023-05-18",
    },
    id: uuidv4(),
  },
  {
    pageContent: "Placeholder content for Database Schema.pdf",
    metadata: {
      id: "5",
      name: "Database Schema.pdf",
      collection: "Technical Documentation",
      size: "0.9 MB",
      uploadDate: "2023-05-19",
    },
    id: uuidv4(),
  },
  {
    pageContent: "Placeholder content for Deployment Guide.pdf",
    metadata: {
      id: "6",
      name: "Deployment Guide.pdf",
      collection: "Technical Documentation",
      size: "1.5 MB",
      uploadDate: "2023-05-20",
    },
    id: uuidv4(),
  },
  {
    pageContent: "Placeholder content for RAG Overview.pdf",
    metadata: {
      id: "7",
      name: "RAG Overview.pdf",
      collection: "General Knowledge",
      size: "2.2 MB",
      uploadDate: "2023-05-21",
    },
    id: uuidv4(),
  },
  {
    pageContent: "Placeholder content for Vector Databases.pdf",
    metadata: {
      id: "8",
      name: "Vector Databases.pdf",
      collection: "General Knowledge",
      size: "1.7 MB",
      uploadDate: "2023-05-22",
    },
    id: uuidv4(),
  },
];

export function useDocuments(initialState: RagDocument[] = initialDocuments) {
  const [documents, setDocuments] = useState<RagDocument[]>(initialState);

  // Add a single document
  const addDocument = useCallback((doc: RagDocument) => {
    // Ensure metadata and metadata.id exist before accessing/adding
    const metadataWithId = {
      ...(doc.metadata || {}),
      id: doc.metadata?.id ?? uuidv4(),
    };
    setDocuments((prevDocs) => [
      ...prevDocs,
      { ...doc, metadata: metadataWithId, id: metadataWithId.id },
    ]); // Use metadata id as top-level id if needed
  }, []);

  // Add multiple documents
  const addDocuments = useCallback((docs: RagDocument[]) => {
    const docsWithIds = docs.map((doc) => {
      const metadataWithId = {
        ...(doc.metadata || {}),
        id: doc.metadata?.id ?? uuidv4(),
      };
      return { ...doc, metadata: metadataWithId, id: metadataWithId.id }; // Use metadata id as top-level id
    });
    setDocuments((prevDocs) => [...prevDocs, ...docsWithIds]);
  }, []);

  // Delete a document by its ID (using metadata.id)
  const deleteDocument = useCallback((id: string) => {
    setDocuments((prevDocs) =>
      prevDocs.filter((doc) => doc.metadata?.id !== id),
    );
  }, []);

  // Delete all documents belonging to a specific collection
  const deleteDocumentsByCollection = useCallback((collectionName: string) => {
    setDocuments((prevDocs) =>
      prevDocs.filter((doc) => doc.metadata?.collection !== collectionName),
    );
  }, []);

  // Handle file uploads and convert them to RagDocument format
  const handleFileUpload = useCallback(
    (files: FileList | null, collectionName: string) => {
      if (!files || files.length === 0 || collectionName === "all") {
        console.warn(
          "File upload skipped: No files selected or collection is 'all'.",
        );
        return;
      }

      const newDocs: RagDocument[] = Array.from(files).map((file) => {
        const newId = uuidv4();
        return {
          // For file uploads, pageContent might be loaded async or handled server-side.
          // Using file name as placeholder for now. Real implementation would involve reading the file.
          pageContent: `Content of ${file.name}`, // Placeholder
          metadata: {
            id: newId, // Generate unique ID here
            name: file.name,
            collection: collectionName,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            uploadDate: new Date().toISOString().split("T")[0],
          },
          id: newId, // Ensure top-level ID matches metadata ID
        };
      });

      addDocuments(newDocs); // Use addDocuments to add the array
    },
    [addDocuments],
  );

  // Handle text input and convert it to RagDocument format
  const handleTextUpload = useCallback(
    (textInput: string, collectionName: string) => {
      if (!textInput.trim() || collectionName === "all") {
        console.warn(
          "Text upload skipped: Text is empty or collection is 'all'.",
        );
        return;
      }
      const newId = uuidv4();
      const newDoc: RagDocument = {
        pageContent: textInput,
        metadata: {
          id: newId, // Generate unique ID here
          name: `Text Document ${new Date().toISOString().slice(0, 19).replace("T", " ")}.txt`,
          collection: collectionName,
          size: `${(textInput.length / 1024).toFixed(1)} KB`,
          uploadDate: new Date().toISOString().split("T")[0],
        },
        id: newId, // Ensure top-level ID matches metadata ID
      };

      addDocument(newDoc); // Use addDocument to add the single doc
    },
    [addDocument],
  );

  return {
    documents,
    addDocument, // Expose if needed for direct single additions elsewhere
    addDocuments, // Expose if needed for direct multiple additions elsewhere
    deleteDocument,
    deleteDocumentsByCollection,
    handleFileUpload, // Specific handler for file input
    handleTextUpload, // Specific handler for text input
  };
}
