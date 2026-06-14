-- GoDah API compatibility patch
-- Jalankan setelah script database utama dari repo Flutter GoDah.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Flutter menyimpan dua bukti per order: pickup dan delivery.
-- Script lama hanya punya UNIQUE(order_id), sehingga upsert Flutter
-- dengan onConflict: order_id, jenis_bukti akan gagal.
ALTER TABLE public.bukti_pengiriman
  ADD COLUMN IF NOT EXISTS jenis_bukti VARCHAR(20) NOT NULL DEFAULT 'delivery';

ALTER TABLE public.bukti_pengiriman
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bukti_pengiriman_order_id_key'
      AND conrelid = 'public.bukti_pengiriman'::regclass
  ) THEN
    ALTER TABLE public.bukti_pengiriman
      DROP CONSTRAINT bukti_pengiriman_order_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS bukti_pengiriman_order_jenis_key
  ON public.bukti_pengiriman (order_id, jenis_bukti);

-- Login porter di API Node memakai password_hash pada tabel porters.
ALTER TABLE public.porters
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Flutter FCM service menyimpan token di users, porters, dan admins.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.porters
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_fcm_token
  ON public.users(fcm_token)
  WHERE fcm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_porters_fcm_token
  ON public.porters(fcm_token)
  WHERE fcm_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admins_fcm_token
  ON public.admins(fcm_token)
  WHERE fcm_token IS NOT NULL;

-- Status akun user untuk tindakan admin.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE public.user_status AS ENUM ('aktif', 'nonaktif', 'diblokir');
  END IF;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'aktif';

ALTER TABLE public.users
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.user_status USING status::text::public.user_status,
  ALTER COLUMN status SET DEFAULT 'aktif';

-- Status operasional porter untuk tindakan admin.
-- Dipisah dari status_verifikasi karena verifikasi hanya untuk proses approve akun.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'porter_status') THEN
    CREATE TYPE public.porter_status AS ENUM ('aktif', 'nonaktif', 'diblokir');
  END IF;
END $$;

ALTER TABLE public.porters
  ADD COLUMN IF NOT EXISTS status public.porter_status NOT NULL DEFAULT 'aktif';

ALTER TABLE public.porters
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.porter_status USING status::text::public.porter_status,
  ALTER COLUMN status SET DEFAULT 'aktif';

CREATE TABLE IF NOT EXISTS public.porter_verifikasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  porter_id UUID NOT NULL REFERENCES public.porters(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  status porter_verif_status NOT NULL DEFAULT 'menunggu',
  catatan_admin TEXT,
  dokumen_url VARCHAR(500),
  tanggal_verifikasi TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status order dibuat enum supaya Supabase Table Editor punya dropdown.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM (
      'menunggu',
      'diterima',
      'menuju_lokasi',
      'dalam_perjalanan',
      'sampai_tujuan',
      'selesai',
      'batal'
    );
  END IF;
END $$;

ALTER TABLE public.orders
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.order_status USING status::text::public.order_status,
  ALTER COLUMN status SET DEFAULT 'menunggu';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
  ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_midtrans_order_id
  ON public.orders(midtrans_order_id);

CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  porter_id UUID NOT NULL REFERENCES public.porters(id) ON DELETE RESTRICT,
  nilai SMALLINT NOT NULL CHECK (nilai BETWEEN 1 AND 5),
  ulasan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ratings_porter_id
  ON public.ratings(porter_id);

-- Dipakai REST API Node untuk Midtrans.
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  midtrans_order_id VARCHAR(100) NOT NULL UNIQUE,
  snap_token TEXT,
  redirect_url TEXT,
  payment_type VARCHAR(50),
  transaction_status VARCHAR(50),
  fraud_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id
  ON public.payments(order_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User lihat payment order sendiri" ON public.payments;
CREATE POLICY "User lihat payment order sendiri"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = payments.order_id
        AND orders.user_id = auth.uid()
    )
  );
