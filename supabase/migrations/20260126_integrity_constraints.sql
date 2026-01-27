-- 1. Clean up duplicate phone numbers before creating unique constraint
-- Strategy: Keep the oldest profile with each phone number, set others to NULL

-- First, let's see what duplicates we have and mark them
WITH duplicate_phones AS (
    SELECT phone, MIN(created_at) as first_created
    FROM profiles
    WHERE phone IS NOT NULL AND phone != ''
    GROUP BY phone
    HAVING COUNT(*) > 1
)
UPDATE profiles p
SET phone = NULL
FROM duplicate_phones dp
WHERE p.phone = dp.phone 
  AND p.created_at > dp.first_created;

-- Now create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS unique_phone_idx ON profiles (phone) WHERE phone IS NOT NULL AND phone != '';

-- 2. Clean up duplicate license plates before creating unique constraint
-- Strategy: For each plate, keep the one with an owner_id, or the oldest if none have owners

WITH duplicate_plates AS (
    SELECT plate, 
           MIN(created_at) as first_created,
           MAX(CASE WHEN owner_id IS NOT NULL THEN created_at END) as owned_created
    FROM vehicles
    GROUP BY plate
    HAVING COUNT(*) > 1
)
DELETE FROM vehicles v
USING duplicate_plates dp
WHERE v.plate = dp.plate
  AND (
    -- Delete if there's an owned version and this isn't it
    (dp.owned_created IS NOT NULL AND v.created_at != dp.owned_created)
    OR
    -- Or if no owned version exists, delete all but the oldest
    (dp.owned_created IS NULL AND v.created_at != dp.first_created)
  );

-- Now create the unique index for plates
CREATE UNIQUE INDEX IF NOT EXISTS unique_vehicle_plate_idx ON vehicles (plate);

-- 3. Cleanup: Remove any QR related columns if they exist (none found in previous exploration, but worth checking).
-- Our current schema doesn't seem to have QR specific columns, it was all in UI logic.
