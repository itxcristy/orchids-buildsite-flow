/**
 * HR and Employee Management Schema
 * 
 * Manages:
 * - employee_details: Employee information and details
 * - attendance: Daily attendance tracking
 * - leave_types: Leave category definitions
 * - leave_requests: Leave request records
 * - payroll_periods: Pay period management
 * - payroll: Employee payroll records
 * - employee_salary_details: Salary and compensation data
 * - employee_files: Employee document storage
 * 
 * Dependencies:
 * - users (for user_id references)
 * - Requires sync_attendance_employee_id() function (from sharedFunctions)
 * - Requires sync_employee_salary() function (from sharedFunctions)
 */

/**
 * Ensure employee_details table exists
 */
async function ensureEmployeeDetailsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.employee_details (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES public.users(id),
      employee_id TEXT,
      agency_id UUID,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth DATE,
      social_security_number TEXT,
      nationality TEXT,
      marital_status TEXT,
      address TEXT,
      employment_type TEXT,
      work_location TEXT,
      supervisor_id UUID REFERENCES public.employee_details(id),
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      emergency_contact_relationship TEXT,
      skills JSONB,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add agency_id column if it doesn't exist (for backward compatibility)
  try {
    await client.query(`
      ALTER TABLE public.employee_details ADD COLUMN IF NOT EXISTS agency_id UUID;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_details_agency_id ON public.employee_details(agency_id);
    `);
    console.log('[SQL] ✅ Ensured agency_id column exists in employee_details');
  } catch (error) {
    if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
      console.warn('[SQL] Warning adding agency_id to employee_details:', error.message);
    }
  }

  // Add unique constraint on user_id if it doesn't exist (for upsert operations)
  try {
    // Check if unique constraint already exists
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'employee_details' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%user_id%'
    `);
    
    if (constraintCheck.rows.length === 0) {
      // Check for duplicate user_ids before adding constraint
      const duplicates = await client.query(`
        SELECT user_id, COUNT(*) as count
        FROM public.employee_details
        WHERE user_id IS NOT NULL
        GROUP BY user_id
        HAVING COUNT(*) > 1
      `);
      
      if (duplicates.rows.length > 0) {
        console.warn('[SQL] ⚠️ Found duplicate user_ids in employee_details. Cannot add unique constraint until duplicates are resolved.');
        console.warn('[SQL] Duplicates:', duplicates.rows);
      } else {
        // Add unique constraint
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_details_user_id_unique 
          ON public.employee_details(user_id) 
          WHERE user_id IS NOT NULL
        `);
        console.log('[SQL] ✅ Added unique constraint on employee_details.user_id');
      }
    } else {
      console.log('[SQL] ✅ Unique constraint on employee_details.user_id already exists');
    }
  } catch (error) {
    if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
      console.warn('[SQL] Warning adding unique constraint on user_id:', error.message);
    }
  }

  // Create audit trigger
  await client.query(`
    DROP TRIGGER IF EXISTS audit_employee_details_changes ON public.employee_details;
    CREATE TRIGGER audit_employee_details_changes
      AFTER INSERT OR UPDATE OR DELETE ON public.employee_details
      FOR EACH ROW
      EXECUTE FUNCTION public.log_audit_change();
  `);
}

/**
 * Ensure attendance table exists
 */
