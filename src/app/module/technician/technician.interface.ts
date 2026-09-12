import type { Role, TechnicianVerificationStatus } from "../../../generated/prisma/enums.js";

export interface IApplyTechnicianPayload {
    name: string;
    email: string;
    password: string;
    role: Role;
    address: string;
    expertise: string;
    experienceYear: number;
}

export interface IApproveTechnicianPayload {
    technicianId: string;
    verificationStatus: TechnicianVerificationStatus;
    rejectReason: string;
}
