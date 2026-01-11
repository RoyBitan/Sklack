-- Create Proposal Status Enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
        CREATE TYPE proposal_status AS ENUM ('PENDING_MANAGER', 'PENDING_CUSTOMER', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- Create Proposals Table
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    description TEXT NOT NULL,
    price DECIMAL(10,2),
    status proposal_status DEFAULT 'PENDING_MANAGER',
    photo_url TEXT,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Proposals viewable by org members" ON proposals;
    DROP POLICY IF EXISTS "Managers can manage proposals" ON proposals;
    DROP POLICY IF EXISTS "Workers can create proposals" ON proposals;
END $$;

CREATE POLICY "Proposals viewable by org members" ON proposals
    FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "Managers can manage proposals" ON proposals
    FOR ALL USING (
        org_id = get_my_org_id() AND get_my_role() IN ('SUPER_MANAGER', 'DEPUTY_MANAGER')
    );

CREATE POLICY "Workers can create proposals" ON proposals
    FOR INSERT WITH CHECK (
        org_id = get_my_org_id() AND get_my_role() = 'TEAM'
    );

-- Updated at trigger
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_proposals_updated_at') THEN
        CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
