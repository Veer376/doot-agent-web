"use client";

import type React from "react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, FileUp } from "lucide-react";
import { useDocuments } from "../../hooks/use-documents";
import { DocumentsTable } from "./documents-table";

interface DocumentsCardProps {
  selectedCollection: string;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export function DocumentsCard({
  selectedCollection,
  currentPage,
  setCurrentPage,
}: DocumentsCardProps) {
  const {
    documents,
    handleFileUpload: handleDocumentFileUpload,
    handleTextUpload: handleDocumentTextUpload,
  } = useDocuments();

  const itemsPerPage = 5;

  const [textInput, setTextInput] = useState("");

  const filteredDocuments = useMemo(
    () =>
      documents.filter((doc) => doc.metadata.collection === selectedCollection),
    [documents, selectedCollection],
  );

  // Calculate pagination for documents
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const currentDocuments = useMemo(
    () =>
      filteredDocuments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
      ),
    [filteredDocuments, currentPage, itemsPerPage],
  );

  // Handle file upload (uses document hook)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    handleDocumentFileUpload(files, selectedCollection);
  };

  // Handle text upload (uses document hook)
  const handleTextUpload = () => {
    if (textInput.trim()) {
      handleDocumentTextUpload(textInput, selectedCollection);
      setTextInput(""); // Clear text input after upload
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{`${selectedCollection} Documents`}</CardTitle>
        <CardDescription>
          {"Manage documents in this collection"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Tabs defaultValue="file">
            <TabsList className="mb-4">
              <TabsTrigger value="file">Upload File</TabsTrigger>
              <TabsTrigger value="text">Add Text</TabsTrigger>
            </TabsList>
            <TabsContent value="file">
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <FileUp className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground mb-2 text-sm">
                  Drag and drop files here or click to browse
                </p>
                <Input
                  type="file"
                  className="hidden"
                  id="file-upload"
                  multiple
                  onChange={handleFileUpload}
                />
                <Label htmlFor="file-upload">
                  <Button
                    variant="outline"
                    className="mt-2"
                    asChild
                  >
                    <span>Select Files</span>
                  </Button>
                </Label>
              </div>
            </TabsContent>
            <TabsContent value="text">
              <div className="space-y-4">
                <Textarea
                  placeholder="Paste or type your text here..."
                  className="min-h-[150px]"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <Button
                  onClick={handleTextUpload}
                  disabled={!textInput.trim()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Text Document
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Document Table */}
        <div className="rounded-md border">
          <DocumentsTable documents={currentDocuments} />
        </div>

        {/* Pagination */}
        {filteredDocuments.length > itemsPerPage && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(Math.max(1, currentPage - 1));
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
                      setCurrentPage(page + 1);
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
                    setCurrentPage(Math.min(totalPages, currentPage + 1));
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
      </CardContent>
    </Card>
  );
}
