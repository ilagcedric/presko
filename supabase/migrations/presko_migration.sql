-- Migration Script for Database Schema

-- Drop existing tables in correct order to avoid foreign key constraints
DROP TABLE IF EXISTS public.appointment_devices;
DROP TABLE IF EXISTS public.loyalty_points;
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.appointments;
DROP TABLE IF EXISTS public.devices;
DROP TABLE IF EXISTS public.client_locations;
DROP TABLE IF EXISTS public.clients;
DROP TABLE IF EXISTS public.services;
DROP TABLE IF EXISTS public.brands;
DROP TABLE IF EXISTS public.ac_types;
DROP TABLE IF EXISTS public.horsepower_options;
DROP TABLE IF EXISTS public.blocked_dates;
DROP TABLE IF EXISTS public.custom_settings;
DROP TABLE IF EXISTS public.admin_users;
DROP TABLE IF EXISTS public.barangays;
DROP TABLE IF EXISTS public.cities;

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Create enum type for loyalty points
CREATE TYPE loyalty_point_status AS ENUM ('Earned', 'Redeemed', 'Expired');

-- Create tables with proper constraints and RLS
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    email TEXT,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    points_expiry DATE,
    discounted BOOLEAN DEFAULT false,
    sms_opt_in BOOLEAN DEFAULT true,
    qr_code TEXT NOT NULL,
    ref_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.client_locations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My House',
    is_primary BOOLEAN DEFAULT false,
    address_line1 TEXT,
    street TEXT,
    barangay_id UUID,
    city_id UUID,
    landmark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    set_inactive BOOLEAN DEFAULT false
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ac_types (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.ac_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.horsepower_options (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    value NUMERIC NOT NULL,
    display_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.horsepower_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.devices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.client_locations(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    ac_type_id UUID REFERENCES public.ac_types(id) ON DELETE SET NULL,
    horsepower_id UUID REFERENCES public.horsepower_options(id) ON DELETE SET NULL,
    name TEXT,
    last_cleaning_date DATE,
    due_3_months DATE GENERATED ALWAYS AS (last_cleaning_date + INTERVAL '3 months') STORED,
    due_4_months DATE GENERATED ALWAYS AS (last_cleaning_date + INTERVAL '4 months') STORED,
    due_6_months DATE GENERATED ALWAYS AS (last_cleaning_date + INTERVAL '6 months') STORED,
    last_repair_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.client_locations(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TEXT,
    status TEXT DEFAULT 'confirmed' 
        CHECK (status IN ('pending', 'confirmed', 'completed', 'voided')),
    amount NUMERIC DEFAULT 0,
    total_units INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.appointment_devices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.appointment_devices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.blocked_dates (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL DEFAULT 'Fully Booked',
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 1 CHECK (points >= 0),
    status loyalty_point_status DEFAULT 'Earned',
    date_earned DATE DEFAULT CURRENT_DATE,
    date_expiry DATE GENERATED ALWAYS AS (date_earned + INTERVAL '1 year') STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_redemption BOOLEAN DEFAULT false
);
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    send_to_admin BOOLEAN DEFAULT false,
    send_to_client BOOLEAN DEFAULT false,
    is_referral BOOLEAN DEFAULT false,
    date DATE,
    is_new BOOLEAN DEFAULT true
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT,
    address TEXT
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cities (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    province VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.barangays (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
    is_set BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.barangays ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.custom_settings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type TEXT DEFAULT 'text',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    setting_category VARCHAR(255)
);
ALTER TABLE public.custom_settings ENABLE ROW LEVEL SECURITY;

-- Add Foreign Key Constraint for Client Locations
ALTER TABLE public.client_locations 
    ADD CONSTRAINT fk_barangay 
    FOREIGN KEY (barangay_id) 
    REFERENCES public.barangays(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_city 
    FOREIGN KEY (city_id) 
    REFERENCES public.cities(id) ON DELETE SET NULL;

-- Create Indexes for Performance
CREATE INDEX idx_clients_mobile ON public.clients(mobile);
CREATE INDEX idx_clients_points ON public.clients(points);
CREATE INDEX idx_devices_client_id ON public.devices(client_id);
CREATE INDEX idx_devices_last_cleaning ON public.devices(last_cleaning_date);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_loyalty_points_client ON public.loyalty_points(client_id);
CREATE INDEX idx_loyalty_points_status ON public.loyalty_points(status);

-- Create RLS Policies
-- Clients RLS
CREATE POLICY "Users can view own profile" ON public.clients 
    FOR SELECT TO authenticated 
    USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.clients 
    FOR UPDATE TO authenticated 
    USING ((SELECT auth.uid()) = id);

-- Client Locations RLS
CREATE POLICY "Users can view own locations" ON public.client_locations 
    FOR SELECT TO authenticated 
    USING (client_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own locations" ON public.client_locations 
    FOR INSERT TO authenticated 
    WITH CHECK (client_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own locations" ON public.client_locations 
    FOR UPDATE TO authenticated 
    USING (client_id = (SELECT auth.uid()));

-- Devices RLS
CREATE POLICY "Users can view own devices" ON public.devices 
    FOR SELECT TO authenticated 
    USING (client_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own devices" ON public.devices 
    FOR INSERT TO authenticated 
    WITH CHECK (client_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own devices" ON public.devices 
    FOR UPDATE TO authenticated 
    USING (client_id = (SELECT auth.uid()));

-- Appointments RLS
CREATE POLICY "Users can view own appointments" ON public.appointments 
    FOR SELECT TO authenticated 
    USING (client_id = (SELECT auth.uid()));

CREATE POLICY "Users can create appointments" ON public.appointments 
    FOR INSERT TO authenticated 
    WITH CHECK (client_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own appointments" ON public.appointments 
    FOR UPDATE TO authenticated 
    USING (client_id = (SELECT auth.uid()));

-- Services RLS (public read, admin manage)
CREATE POLICY "Public can read active services" ON public.services 
    FOR SELECT 
    USING (is_active = true);

-- Read-only policies for reference tables
CREATE POLICY "Public read brands" ON public.brands 
    FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Public read AC types" ON public.ac_types 
    FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Public read horsepower options" ON public.horsepower_options 
    FOR SELECT 
    USING (is_active = true);

-- Admin Users RLS (fully private)
CREATE POLICY "Admins can manage own users" ON public.admin_users 
    FOR ALL TO service_role 
    USING (true);
	
	
