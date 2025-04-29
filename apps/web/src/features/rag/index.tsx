"use client";

import type React from "react";
import { useState } from "react";
import { DocumentsCard } from "./components/documents-card";
import { CollectionsCard } from "./components/collections-card";
import { useRagContext } from "./providers/RAG";

export default function RAGInterface() {
  const { selectedCollection, setSelectedCollection, collections } =
    useRagContext();
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Collections Section */}
        <div className="md:col-span-1">
          <CollectionsCard
            collections={collections}
            selectedCollection={selectedCollection}
            setSelectedCollection={setSelectedCollection}
            setCurrentPage={setCurrentPage}
          />
        </div>

        {/* Documents Section */}
        <div className="md:col-span-2">
          <DocumentsCard
            selectedCollection={selectedCollection}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
