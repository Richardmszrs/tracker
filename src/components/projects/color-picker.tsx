"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon-sm" className="shrink-0">
          <span
            className="size-3 rounded-full"
            style={{ backgroundColor: value }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-4 gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className="size-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
              style={{ backgroundColor: color, borderColor: color === value ? "#fff" : "transparent" }}
              onClick={() => onChange(color)}
            >
              {color === value && <CheckIcon className="size-3 text-white mx-auto" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
