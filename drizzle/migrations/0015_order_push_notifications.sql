-- Push notifications for app orders.
--
-- The iOS app registers its APNs device token against the signed-in
-- customer's phone. Whenever the cashier moves an app order forward
-- (approved, ready, handover) or rejects it, a trigger queues one
-- row in order_push_outbox. The cashier page then calls the
-- order-push edge function, which claims the queued rows for that
-- order and sends them to the customer's devices. Claiming marks
-- the rows sent, so each change notifies once no matter how often
-- the function is called.

-- Device tokens ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customer_push_tokens (
  token text PRIMARY KEY,
  phone text NOT NULL,
  environment text NOT NULL DEFAULT 'production',
  language text NOT NULL DEFAULT 'ar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_push_tokens_environment_check
    CHECK (environment IN ('sandbox', 'production')),
  CONSTRAINT customer_push_tokens_language_check
    CHECK (language IN ('ar', 'en'))
);

CREATE INDEX IF NOT EXISTS customer_push_tokens_phone_idx
  ON public.customer_push_tokens (phone);

-- Only the functions below (and the service role) touch it.
ALTER TABLE public.customer_push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_push_tokens FROM PUBLIC, anon, authenticated;


-- Outbox -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.order_push_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT order_push_outbox_event_check
    CHECK (event IN ('approved', 'rejected', 'ready', 'handover'))
);

CREATE INDEX IF NOT EXISTS order_push_outbox_pending_idx
  ON public.order_push_outbox (order_id)
  WHERE sent_at IS NULL;

ALTER TABLE public.order_push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_push_outbox FROM PUBLIC, anon, authenticated;


-- Queue a notification when an app order moves -----------------------

CREATE OR REPLACE FUNCTION public.orders_queue_push()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_event text;
BEGIN
  IF NEW.placed_via IS DISTINCT FROM 'app' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    v_event := 'approved';
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    v_event := 'rejected';
  -- Only the first move to ready: going back from handover (the
  -- cashier cancelled, or the customer said not received) doesn't
  -- notify again.
  ELSIF NEW.fulfillment_stage = 'ready' AND OLD.fulfillment_stage = 'preparing' THEN
    v_event := 'ready';
  ELSIF NEW.fulfillment_stage = 'handover' AND OLD.fulfillment_stage IS DISTINCT FROM 'handover' THEN
    v_event := 'handover';
  END IF;

  IF v_event IS NOT NULL THEN
    INSERT INTO public.order_push_outbox (order_id, event)
    VALUES (NEW.id, v_event);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_queue_push ON public.orders;
CREATE TRIGGER orders_queue_push
  AFTER UPDATE OF status, fulfillment_stage ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_queue_push();


-- App: register / unregister this device ------------------------------

CREATE OR REPLACE FUNCTION public.customer_app_register_push_token(
  _token text,
  _environment text,
  _language text
)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
BEGIN
  v_phone := public.customer_app_auth_phone();
  IF v_phone IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  IF _token IS NULL OR length(_token) < 32 OR length(_token) > 256 THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  -- A device that changes hands moves to the new customer.
  INSERT INTO public.customer_push_tokens (token, phone, environment, language)
  VALUES (
    _token,
    v_phone,
    CASE WHEN _environment = 'sandbox' THEN 'sandbox' ELSE 'production' END,
    CASE WHEN _language = 'en' THEN 'en' ELSE 'ar' END
  )
  ON CONFLICT (token) DO UPDATE SET
    phone = EXCLUDED.phone,
    environment = EXCLUDED.environment,
    language = EXCLUDED.language,
    updated_at = now();
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_register_push_token(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_register_push_token(text, text, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.customer_app_unregister_push_token(
  _token text
)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
BEGIN
  v_phone := public.customer_app_auth_phone();
  IF v_phone IS NULL THEN RETURN; END IF;

  DELETE FROM public.customer_push_tokens
  WHERE token = _token AND phone = v_phone;
END;
$function$;
REVOKE ALL ON FUNCTION public.customer_app_unregister_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_app_unregister_push_token(text) TO authenticated;


-- Edge function: claim what's queued for one order --------------------
-- Returns null when nothing is pending. Otherwise the latest event,
-- the names the message needs, and the customer's devices.

CREATE OR REPLACE FUNCTION public.order_push_claim(
  _order_id uuid
)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_event text;
BEGIN
  WITH claimed AS (
    UPDATE public.order_push_outbox
    SET sent_at = now()
    WHERE order_id = _order_id
      AND sent_at IS NULL
    RETURNING event, created_at
  )
  SELECT event INTO v_event
  FROM claimed
  -- Older than this, the message would only confuse.
  WHERE created_at > now() - interval '15 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_event IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'order_id', o.id,
      'event', v_event,
      'drink', jsonb_build_object('ar', d.name_ar, 'en', d.name_en),
      'branch', jsonb_build_object('ar', b.name_ar, 'en', b.name_en),
      'tokens', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'token', t.token,
          'environment', t.environment,
          'language', t.language
        ))
        FROM public.customer_push_tokens t
        WHERE t.phone = c.phone
      ), '[]'::jsonb)
    )
    FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    JOIN public.drink_types d ON d.id = o.drink_type_id
    JOIN public.branches b ON b.id = o.branch_id
    WHERE o.id = _order_id
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.order_push_claim(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.order_push_claim(uuid) TO service_role;


-- Edge function: forget a token APNs says is gone ---------------------

CREATE OR REPLACE FUNCTION public.order_push_drop_token(
  _token text
)
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  DELETE FROM public.customer_push_tokens WHERE token = _token;
$function$;
REVOKE ALL ON FUNCTION public.order_push_drop_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.order_push_drop_token(text) TO service_role;
