export interface Profile {
    id: string;
    email: string;
    fullName: string | null;
    bikeModel: string | null;
    createdAt: Date;
    updatedAt: Date;
}