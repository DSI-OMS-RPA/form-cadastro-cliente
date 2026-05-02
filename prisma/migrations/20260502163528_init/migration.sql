-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    "createdByUser" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdByRole" TEXT NOT NULL,
    "island" TEXT NOT NULL,
    "council" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "street" TEXT,
    "doorReference" TEXT,
    "housingType" TEXT NOT NULL,
    "housingStatus" TEXT NOT NULL,
    "apartmentCount" TEXT,
    "latitude" TEXT NOT NULL,
    "longitude" TEXT NOT NULL,
    "accuracy" TEXT
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "nif" TEXT,
    "document" TEXT,
    "serviceNumber" TEXT,
    "floor" TEXT,
    "apartmentLocation" TEXT,
    CONSTRAINT "Client_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
