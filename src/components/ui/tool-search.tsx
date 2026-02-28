import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface SearchProps {
  onSearchChange: (term: string) => void;
  placeholder?: string;
  className?: string;
}

export function Search({
  onSearchChange,
  placeholder,
  className,
}: SearchProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    onSearchChange(term);
  };

  return (
    <div
      data-radius="radius"
      className={cn(
        className,
        "flex items-center border-[1px] border-slate-200 px-2",
      )}
    >
      <SearchIcon className="size-4 text-slate-400" />
      <Input
        className="h-8 border-0 shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleInputChange}
      />
    </div>
  );
}
