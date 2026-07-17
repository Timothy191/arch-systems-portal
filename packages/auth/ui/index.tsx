"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Input } from "@repo/ui/Input";
import { AnimatedButton } from "@repo/ui/AnimatedButton";

export function RefractionGlow() {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] max-w-[140vw] bg-blue-500/20 rounded-full blur-[110px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-cyan-400/15 rounded-full blur-[90px]" />
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          const redirectParam = searchParams.get("redirect");
          let redirectPath = "/";

          if (redirectParam) {
            // Validate redirect to prevent open redirects
            try {
              const url = new URL(redirectParam, window.location.origin);
              if (url.origin === window.location.origin) {
                // Reject static files
                if (!/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(url.pathname)) {
                  redirectPath = url.pathname;
                }
              }
            } catch {
              // Invalid URL, use default
            }
          }

          router.push(redirectPath);
          router.refresh();
        } else {
          const { error } = await response.json();
          toast.error(error || "Sign in failed");
        }
      } catch (error) {
        toast.error("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, router, searchParams]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  }, []);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  }, []);

  return (
    <form onSubmit={handleSubmit} data-testid="login-form" className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="Employee ID or email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        {capsLockOn && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-600 text-xs">
            <AlertCircle size={12} />
            <span>Caps Lock is on</span>
          </div>
        )}
      </div>
      <AnimatedButton
        type="submit"
        disabled={isLoading}
        className="liquid-glass-button bg-[var(--color-action-primary)] text-white w-full"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </AnimatedButton>
    </form>
  );
}