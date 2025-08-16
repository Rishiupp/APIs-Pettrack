-- CreateTable
CREATE TABLE "public"."pet_location_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pet_id" UUID NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "accuracy" DECIMAL(8,2),
    "scanner_ip" INET,
    "user_agent" TEXT,
    "device_type" "public"."DeviceType" DEFAULT 'mobile',
    "location_name" VARCHAR(255),
    "country_code" CHAR(2),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "scanner_contact_info" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_location_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."pet_location_events" ADD CONSTRAINT "pet_location_events_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
