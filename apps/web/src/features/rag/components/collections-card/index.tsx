"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderPlus, AlertCircle } from "lucide-react";
import { useRagContext } from "../../providers/RAG";
import type { Collection } from "@/types/collection";
import { useState } from "react";
import { CollectionsList } from "../collections-list";
import { DEFAULT_COLLECTION_NAME } from "../../hooks/use-rag";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface CollectionsCardProps {
  collections: Collection[];
  selectedCollection: Collection | undefined;
  setSelectedCollection: React.Dispatch<
    React.SetStateAction<Collection | undefined>
  >;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export function CollectionsCard({
  collections,
  selectedCollection,
  setSelectedCollection,
  setCurrentPage,
}: CollectionsCardProps) {
  const {
    createCollection,
    deleteCollection,
    listDocuments,
    setDocuments,
    updateCollection,
  } = useRagContext();

  const [open, setOpen] = useState(false);

  // State for new collection name and description (used for the input fields)
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");

  // Character limit for description
  const DESCRIPTION_MAX_LENGTH = 850;
  const isDescriptionTooLong =
    newCollectionDescription.length > DESCRIPTION_MAX_LENGTH;

  // State for pagination
  const [collectionsCurrentPage, setCollectionsCurrentPage] = useState(1);
  const collectionsItemsPerPage = 5;

  // Handle creating a new collection (uses hook)
  const handleCreateCollection = async () => {
    if (newCollectionName === DEFAULT_COLLECTION_NAME) {
      toast.warning(`Default collection name is reserved.`, {
        description: "Please choose a different name.",
        duration: 5000,
        richColors: true,
      });
      return;
    }
    const loadingToast = toast.loading("Creating collection", {
      richColors: true,
    });
    const success = await createCollection(newCollectionName, {
      description: newCollectionDescription,
    });
    toast.dismiss(loadingToast);
    if (success) {
      setNewCollectionName(""); // Clear input fields on success
      setOpen(false);
      toast.success("Collection created successfully", { richColors: true });
    } else {
      toast.warning(
        `Collection named '${newCollectionName}' could not be created (likely already exists).`,
        {
          duration: 5000,
          richColors: true,
        },
      );
    }
  };

  // Handle deleting a collection (uses collection hook and document hook)
  const handleDeleteCollection = async (name: string) => {
    const loadingToast = toast.loading("Deleting collection", {
      richColors: true,
    });
    await deleteCollection(name);
    toast.dismiss(loadingToast);
    toast.success("Collection deleted successfully", { richColors: true });
    if (selectedCollection?.name === name) {
      const newSelectedCollection = collections.find((c) => c.name !== name);
      if (!newSelectedCollection) {
        toast.error("No collections remaining.", { richColors: true });
        return;
      }
      setSelectedCollection(newSelectedCollection);
      setCurrentPage(1); // Reset document page
      const docs = await listDocuments(newSelectedCollection.name);
      setDocuments(docs);
    }
  };

  const handleUpdateCollection = async (
    currentName: string,
    name: string,
    metadata: Record<string, any>,
  ) => {
    const loadingToast = toast.loading("Updating collection", {
      richColors: true,
    });
    await updateCollection(currentName, name, metadata);
    toast.dismiss(loadingToast);
    toast.success("Collection updated successfully", { richColors: true });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Collections</CardTitle>
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
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
                Enter a name for your new collection.
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
              <div className="grid grid-cols-4 items-start gap-4">
                <Label
                  htmlFor="collection-description"
                  className="text-right"
                >
                  Description
                </Label>
                <div className="col-span-3 space-y-2">
                  <Textarea
                    id="collection-description"
                    value={newCollectionDescription}
                    onChange={(e) =>
                      setNewCollectionDescription(e.target.value)
                    }
                  />
                  <div className="text-muted-foreground text-right text-xs">
                    {newCollectionDescription.length}/{DESCRIPTION_MAX_LENGTH}{" "}
                    characters
                  </div>
                </div>
              </div>
              {isDescriptionTooLong && (
                <div className="mt-2">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Description exceeds the maximum length of{" "}
                      {DESCRIPTION_MAX_LENGTH} characters.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim() || isDescriptionTooLong}
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
          onSelect={async (name) => {
            if (selectedCollection?.name === name) {
              return;
            }
            setSelectedCollection(collections.find((c) => c.name === name));
            setCurrentPage(1); // Reset page when collection changes
            setCollectionsCurrentPage(1);
            const documents = await listDocuments(name);
            setDocuments(documents);
          }}
          onDelete={(name) => handleDeleteCollection(name)}
          onEdit={handleUpdateCollection}
          currentPage={collectionsCurrentPage}
          itemsPerPage={collectionsItemsPerPage}
          totalCollections={collections.length}
          onPageChange={setCollectionsCurrentPage}
        />
      </CardContent>
    </Card>
  );
}
