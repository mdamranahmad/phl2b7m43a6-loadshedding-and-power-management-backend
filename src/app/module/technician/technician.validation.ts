import { z } from "zod";

const ApplyAsTechnicianZSchema = z.object({
    name: z
        .string({
            message: "Name is required",
        })
        .min(2, "Name must be at least 2 characters"),

    email: z.email({
        message: "Invalid email address",
    }),

    address: z.string().optional(),

    expertise: z
        .string({
            message: "Expertise is required",
        })
        .min(1, "Expertise cannot be empty"),

    // Coerce string to number for FormData inputs
    experienceYears: z.coerce
        .number({
            message: "Experience years must be a valid number",
        })
        .int("Experience must be an integer")
        .nonnegative("Experience cannot be negative"),
});


export const TechnicianValidation = {
    ApplyAsTechnicianZSchema
}