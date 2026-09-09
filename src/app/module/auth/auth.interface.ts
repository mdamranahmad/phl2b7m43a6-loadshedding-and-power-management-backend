export interface ICustomerRegisterPayload {
    name: string;
    email: string;
    password: string;
    customerProfile: { meterNumber: string };
}

export interface ICustomerEmailVerifiyPayload {
    name: string;
    email: string;
    hashedPassword: string;
    customerProfile: { meterNumber: string };
}

export interface ICustomerEmailVerificationPayload {
    email: string;
    otp: string;
}
