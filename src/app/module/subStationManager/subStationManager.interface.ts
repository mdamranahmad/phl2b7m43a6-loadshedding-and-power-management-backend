export interface IAllocateSubStationKwPayload {
    capacityKw: number;
    allocatedKw: number;
}

export interface IGenerateSchedulePayload {
    capacityKw: number;
    allocatedKw: number;
    scheduleDuration: number;
    outageSlotDuration: number;
    batchStartTime: Date;
    batchEndTime: Date;
}
