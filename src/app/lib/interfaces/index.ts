export interface IQuery {
    searchTerm?: string;
    page?: string;
    limit?: string;
    sortOrder?: string;
    sortBy?: string;

    // Any other filter field
    [key: string]: any;
}
