"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Trash2 } from "lucide-react";
import type { Collection } from "@/types/collection";

interface CollectionsListProps {
  collections: Collection[];
  selectedCollection: string;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
  currentPage: number;
  itemsPerPage: number;
  totalCollections: number;
  onPageChange: (page: number) => void;
}

export function CollectionsList({
  collections,
  selectedCollection,
  onSelect,
  onDelete,
  currentPage,
  itemsPerPage,
  totalCollections,
  onPageChange,
}: CollectionsListProps) {
  const totalPages = Math.ceil(totalCollections / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCollections = collections.slice(startIndex, endIndex);

  return (
    <div>
      <div className="space-y-2">
        <div
          className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${selectedCollection === "all" ? "bg-muted" : "hover:bg-muted/50"}`}
          onClick={() => onSelect("all")}
        >
          <span>All Documents</span>
        </div>

        {paginatedCollections.map((collection) => (
          <div
            key={collection.name}
            className={`flex cursor-pointer items-center justify-between rounded-md p-2 ${selectedCollection === collection.name ? "bg-muted" : "hover:bg-muted/50"}`}
            onClick={() => onSelect(collection.name)}
          >
            <span>{collection.name}</span>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <Trash2 className="text-destructive h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the collection "
                      {collection.name}"? This will also delete all associated
                      documents.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(collection.name)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(Math.max(1, currentPage - 1));
                }}
                aria-disabled={currentPage === 1}
                className={
                  currentPage === 1
                    ? "text-muted-foreground pointer-events-none"
                    : undefined
                }
              />
            </PaginationItem>
            {[...Array(totalPages)].map((_, page) => (
              <PaginationItem key={page + 1}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(page + 1);
                  }}
                  isActive={currentPage === page + 1}
                >
                  {page + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(Math.min(totalPages, currentPage + 1));
                }}
                aria-disabled={currentPage === totalPages}
                className={
                  currentPage === totalPages
                    ? "text-muted-foreground pointer-events-none"
                    : undefined
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
