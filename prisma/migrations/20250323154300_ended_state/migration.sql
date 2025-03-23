-- AlterEnum
ALTER TYPE "AuctionState" ADD VALUE 'ENDED';

-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "isWinning" TIMESTAMP(3);
