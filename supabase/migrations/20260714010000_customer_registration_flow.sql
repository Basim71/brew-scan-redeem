-- =========================================================================
-- KOB customer registration and known-device flow
-- =========================================================================

CREATE TYPE public.registration_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TABLE IF NOT EXISTS public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,

  branch_id uuid NOT NULL
    REFERENCES public.branches(id)
    ON DELETE CASCADE,

  device_token text NOT NULL,
  preferred_language text NOT NULL DEFAULT 'en',

  user_agent text,
  status public.registration_status NOT NULL DEFAULT 'pending',

  approved_by uuid,
  approved_at timestamptz,
  rejected_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS
  registration_requests_branch_status_idx
ON public.registration_requests (
  branch_id,
  status,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  registration_requests_phone_idx
ON public.registration_requests (
  phone
);

CREATE UNIQUE INDEX IF NOT EXISTS
  registration_requests_active_device_idx
ON public.registration_requests (
  branch_id,
  device_token
)
WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.customer_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  device_token text NOT NULL,
  customer_id uuid
    REFERENCES public.customers(id)
    ON DELETE CASCADE,

  branch_id uuid NOT NULL
    REFERENCES public.branches(id)
    ON DELETE CASCADE,

  user_agent text,
  preferred_language text NOT NULL DEFAULT 'en',

  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (
    device_token,
    branch_id
  )
);

CREATE INDEX IF NOT EXISTS
  customer_devices_customer_idx
ON public.customer_devices (
  customer_id
);

-- =========================================================================
-- Privileges and RLS
-- =========================================================================

ALTER TABLE public.registration_requests
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.customer_devices
ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON public.registration_requests
FROM anon;

REVOKE ALL
ON public.customer_devices
FROM anon;

GRANT SELECT, UPDATE
ON public.registration_requests
TO authenticated;

GRANT SELECT, INSERT, UPDATE
ON public.customer_devices
TO authenticated;

GRANT ALL
ON public.registration_requests
TO service_role;

GRANT ALL
ON public.customer_devices
TO service_role;

DROP POLICY IF EXISTS
  "registration requests readable by staff"
ON public.registration_requests;

CREATE POLICY
  "registration requests readable by staff"
ON public.registration_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
  OR (
    public.has_role(
      auth.uid(),
      'cashier'
    )
    AND branch_id =
      public.current_user_branch()
  )
);

DROP POLICY IF EXISTS
  "registration requests updateable by staff"
ON public.registration_requests;

CREATE POLICY
  "registration requests updateable by staff"
ON public.registration_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
  OR (
    public.has_role(
      auth.uid(),
      'cashier'
    )
    AND branch_id =
      public.current_user_branch()
  )
)
WITH CHECK (
  public.has_role(
    auth.uid(),
    'admin'
  )
  OR (
    public.has_role(
      auth.uid(),
      'cashier'
    )
    AND branch_id =
      public.current_user_branch()
  )
);

DROP POLICY IF EXISTS
  "customer devices readable by staff"
ON public.customer_devices;

CREATE POLICY
  "customer devices readable by staff"
ON public.customer_devices
FOR SELECT
TO authenticated
USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
  OR (
    public.has_role(
      auth.uid(),
      'cashier'
    )
    AND branch_id =
      public.current_user_branch()
  )
);

DROP POLICY IF EXISTS
  "customer devices manageable by staff"
ON public.customer_devices;

CREATE POLICY
  "customer devices manageable by staff"
ON public.customer_devices
FOR ALL
TO authenticated
USING (
  public.has_role(
    auth.uid(),
    'admin'
  )
  OR (
    public.has_role(
      auth.uid(),
      'cashier'
    )
    AND branch_id =
      public.current_user_branch()
  )
)
WITH CHECK (
  public.has_role(
    auth.uid(),
    'admin'
  )
  OR (
    public.has_role(
      auth.uid(),
      'cashier'
    )
    AND branch_id =
      public.current_user_branch()
  )
);

-- =========================================================================
-- Public RPC: determine whether this device has already seen the showcase
-- =========================================================================

