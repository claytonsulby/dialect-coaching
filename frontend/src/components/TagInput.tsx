import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { Tag } from "../types";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ value, onChange, placeholder = "Add tag..." }: TagInputProps) {
  const [input, setInput] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.tags.list().then(setAllTags).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = allTags.filter(
    (t) =>
      t.name.includes(input.toLowerCase()) &&
      !value.includes(t.name)
  );

  const addTag = (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm focus-within:border-blue-500 min-h-[38px] items-center">
        {value.map((tag) => (
          <span
            key={tag}
            className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-xs flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-blue-400/60 hover:text-blue-300 transition"
            >
              x
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-white placeholder-gray-500"
        />
      </div>
      {showDropdown && input && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg max-h-40 overflow-y-auto">
          {filtered.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag.name)}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
            >
              {tag.name}
              <span className="text-gray-500 ml-2 text-xs">({tag.sample_count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
