import { useState, useCallback } from "react";
import type { Document as DocumentInterface } from "@langchain/core/documents";
import { v4 as uuidv4 } from "uuid";
import { Collection } from "@/types/collection";

// --- Type Definitions ---

// Document metadata structure
export interface RagDocumentMetadata extends Record<string, any> {
  id: string; // Unique ID for the document
  name: string;
  collection: string;
  size: string;
  created_at: string; // ISO 8601 format
}

// Document structure
export type RagDocument = DocumentInterface<RagDocumentMetadata>;

// Return type for the combined hook
interface UseRagReturn {
  // Collection state and operations
  collections: Collection[];
  createCollection: (name: string, description: string) => boolean;
  deleteCollection: (name: string) => string | undefined;
  getCollectionDescriptionByName: (name: string) => string | undefined;
  updateCollectionDescription: (name: string, description: string) => void;

  // Document state and operations
  documents: RagDocument[];
  addDocument: (doc: RagDocument) => void;
  addDocuments: (docs: RagDocument[]) => void;
  deleteDocument: (id: string) => void;
  deleteDocumentsByCollection: (collectionName: string) => void;
  handleFileUpload: (files: FileList | null, collectionName: string) => void;
  handleTextUpload: (textInput: string, collectionName: string) => void;
}

// Initial sample documents (can be moved outside or fetched)
// TODO: Replace with actual data fetching or remove if not needed
const initialDocuments: RagDocument[] = [
  {
    pageContent: "Placeholder content for Introduction to AI.pdf",
    metadata: {
      id: "1",
      name: "Introduction to AI.pdf",
      collection: "General Knowledge",
      size: "1.2 MB",
      created_at: new Date("2023-05-15T00:00:00.000Z").toISOString(),
    },
  },
  {
    pageContent: "Placeholder content for Machine Learning Basics.pdf",
    metadata: {
      id: "2",
      name: "Machine Learning Basics.pdf",
      collection: "General Knowledge",
      size: "2.5 MB",
      created_at: new Date("2023-05-16T00:00:00.000Z").toISOString(),
    },
  },
  // Add more sample documents if needed
];

/**
 * Custom hook for managing RAG collections and documents.
 * Combines the logic of useCollections and useDocuments.
 */
export function useRag(
  initialCollections: Collection[] = [],
  initialDocs: RagDocument[] = initialDocuments, // Use sample data or allow override
): UseRagReturn {
  // --- State ---
  const [collections, setCollections] =
    useState<Collection[]>(initialCollections);
  const [documents, setDocuments] = useState<RagDocument[]>(initialDocs);

  // --- Document Operations ---

  const addDocument = useCallback((doc: RagDocument) => {
    const metadataWithId = {
      ...(doc.metadata || {}),
      id: doc.metadata?.id ?? uuidv4(), // Ensure ID exists
    };
    setDocuments((prevDocs) => [
      ...prevDocs,
      { ...doc, metadata: metadataWithId }, // Use metadata id if needed elsewhere
    ]);
  }, []);

  const addDocuments = useCallback((docs: RagDocument[]) => {
    const docsWithIds = docs.map((doc) => {
      const metadataWithId = {
        ...(doc.metadata || {}),
        id: doc.metadata?.id ?? uuidv4(),
      };
      return { ...doc, metadata: metadataWithId };
    });
    setDocuments((prevDocs) => [...prevDocs, ...docsWithIds]);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments((prevDocs) =>
      prevDocs.filter((doc) => doc.metadata?.id !== id),
    );
  }, []);

  const deleteDocumentsByCollection = useCallback((collectionName: string) => {
    setDocuments((prevDocs) =>
      prevDocs.filter((doc) => doc.metadata?.collection !== collectionName),
    );
  }, []);

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
          pageContent: `Content of ${file.name}`, // Placeholder: Real implementation needs file reading
          metadata: {
            id: newId,
            name: file.name,
            collection: collectionName,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            created_at: new Date().toISOString(),
          },
        };
      });

      addDocuments(newDocs);
    },
    [addDocuments],
  );

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
          id: newId,
          name: `Text Document ${new Date().toISOString().slice(0, 19).replace("T", " ")}.txt`,
          collection: collectionName,
          size: `${(textInput.length / 1024).toFixed(1)} KB`,
          created_at: new Date().toISOString(),
        },
      };
      addDocument(newDoc);
    },
    [addDocument],
  );

  // --- Collection Operations ---

  const createCollection = useCallback(
    (name: string, description: string): boolean => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        console.error("Collection name cannot be empty.");
        return false;
      }
      const nameExists = collections.some(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (nameExists) {
        console.warn(`Collection with name "${trimmedName}" already exists.`);
        return false;
      }

      const newCollection: Collection = {
        name: trimmedName,
        description: description.trim(),
      };
      setCollections((prevCollections) => [...prevCollections, newCollection]);
      return true;
    },
    [collections],
  );

  // Modified deleteCollection to also remove associated documents
  const deleteCollection = useCallback(
    (name: string): string | undefined => {
      const collectionToDelete = collections.find((c) => c.name === name);
      const deletedCollectionName = collectionToDelete?.name;

      if (deletedCollectionName) {
        // Delete the collection itself
        setCollections((prevCollections) =>
          prevCollections.filter((collection) => collection.name !== name),
        );
        // Delete documents associated with this collection
        deleteDocumentsByCollection(deletedCollectionName);
      }
      return deletedCollectionName;
    },
    [collections, deleteDocumentsByCollection], // Added deleteDocumentsByCollection dependency
  );

  const updateCollectionDescription = useCallback(
    (name: string, description: string) => {
      setCollections((prevCollections) =>
        prevCollections.map((collection) =>
          collection.name === name
            ? { ...collection, description: description.trim() } // Trim description
            : collection,
        ),
      );
    },
    [], // No dependency needed if only using setCollections with functional update
  );

  const getCollectionDescriptionByName = useCallback(
    (name: string): string | undefined => {
      return collections.find((c) => c.name === name)?.description;
    },
    [collections],
  );

  // --- Return combined state and functions ---
  return {
    collections,
    createCollection,
    deleteCollection,
    getCollectionDescriptionByName,
    updateCollectionDescription,
    documents,
    addDocument,
    addDocuments,
    deleteDocument,
    deleteDocumentsByCollection,
    handleFileUpload,
    handleTextUpload,
  };
}
