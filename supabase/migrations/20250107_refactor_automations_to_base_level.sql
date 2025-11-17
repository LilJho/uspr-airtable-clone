-- Migration: Refactor automations from table-level to base-level
-- This migration moves automations from being table-specific to base-level

-- Step 1: Add base_id column to automations table
ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS base_id uuid REFERENCES public.bases(id) ON DELETE CASCADE;

-- Step 2: Populate base_id from existing table_id references
UPDATE public.automations a
SET base_id = (
  SELECT t.base_id 
  FROM public.tables t 
  WHERE t.id = a.table_id
)
WHERE base_id IS NULL;

-- Step 3: Make base_id NOT NULL (after populating)
ALTER TABLE public.automations 
ALTER COLUMN base_id SET NOT NULL;

-- Step 4: Drop the old table_id foreign key constraint
ALTER TABLE public.automations 
DROP CONSTRAINT IF EXISTS automations_table_id_fkey;

-- Step 5: Remove table_id column
ALTER TABLE public.automations 
DROP COLUMN IF EXISTS table_id;

-- Step 6: Update trigger JSONB to reference tables by name instead of table_id
-- The trigger.table_id field will be replaced with trigger.table_name in the application code
-- This migration just ensures the schema is ready

-- Step 7: Ensure masterlist is always the first table
-- Create a function to ensure masterlist exists and is first
CREATE OR REPLACE FUNCTION ensure_masterlist_table()
RETURNS TRIGGER AS $$
DECLARE
  masterlist_table_id uuid;
  current_first_order integer;
BEGIN
  -- Check if this is the first table being created in the base
  SELECT MIN(order_index) INTO current_first_order
  FROM public.tables
  WHERE base_id = NEW.base_id;
  
  -- If this is the first table or if no masterlist exists, make it the masterlist
  IF current_first_order IS NULL OR current_first_order = NEW.order_index THEN
    -- Check if a masterlist already exists
    SELECT id INTO masterlist_table_id
    FROM public.tables
    WHERE base_id = NEW.base_id 
      AND is_master_list = true
      AND id != NEW.id
    LIMIT 1;
    
    -- If no masterlist exists, make this one the masterlist
    IF masterlist_table_id IS NULL THEN
      NEW.is_master_list := true;
      NEW.name := 'masterlist';
      NEW.order_index := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure masterlist on table creation
DROP TRIGGER IF EXISTS ensure_masterlist_trigger ON public.tables;
CREATE TRIGGER ensure_masterlist_trigger
  BEFORE INSERT ON public.tables
  FOR EACH ROW
  EXECUTE FUNCTION ensure_masterlist_table();

-- Step 8: Add index on base_id for better query performance
CREATE INDEX IF NOT EXISTS idx_automations_base_id ON public.automations(base_id);