CREATE OR REPLACE FUNCTION public.scan_device_state(
  _device_token text,
  _branch_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_known boolean := false;
  v_pending boolean := false;
BEGIN
  IF
    _device_token IS NULL
    OR length(btrim(_device_token)) < 10
    OR _branch_id IS NULL
  THEN
    RETURN jsonb_build_object(
      'known',
      false,
      'pending',
      false
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.customer_devices
    WHERE device_token = btrim(_device_token)
      AND branch_id = _branch_id
  )
  INTO v_known;

  IF NOT v_known THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.registration_requests
      WHERE device_token = btrim(_device_token)
        AND branch_id = _branch_id
        AND status IN (
          'pending',
          'approved'
        )
    )
    INTO v_known;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.registration_requests
    WHERE device_token = btrim(_device_token)
      AND branch_id = _branch_id
      AND status = 'pending'
  )
  INTO v_pending;

  UPDATE public.customer_devices
  SET last_seen_at = now()
  WHERE device_token = btrim(_device_token)
    AND branch_id = _branch_id;

  RETURN jsonb_build_object(
    'known',
    v_known,
    'pending',
    v_pending
  );
END;
$$;

GRANT EXECUTE
ON FUNCTION public.scan_device_state(
  text,
  uuid
)
TO anon, authenticated;

-- =========================================================================
-- Public RPC: submit registration request
-- =========================================================================

