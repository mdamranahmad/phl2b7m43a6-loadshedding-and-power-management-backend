import { z } from "zod";

const tokenNoRegex = /^(\d{4}-){4}\d{4}$/;

export const rechargeTokenZValidationSchema = z.object({
  TokenNo: z
    .string({
      message: "Token number is required and must be a string",
    })
    .trim()
    .regex(
      tokenNoRegex,
      "Invalid token format. Must be a 20-digit number formatted as XXXX-XXXX-XXXX-XXXX-XXXX (e.g., 8631-9280-8539-0600-1060)",
    ),
});