import type { Role } from "../../../generated/prisma/enums.js";

export interface IApplyTechnicianPayload {
    name: string;
    email: string;
    password: string;
    role: Role;
    address: string;
    expertise: string;
    experienceYear: number;
}