CREATE OR REPLACE FUNCTION public.scan_register_request(
  _first_name text,
  _last_name text,
  _phone text,
  _branch_id uuid,
  _device_token text,
  _preferred_language text,
  _user_agent text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_existing_customer_id uuid;
BEGIN
  IF
    length(btrim(coalesce(_first_name, ''))) < 2
    OR length(btrim(coalesce(_last_name, ''))) < 2
  THEN
    RAISE EXCEPTION
      'invalid_name';
  END IF;

  IF
    btrim(coalesce(_phone, ''))
    !~ '^05[0-9]{8}$'
  THEN
    RAISE EXCEPTION
      'invalid_phone';
  END IF;

  IF
    _branch_id IS NULL
    OR length(
      btrim(
        coalesce(
          _device_token,
          ''
        )
      )
    ) < 10
  THEN
    RAISE EXCEPTION
      'invalid_request';
  END IF;

  SELECT id
  INTO v_existing_customer_id
  FROM public.customers
  WHERE phone =
    btrim(_phone)
  LIMIT 1;

  IF v_existing_customer_id IS NOT NULL THEN
    INSERT INTO public.customer_devices (
      device_token,
      customer_id,
      branch_id,
      user_agent,
      preferred_language,
      last_seen_at
    )
    VALUES (
      btrim(_device_token),
      v_existing_customer_id,
      _branch_id,
      left(
        coalesce(
          _user_agent,
          ''
        ),
        500
      ),
      CASE
        WHEN _preferred_language = 'ar'
          THEN 'ar'
        ELSE 'en'
      END,
      now()
    )
    ON CONFLICT (
      device_token,
      branch_id
    )
    DO UPDATE SET
      customer_id =
        EXCLUDED.customer_id,
      user_agent =
        EXCLUDED.user_agent,
      preferred_language =
        EXCLUDED.preferred_language,
      last_seen_at =
        now();
  END IF;

  SELECT id
  INTO v_request_id
  FROM public.registration_requests
  WHERE branch_id =
    _branch_id
    AND (
      phone =
        btrim(_phone)
      OR device_token =
        btrim(_device_token)
    )
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_request_id IS NOT NULL THEN
    UPDATE public.registration_requests
    SET
      first_name =
        btrim(_first_name),
      last_name =
        btrim(_last_name),
      phone =
        btrim(_phone),
      device_token =
        btrim(_device_token),
      preferred_language =
        CASE
          WHEN _preferred_language = 'ar'
            THEN 'ar'
          ELSE 'en'
        END,
      user_agent =
        left(
          coalesce(
            _user_agent,
            ''
          ),
          500
        ),
      updated_at =
        now()
    WHERE id =
      v_request_id;

    RETURN v_request_id;
  END IF;

  INSERT INTO public.registration_requests (
    first_name,
    last_name,
    phone,
    branch_id,
    device_token,
    preferred_language,
    user_agent
  )
  VALUES (
    btrim(_first_name),
    btrim(_last_name),
    btrim(_phone),
    _branch_id,
    btrim(_device_token),
    CASE
      WHEN _preferred_language = 'ar'
        THEN 'ar'
      ELSE 'en'
    END,
    left(
      coalesce(
        _user_agent,
        ''
      ),
      500
    )
  )
  RETURNING id
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.scan_register_request(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text
)
TO anon, authenticated;

-- =========================================================================
-- Public RPC: registration status
-- =========================================================================

CREATE OR REPLACE FUNCTION public.scan_registration_status(
  _phone text,
  _branch_id uuid,
  _device_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status::text
  INTO v_status
  FROM public.registration_requests
  WHERE branch_id =
    _branch_id
    AND (
      phone =
        btrim(
          coalesce(
            _phone,
            ''
          )
        )
      OR device_token =
        btrim(
          coalesce(
            _device_token,
            ''
          )
        )
    )
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'found',
    v_status IS NOT NULL,
    'status',
    v_status
  );
END;
$$;

GRANT EXECUTE
ON FUNCTION public.scan_registration_status(
  text,
  uuid,
  text
)
TO anon, authenticated;

-- =========================================================================
-- Staff RPC: approve registration and activate subscription
-- =========================================================================

CREATE OR REPLACE FUNCTION public.cashier_activate_registration(
  _request_id uuid,
  _coupon_id uuid,
  _start_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.registration_requests%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_customer_id uuid;
  v_subscription_id uuid;
  v_branch_id uuid;
  v_end_date date;
BEGIN
  IF NOT (
    public.has_role(
      auth.uid(),
      'admin'
    )
    OR public.has_role(
      auth.uid(),
      'cashier'
    )
  ) THEN
    RAISE EXCEPTION
      'not_authorized';
  END IF;

  SELECT *
  INTO v_request
  FROM public.registration_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'registration_not_found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION
      'registration_already_processed';
  END IF;

  IF
    public.has_role(
      auth.uid(),
      'cashier'
    )
    AND v_request.branch_id <>
      public.current_user_branch()
  THEN
    RAISE EXCEPTION
      'wrong_branch';
  END IF;

  SELECT *
  INTO v_coupon
  FROM public.coupons
  WHERE id = _coupon_id
    AND status = 'available'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'coupon_not_available';
  END IF;

  v_branch_id :=
    v_request.branch_id;

  IF
    v_coupon.branch_id IS NOT NULL
    AND v_coupon.branch_id <>
      v_branch_id
  THEN
    RAISE EXCEPTION
      'coupon_wrong_branch';
  END IF;

  SELECT *
  INTO v_plan
  FROM public.plans
  WHERE id =
    v_coupon.plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'plan_not_found';
  END IF;

  SELECT id
  INTO v_customer_id
  FROM public.customers
  WHERE phone =
    v_request.phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      name,
      phone
    )
    VALUES (
      concat_ws(
        ' ',
        v_request.first_name,
        v_request.last_name
      ),
      v_request.phone
    )
    RETURNING id
    INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name =
      concat_ws(
        ' ',
        v_request.first_name,
        v_request.last_name
      )
    WHERE id =
      v_customer_id;
  END IF;

  v_end_date :=
    _start_date
    + (
      v_plan.duration_days - 1
    );

  INSERT INTO public.subscriptions (
    customer_id,
    coupon_id,
    plan_id,
    branch_id,
    start_date,
    end_date,
    status
  )
  VALUES (
    v_customer_id,
    v_coupon.id,
    v_plan.id,
    v_branch_id,
    _start_date,
    v_end_date,
    'active'
  )
  RETURNING id
  INTO v_subscription_id;

  UPDATE public.coupons
  SET
    status = 'sold',
    sold_at = now(),
    branch_id =
      v_branch_id
  WHERE id =
    v_coupon.id;

  UPDATE public.registration_requests
  SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id =
    v_request.id;

  INSERT INTO public.customer_devices (
    device_token,
    customer_id,
    branch_id,
    user_agent,
    preferred_language,
    last_seen_at
  )
  VALUES (
    v_request.device_token,
    v_customer_id,
    v_branch_id,
    v_request.user_agent,
    v_request.preferred_language,
    now()
  )
  ON CONFLICT (
    device_token,
    branch_id
  )
  DO UPDATE SET
    customer_id =
      EXCLUDED.customer_id,
    user_agent =
      EXCLUDED.user_agent,
    preferred_language =
      EXCLUDED.preferred_language,
    last_seen_at =
      now();

  RETURN v_subscription_id;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.cashier_activate_registration(
  uuid,
  uuid,
  date
)
TO authenticated;

-- =========================================================================
-- Staff RPC: reject registration
-- =========================================================================

CREATE OR REPLACE FUNCTION public.cashier_reject_registration(
  _request_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT branch_id
  INTO v_branch_id
  FROM public.registration_requests
  WHERE id =
    _request_id
    AND status =
      'pending';

  IF v_branch_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT (
    public.has_role(
      auth.uid(),
      'admin'
    )
    OR (
      public.has_role(
        auth.uid(),
        'cashier'
      )
      AND v_branch_id =
        public.current_user_branch()
    )
  ) THEN
    RAISE EXCEPTION
      'not_authorized';
  END IF;

  UPDATE public.registration_requests
  SET
    status = 'rejected',
    rejected_at = now(),
    updated_at = now()
  WHERE id =
    _request_id;

  RETURN true;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.cashier_reject_registration(
  uuid
)
TO authenticated;
