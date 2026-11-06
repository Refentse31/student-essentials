import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                <Heart className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold">Student Essentials</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Helping students help students — one donation at a time.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/browse" className="hover:text-foreground">Browse items</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">Sign up</Link></li>
              <li><a href="/#how" className="hover:text-foreground">How it works</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="/#faq" className="hover:text-foreground">FAQ</a></li>
              <li><a href="/#contact" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="mailto:studentessetialshelp@gmail.com" className="hover:text-foreground underline underline-offset-4">
                  studentessetialshelp@gmail.com
                </a>
              </li>
              <li>Campus Library, Ground floor</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Student Essentials Donation Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
