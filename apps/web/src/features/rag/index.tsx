"use client";

import type React from "react";
import { useState } from "react";
import { DocumentsCard } from "./components/documents-card";
import { CollectionsCard } from "./components/collections-card";

export default function RAGInterface() {
  // Use the custom hook for collections
  const initialCollections = [
    { name: "General Knowledge", description: "Various topics" },
    { name: "Technical Documentation", description: "Software and API docs" },
    { name: "Science & Nature", description: "Physics, biology, environment" },
    {
      name: "History & Culture",
      description: "World history, traditions, societies",
    },
    {
      name: "Arts & Literature",
      description: "Painting, books, poetry, theatre",
    },
    { name: "Health & Wellness", description: "Medicine, fitness, nutrition" },
    {
      name: "Business & Finance",
      description: "Economics, markets, investing",
    },
    { name: "Travel & Geography", description: "Countries, cities, landmarks" },
    { name: "Food & Cooking", description: "Recipes, cuisines, restaurants" },
    {
      name: "Sports & Recreation",
      description: "Athletics, games, outdoor activities",
    },
    {
      name: "Music & Entertainment",
      description: "Movies, TV shows, artists, genres",
    },
    { name: "Current Events", description: "News, politics, world affairs" },
    {
      name: "Programming & Computer Science",
      description: "Algorithms, languages, systems",
    },
    { name: "Philosophy & Religion", description: "Ethics, beliefs, thinkers" },
    {
      name: "Education & Learning",
      description: "Teaching methods, academic resources",
    },
  ];

  // State for selected collection (stores name or 'all')
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Collections Section */}
        <div className="md:col-span-1">
          <CollectionsCard
            collections={initialCollections}
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
