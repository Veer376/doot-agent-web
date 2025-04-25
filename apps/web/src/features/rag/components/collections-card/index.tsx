"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderPlus } from "lucide-react";
import { useRagContext } from "../../providers/RAG";
import type { Collection } from "@/types/collection";
import { useState } from "react";
import { CollectionsList } from "../collections-list";

interface CollectionsCardProps {
  collections: Collection[];
  selectedCollection: string;
  setSelectedCollection: React.Dispatch<React.SetStateAction<string>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export function CollectionsCard({
  collections,
  selectedCollection,
  setSelectedCollection,
  setCurrentPage,
}: CollectionsCardProps) {
  const { createCollection, deleteCollection, deleteDocumentsByCollection } =
    useRagContext();

  // State for new collection name and description (used for the input fields)
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  // State for pagination
  const [collectionsCurrentPage, setCollectionsCurrentPage] = useState(1);
  const collectionsItemsPerPage = 5;

  // Handle creating a new collection (uses hook)
  const handleCreateCollection = () => {
    const success = createCollection(
      newCollectionName,
      newCollectionDescription,
    );
    if (success) {
      setNewCollectionName(""); // Clear input fields on success
      setNewCollectionDescription("");
    } else {
      console.warn(
        `Collection named '${newCollectionName}' could not be created (likely already exists).`,
      );
    }
  };

  // Handle deleting a collection (uses collection hook and document hook)
  const handleDeleteCollection = (name: string) => {
    const deletedCollectionName = deleteCollection(name);
    if (deletedCollectionName) {
      // Use the document hook to delete related documents
      deleteDocumentsByCollection(deletedCollectionName);
    }
    if (selectedCollection === name) {
      setSelectedCollection("all"); // Reset selection if the deleted collection was selected
      setCurrentPage(1); // Reset document page
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Collections</CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
              <DialogDescription>
                Enter a name and description for your new collection.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="collection-name"
                  className="text-right"
                >
                  Name
                </Label>
                <Input
                  id="collection-name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="collection-description"
                  className="text-right"
                >
                  Description
                </Label>
                <Textarea
                  id="collection-description"
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Optional description..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <CollectionsList
          collections={collections}
          selectedCollection={selectedCollection}
          onSelect={(name) => {
            setSelectedCollection(name);
            setCurrentPage(1); // Reset page when collection changes
            setCollectionsCurrentPage(1);
          }}
          onDelete={(name) => handleDeleteCollection(name)}
          currentPage={collectionsCurrentPage}
          itemsPerPage={collectionsItemsPerPage}
          totalCollections={collections.length}
          onPageChange={setCollectionsCurrentPage}
        />
      </CardContent>
    </Card>
  );
}
