import { Injectable, UnauthorizedException } from "@nestjs/common";
import { db } from "@repo/database";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

@Injectable()
export class AuthService {
  // JWT secret from environment
  private readonly jwtSecret = process.env.JWT_SECRET || "fallback-secret";

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException("Email and password are required");
    }

    // Find user in auth.users by email
    const userResult = await db
      .selectFrom("auth.users")
      .select(["id", "email", "encrypted_password", "raw_user_meta_data"])
      .where("email", "=", email)
      .execute();

    if (userResult.length === 0) {
      // Do not reveal that the user does not exist
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = userResult[0]!;
    const encryptedPassword = user.encrypted_password as string;

    // Compare password
    const passwordMatch = await bcrypt.compare(password, encryptedPassword);
    if (!passwordMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Get employee record linked to this auth user
    const employeeResult = await db
      .selectFrom("employees")
      .select(["id", "auth_id", "department_id", "full_name", "role", "accessible_departments"])
      .where("auth_id", "=", user.id)
      .execute();

    const employee = employeeResult.length > 0 ? employeeResult[0] : null;

    // Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      role: employee?.role ?? null,
      departmentId: employee?.department_id ?? null,
    };
    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: "1h" });

    return {
      user: {
        id: user.id,
        email: user.email,
        ...((user.raw_user_meta_data as { [key: string]: any }) || {}),
      },
      session: {
        accessToken,
        // We could also include a refresh token if needed
      },
      employee,
    };
  }

  async validateUser(accessToken: string) {
    try {
      const payload = jwt.verify(accessToken, this.jwtSecret) as {
        sub: string;
        email: string;
        role: string | null;
        departmentId: string | null;
      };

      // Fetch the user from auth.users to ensure it still exists
      const userResult = await db
        .selectFrom("auth.users")
        .select(["id", "email", "raw_user_meta_data"])
        .where("id", "=", payload.sub)
        .execute();

      if (userResult.length === 0) {
        throw new UnauthorizedException("User not found");
      }

      const user = userResult[0]!;

      return {
        id: user.id,
        email: user.email,
        ...((user.raw_user_meta_data as { [key: string]: any }) || {}),
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException("Invalid token");
      }
      throw new UnauthorizedException();
    }
  }

  async getEmployeeByAuthId(userId: string) {
    const employee = await db
      .selectFrom("employees")
      .select(["id", "auth_id", "department_id", "full_name", "role", "accessible_departments"])
      .where("auth_id", "=", userId)
      .executeTakeFirst();

    return employee ?? null;
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
