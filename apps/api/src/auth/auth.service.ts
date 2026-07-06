import { Injectable, Inject, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import type { SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException("Email and password are required");
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const isRateLimitError = error.message
        .toLowerCase()
        .includes("rate limit");
      throw new UnauthorizedException(
        isRateLimitError
          ? "Too many attempts. Please wait a moment and try again."
          : "Invalid credentials",
      );
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  async validateUser(accessToken: string) {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser(accessToken);

    if (error || !user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  async getEmployeeByAuthId(userId: string) {
    const { data } = await this.supabase
      .from("employees")
      .select("role, department_id, accessible_departments")
      .eq("auth_id", userId)
      .single();

    return data ?? null;
  }

  async hashPin(pin: string) {
    if (!pin || pin.length < 4) {
      throw new UnauthorizedException("PIN must be at least 4 characters");
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(pin, salt);
    return { hash };
  }

  async verifyPin(pin: string, hash: string) {
    if (!pin || !hash) {
      return { valid: false };
    }

    const valid = await bcrypt.compare(pin, hash);
    return { valid };
  }
}
