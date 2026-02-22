-- AlterTable: Add bookingId and clinicName to invoices
ALTER TABLE "invoices" ADD COLUMN "booking_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN "clinic_name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_booking_id_key" ON "invoices"("booking_id");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
