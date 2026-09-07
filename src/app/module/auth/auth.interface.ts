export interface ICustomerRegisterPayload {
    name: string; 
    email: string;
    password: string;
    customerProfile : {meterNumber: string}
}