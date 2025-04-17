-- CreateEnum
CREATE TYPE "CarTitle" AS ENUM ('AccidentFree', 'AccidentVehicle', 'Repaired', 'Other');

-- CreateEnum
CREATE TYPE "CarFuel" AS ENUM ('Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Other');

-- CreateEnum
CREATE TYPE "CarTransmission" AS ENUM ('Manual', 'Automatic', 'SemiAutomatic', 'Other');

-- CreateEnum
CREATE TYPE "CarDrivetrain" AS ENUM ('RWD', 'FWD', 'AWD');

-- CreateEnum
CREATE TYPE "CarType" AS ENUM ('Coupe', 'Sedan', 'Convertible', 'SUV', 'Hatchback', 'Wagon', 'Van', 'Truck', 'Other');

-- AlterTable
ALTER TABLE "AuctionCarInformation" ADD COLUMN     "drivetrain" "CarDrivetrain",
ADD COLUMN     "exteriorColor" TEXT,
ADD COLUMN     "fuel" "CarFuel",
ADD COLUMN     "interiorColor" TEXT,
ADD COLUMN     "power" INTEGER,
ADD COLUMN     "title" "CarTitle",
ADD COLUMN     "transmission" "CarTransmission",
ADD COLUMN     "type" "CarType";
