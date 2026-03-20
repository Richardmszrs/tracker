"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTags } from "@/lib/queries";

interface TagMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TagMultiSelect({ value, onChange }: TagMultiSelectProps) {
  const { data: tags = [] } = useTags();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedTags = tags.filter((t) => value.includes(t.id));

  const toggleTag = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full justify-start text-xs"
            onClick={() => setOpen(true)}
          >
            {selectedTags.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {selectedTags.map((t) => (
                  <Badge key={t.id} variant="secondary" className="text-[0.625rem] h-4">
                    {t.name}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">Add tags...</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.id}
                    onSelect={() => toggleTag(tag.id)}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`size-2 rounded-full border ${value.includes(tag.id) ? "bg-primary" : "border-border"}`}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-[0.625rem] h-4 gap-1">
              {tag.name}
              <button
                onClick={() => toggleTag(tag.id)}
                className="ml-0.5 hover:text-destructive"
              >
                <XIcon className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
