import { useState, useCallback } from "react";
import { Collection } from "@/types/collection";

// Define the return type of the hook
interface UseCollectionsReturn {
  collections: Collection[];
  createCollection: (name: string, description: string) => boolean; // Returns true if created, false if name exists
  deleteCollection: (name: string) => string | undefined; // Returns the name of the deleted collection or undefined
  getCollectionDescriptionByName: (name: string) => string | undefined;
  updateCollectionDescription: (name: string, description: string) => void; // Added for potential updates
}

/**
 * Custom hook for managing collections based on name and description.
 * Handles state and operations like creating, deleting, and updating collections.
 */
export const useCollections = (
  initialCollections: Collection[] = [],
): UseCollectionsReturn => {
  const [collections, setCollections] =
    useState<Collection[]>(initialCollections);

  /**
   * Creates a new collection if the name doesn't already exist.
   * @param name - The name of the new collection (must be unique).
   * @param description - The description of the new collection.
   * @returns True if the collection was created, false otherwise (e.g., name collision).
   */
  const createCollection = useCallback(
    (name: string, description: string): boolean => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        console.error("Collection name cannot be empty.");
        return false;
      }
      // Check if collection with the same name already exists
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
  ); // Dependency on collections to check for existing names

  /**
   * Deletes a collection by its name.
   * @param name - The name of the collection to delete.
   * @returns The name of the deleted collection or undefined if not found.
   */
  const deleteCollection = useCallback(
    (name: string): string | undefined => {
      const collectionToDelete = collections.find((c) => c.name === name);
      const deletedCollectionName = collectionToDelete?.name;

      if (deletedCollectionName) {
        setCollections((prevCollections) =>
          prevCollections.filter((collection) => collection.name !== name),
        );
      }
      return deletedCollectionName;
    },
    [collections],
  ); // Dependency added

  /**
   * Updates the description for a specific collection.
   * @param name - The name of the collection to update.
   * @param description - The new description.
   */
  const updateCollectionDescription = useCallback(
    (name: string, description: string) => {
      setCollections((prevCollections) =>
        prevCollections.map((collection) =>
          collection.name === name
            ? { ...collection, description: description }
            : collection,
        ),
      );
    },
    [],
  );

  /**
   * Gets the description of a collection by its name.
   * @param name - The name of the collection.
   * @returns The description of the collection or undefined if not found.
   */
  const getCollectionDescriptionByName = useCallback(
    (name: string): string | undefined => {
      return collections.find((c) => c.name === name)?.description;
    },
    [collections],
  );

  return {
    collections,
    createCollection,
    deleteCollection,
    getCollectionDescriptionByName,
    updateCollectionDescription,
  };
};
