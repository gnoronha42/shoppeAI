"use client";

import { useTheme } from "@/components/ui/theme-provider";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import { toggleTheme } from "@/features/theme/themeSlice";

export function ThemeToggle() {
  const { theme } = useTheme();
  const dispatch = useDispatch();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => dispatch(toggleTheme())}
      className="hover:bg-orange-100 dark:hover:bg-zinc-800"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-orange-600" />
      ) : (
        <Sun className="h-5 w-5 text-orange-400" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}