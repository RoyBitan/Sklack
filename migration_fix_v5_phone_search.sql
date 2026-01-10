-- Migration v5: Format-Insensitive Phone Search
-- Improves "Magic Fetch" and "Reverse Lookup" robustness

-- 1. Helper function to strip non-digits (optional but cleaner)
-- Or just use regexp_replace inline for simplicity.
-- We'll use REGEXP_REPLACE(str, '\D', '', 'g') to remove all non-digits.

-- Update get_vehicles_by_phone
CREATE OR REPLACE FUNCTION get_vehicles_by_phone(phone_text TEXT)
RETURNS TABLE (
    id UUID,
    plate TEXT,
    model TEXT,
    year TEXT,
    color TEXT,
    org_id UUID
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT v.id, v.plate, v.model, v.year, v.color, v.org_id
    FROM vehicles v
    JOIN profiles p ON v.owner_id = p.id
    WHERE REGEXP_REPLACE(p.phone, '\D', '', 'g') = REGEXP_REPLACE(phone_text, '\D', '', 'g');
END;
$$ LANGUAGE plpgsql;

-- Update get_org_by_manager_phone
CREATE OR REPLACE FUNCTION get_org_by_manager_phone(phone_text TEXT)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.name
    FROM organizations o
    JOIN profiles p ON p.org_id = o.id
    WHERE REGEXP_REPLACE(p.phone, '\D', '', 'g') = REGEXP_REPLACE(phone_text, '\D', '', 'g')
    AND p.role IN ('SUPER_MANAGER', 'DEPUTY_MANAGER');
END;
$$ LANGUAGE plpgsql;
