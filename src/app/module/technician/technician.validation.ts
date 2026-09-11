import { z } from "zod";
import { Role } from "../../../generated/prisma/enums.js";

export const ApplyAsTechnicianZSchema = z.object({
    name: z
        .string({
            message: "Name is required",
        })
        .min(2, "Name must be at least 2 characters"),

    email: z.email({
        message: "Invalid email address",
    }),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Add at least one uppercase letter")
        .regex(/[a-z]/, "Add at least one lowercase letter")
        .regex(/[0-9]/, "Add at least one number"),
    role: z.enum(Role, {
        message: "Role is required and must be a valid role",
    }),
    address: z
        .string({
            message: "Address is required",
        })
        .min(2, "Address must be at least 2 characters"),

    expertise: z
        .string({
            message: "Expertise is required",
        })
        .min(1, "Expertise cannot be empty"),

    // Coerce string to number for FormData inputs
    experienceYear: z.coerce
        .number({
            message: "Experience years must be a valid number",
        })
        .int("Experience must be an integer")
        .nonnegative("Experience cannot be negative"),
});
