"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CATEGORIES } from "@/lib/types";

const navItems = [
  { label: "홈", href: "/" },
  ...CATEGORIES.map((cat) => ({ label: cat.title, href: cat.href })),
  { label: "최근 결과", href: "/history" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="backdrop-blur-xl bg-card/70 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Sparkles className="h-6 w-6 text-primary transition-transform group-hover:scale-110" />
            <span className="font-semibold text-lg text-foreground">
              너의 이름은
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.slice(1, 7).map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-foreground/80 hover:text-foreground hover:bg-white/20"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            <Link href="/history">
              <Button
                variant="ghost"
                size="sm"
                className="text-foreground/80 hover:text-foreground hover:bg-white/20"
              >
                <History className="h-4 w-4 mr-1" />
                최근 결과
              </Button>
            </Link>
          </nav>

          {/* Mobile Navigation */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="hover:bg-white/20">
                <Menu className="h-5 w-5" />
                <span className="sr-only">메뉴 열기</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 bg-card/95 backdrop-blur-xl border-border/50"
            >
              <div className="flex items-center justify-between mb-8 mt-2">
                <Link
                  href="/"
                  className="flex items-center gap-2"
                  onClick={() => setOpen(false)}
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">너의 이름은</span>
                </Link>
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-foreground/80 hover:text-foreground hover:bg-white/20"
                    >
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
