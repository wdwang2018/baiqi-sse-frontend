-- CreateEnum
CREATE TYPE "DataScope" AS ENUM ('SELF', 'TENANT', 'ALL');

-- AlterTable
ALTER TABLE "AICall" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "ActionPlan" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "BattlePlan" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "CompetitiveAnalysis" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "CustomerInsight" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "DecisionMap" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "NineGrid" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "PainChain" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "ProjectInteraction" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "ProjectModuleData" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "RelationshipMap" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "SalesPath" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "ValueProposition" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "WorkReview" ADD COLUMN     "createdBy" TEXT;

-- CreateTable
CREATE TABLE "AppRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dataScope" "DataScope" NOT NULL DEFAULT 'SELF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppRole_code_key" ON "AppRole"("code");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "AICall_createdBy_idx" ON "AICall"("createdBy");

-- CreateIndex
CREATE INDEX "ActionPlan_createdBy_idx" ON "ActionPlan"("createdBy");

-- CreateIndex
CREATE INDEX "BattlePlan_createdBy_idx" ON "BattlePlan"("createdBy");

-- CreateIndex
CREATE INDEX "CompetitiveAnalysis_createdBy_idx" ON "CompetitiveAnalysis"("createdBy");

-- CreateIndex
CREATE INDEX "Contact_createdBy_idx" ON "Contact"("createdBy");

-- CreateIndex
CREATE INDEX "Customer_createdBy_idx" ON "Customer"("createdBy");

-- CreateIndex
CREATE INDEX "CustomerInsight_createdBy_idx" ON "CustomerInsight"("createdBy");

-- CreateIndex
CREATE INDEX "DecisionMap_createdBy_idx" ON "DecisionMap"("createdBy");

-- CreateIndex
CREATE INDEX "NineGrid_createdBy_idx" ON "NineGrid"("createdBy");

-- CreateIndex
CREATE INDEX "Opportunity_createdBy_idx" ON "Opportunity"("createdBy");

-- CreateIndex
CREATE INDEX "PainChain_createdBy_idx" ON "PainChain"("createdBy");

-- CreateIndex
CREATE INDEX "Project_createdBy_idx" ON "Project"("createdBy");

-- CreateIndex
CREATE INDEX "ProjectInteraction_createdBy_idx" ON "ProjectInteraction"("createdBy");

-- CreateIndex
CREATE INDEX "ProjectModuleData_createdBy_idx" ON "ProjectModuleData"("createdBy");

-- CreateIndex
CREATE INDEX "RelationshipMap_createdBy_idx" ON "RelationshipMap"("createdBy");

-- CreateIndex
CREATE INDEX "SalesPath_createdBy_idx" ON "SalesPath"("createdBy");

-- CreateIndex
CREATE INDEX "User_createdBy_idx" ON "User"("createdBy");

-- CreateIndex
CREATE INDEX "ValueProposition_createdBy_idx" ON "ValueProposition"("createdBy");

-- CreateIndex
CREATE INDEX "WorkReview_createdBy_idx" ON "WorkReview"("createdBy");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AppRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