async function ensureAttendanceTable(client) {
  try {
    // Verify users table exists first (required for foreign key)
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!usersTableCheck.rows[0].exists) {
      throw new Error('Users table must exist before creating attendance table');
    }

    // First, ensure the table exists with all required columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.attendance (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        check_in_time TIMESTAMP WITH TIME ZONE,
        check_out_time TIMESTAMP WITH TIME ZONE,
        status TEXT DEFAULT 'present',
        hours_worked NUMERIC(5, 2),
        total_hours NUMERIC(5, 2),
        overtime_hours NUMERIC(5, 2),
        location TEXT,
        ip_address TEXT,
        agency_id UUID,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, date)
      );
    `);

    // Verify table was created
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendance'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      throw new Error('Failed to create attendance table');
    }

    // Add missing columns if they don't exist (for backward compatibility and updates)
    await client.query(`
      DO $$ 
      BEGIN
        -- Add employee_id column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'attendance' 
          AND column_name = 'employee_id'
        ) THEN
          ALTER TABLE public.attendance ADD COLUMN employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
          -- Copy user_id to employee_id for existing records
          UPDATE public.attendance SET employee_id = user_id WHERE employee_id IS NULL;
          -- Create index
          CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
        END IF;

        -- Add total_hours column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'attendance' 
          AND column_name = 'total_hours'
        ) THEN
          ALTER TABLE public.attendance ADD COLUMN total_hours NUMERIC(5, 2);
        END IF;

        -- Add overtime_hours column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'attendance' 
          AND column_name = 'overtime_hours'
        ) THEN
          ALTER TABLE public.attendance ADD COLUMN overtime_hours NUMERIC(5, 2);
        END IF;

        -- Add location column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'attendance' 
          AND column_name = 'location'
        ) THEN
          ALTER TABLE public.attendance ADD COLUMN location TEXT;
        END IF;

        -- Add ip_address column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'attendance' 
          AND column_name = 'ip_address'
        ) THEN
          ALTER TABLE public.attendance ADD COLUMN ip_address TEXT;
        END IF;

        -- Add agency_id column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'attendance' 
          AND column_name = 'agency_id'
        ) THEN
          ALTER TABLE public.attendance ADD COLUMN agency_id UUID;
          -- Create index for agency_id
          CREATE INDEX IF NOT EXISTS idx_attendance_agency_id ON public.attendance(agency_id);
        END IF;
      END $$;
    `);

    // Create or replace the sync function
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_attendance_employee_id()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.employee_id IS NULL THEN
          NEW.employee_id := NEW.user_id;
        END IF;
        IF NEW.hours_worked IS NULL AND NEW.total_hours IS NOT NULL THEN
          NEW.hours_worked := NEW.total_hours;
        END IF;
        IF NEW.total_hours IS NULL AND NEW.hours_worked IS NOT NULL THEN
          NEW.total_hours := NEW.hours_worked;
        END IF;
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for sync_attendance_employee_id function
    await client.query(`
      DROP TRIGGER IF EXISTS sync_attendance_employee_id_trigger ON public.attendance;
      CREATE TRIGGER sync_attendance_employee_id_trigger
        BEFORE INSERT OR UPDATE ON public.attendance
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_attendance_employee_id();
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
      CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);
      CREATE INDEX IF NOT EXISTS idx_attendance_agency_id ON public.attendance(agency_id);
    `);
    
    console.log('[SQL] ✅ Attendance table ensured successfully');
  } catch (error) {
    console.error('[SQL] ❌ Error ensuring attendance table:', error.message);
    throw error;
  }
}

/**
 * Ensure leave_types table exists
 */
async function ensureLeaveTypesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.leave_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE,
      description TEXT,
      max_days INTEGER,
      is_paid BOOLEAN DEFAULT true,
      requires_approval BOOLEAN DEFAULT true,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure leave_requests table exists
 */
async function ensureLeaveRequestsTable(client) {
  try {
    // Check if table already exists first
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'leave_requests'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      return; // Table already exists
    }
    
    // Use DO block to handle all errors including type conflicts
    await client.query(`
      DO $$ 
      BEGIN
        CREATE TABLE IF NOT EXISTS public.leave_requests (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
          leave_type_id UUID REFERENCES public.leave_types(id),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          days_requested NUMERIC(5, 2) NOT NULL,
          reason TEXT,
          status TEXT DEFAULT 'pending',
          approved_by UUID REFERENCES public.users(id),
          approved_at TIMESTAMP WITH TIME ZONE,
          rejection_reason TEXT,
          agency_id UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      EXCEPTION
        WHEN duplicate_table THEN
          -- Table already exists, that's fine
          NULL;
        WHEN OTHERS THEN
          -- If table exists now, that's fine
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'leave_requests'
          ) THEN
            -- If it's a type conflict, wait and check again
            IF SQLSTATE = '23505' AND SQLERRM LIKE '%pg_type_typname_nsp_index%' THEN
              PERFORM pg_sleep(1.0);
              IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'leave_requests'
              ) THEN
                RETURN;
              END IF;
            END IF;
            RAISE;
          END IF;
      END $$;
    `);
  } catch (error) {
    // If it's a duplicate key or type conflict, wait and check if table exists
    if (error.code === '23505' || error.code === '42P07' || 
        error.message.includes('duplicate key') || 
        error.message.includes('already exists') ||
        error.message.includes('pg_type_typname_nsp_index')) {
      // Wait for concurrent creation to complete
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'leave_requests'
          )
        `);
        if (tableCheck.rows[0].exists) {
          return; // Table exists now, that's fine
        }
      }
      // If still doesn't exist after retries, it's a real error
      if (error.message.includes('pg_type_typname_nsp_index')) {
        // Type conflict - this might be a transient issue, log and continue
        console.warn('[SQL] ⚠️ Type conflict during leave_requests table creation, but table may exist');
        // Final check
        const finalCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'leave_requests'
          )
        `);
        if (finalCheck.rows[0].exists) {
          return;
        }
      }
    }
    throw error;
  }

  // Add missing columns if they don't exist (for backward compatibility)
  await client.query(`
    DO $$ 
    BEGIN
      -- Add employee_id column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leave_requests' 
        AND column_name = 'employee_id'
      ) THEN
        ALTER TABLE public.leave_requests ADD COLUMN employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
        -- Copy user_id to employee_id for existing records
        UPDATE public.leave_requests SET employee_id = user_id WHERE employee_id IS NULL;
        CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
      END IF;

      -- Add agency_id column if it doesn't exist
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leave_requests' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.leave_requests ADD COLUMN agency_id UUID;
        CREATE INDEX IF NOT EXISTS idx_leave_requests_agency_id ON public.leave_requests(agency_id);
      END IF;

      -- Add status index if it doesn't exist
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
    END $$;
  `);
}

/**
 * Ensure payroll_periods table exists
 */
async function ensurePayrollPeriodsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.payroll_periods (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      period_name TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      pay_date DATE NOT NULL,
      status TEXT DEFAULT 'draft',
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure payroll table exists
 */
async function ensurePayrollTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.payroll (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID REFERENCES public.employee_details(id),
      payroll_period_id UUID REFERENCES public.payroll_periods(id),
      base_salary NUMERIC(15, 2) DEFAULT 0,
      allowances NUMERIC(15, 2) DEFAULT 0,
      deductions NUMERIC(15, 2) DEFAULT 0,
      overtime_hours NUMERIC(10, 2) DEFAULT 0,
      overtime_pay NUMERIC(15, 2) DEFAULT 0,
      gross_salary NUMERIC(15, 2) DEFAULT 0,
      tax_amount NUMERIC(15, 2) DEFAULT 0,
      net_salary NUMERIC(15, 2) DEFAULT 0,
      status TEXT DEFAULT 'draft',
      paid_at TIMESTAMP WITH TIME ZONE,
      notes TEXT,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure employee_salary_details table exists
 */
async function ensureEmployeeSalaryDetailsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.employee_salary_details (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID NOT NULL REFERENCES public.employee_details(id) ON DELETE CASCADE,
      agency_id UUID,
      base_salary NUMERIC(15, 2) NOT NULL,
      salary NUMERIC(15, 2),
      currency TEXT DEFAULT 'USD',
      pay_frequency TEXT DEFAULT 'monthly',
      salary_frequency TEXT DEFAULT 'monthly',
      effective_date DATE NOT NULL,
      end_date DATE,
      allowances JSONB,
      deductions JSONB,
      bank_account_number TEXT,
      bank_name TEXT,
      bank_routing_number TEXT,
      created_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Add salary column if it doesn't exist (alias for base_salary for frontend compatibility)
  try {
    await client.query('ALTER TABLE public.employee_salary_details ADD COLUMN IF NOT EXISTS salary NUMERIC(15, 2)');
    await client.query('ALTER TABLE public.employee_salary_details ADD COLUMN IF NOT EXISTS salary_frequency TEXT DEFAULT \'monthly\'');
    
    // Sync salary with base_salary for existing records
    await client.query(`
      UPDATE public.employee_salary_details 
      SET salary = base_salary 
      WHERE salary IS NULL AND base_salary IS NOT NULL
    `);
    
    console.log('[SQL] ✅ Added salary and salary_frequency columns to employee_salary_details');
  } catch (error) {
    if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
      console.warn('[SQL] Warning adding salary columns:', error.message);
    }
  }

  // Add agency_id column if it doesn't exist (for backward compatibility)
  await client.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'employee_salary_details' 
        AND column_name = 'agency_id'
      ) THEN
        ALTER TABLE public.employee_salary_details ADD COLUMN agency_id UUID;
        CREATE INDEX IF NOT EXISTS idx_employee_salary_details_agency_id ON public.employee_salary_details(agency_id);
      END IF;
    END $$;
  `);

  // Create trigger for sync_employee_salary function (after table exists)
  await client.query(`
    DROP TRIGGER IF EXISTS sync_employee_salary_trigger ON public.employee_salary_details;
    CREATE TRIGGER sync_employee_salary_trigger
      BEFORE INSERT OR UPDATE ON public.employee_salary_details
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_employee_salary();
  `);
}

/**
 * Ensure employee_files table exists
 */
async function ensureEmployeeFilesTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.employee_files (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      employee_id UUID NOT NULL REFERENCES public.employee_details(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size BIGINT,
      category TEXT,
      description TEXT,
      uploaded_by UUID REFERENCES public.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Ensure all HR and employee management tables
 */
async function ensureHrSchema(client) {
  console.log('[SQL] Ensuring HR schema...');
  
  await ensureEmployeeDetailsTable(client);
  await ensureAttendanceTable(client);
  await ensureLeaveTypesTable(client);
  await ensureLeaveRequestsTable(client);
  await ensurePayrollPeriodsTable(client);
  await ensurePayrollTable(client);
  await ensureEmployeeSalaryDetailsTable(client);
  await ensureEmployeeFilesTable(client);
  
  console.log('[SQL] ✅ HR schema ensured');
}

module.exports = {
  ensureHrSchema,
  ensureEmployeeDetailsTable,
  ensureAttendanceTable,
  ensureLeaveTypesTable,
  ensureLeaveRequestsTable,
  ensurePayrollPeriodsTable,
  ensurePayrollTable,
  ensureEmployeeSalaryDetailsTable,
  ensureEmployeeFilesTable,
};
