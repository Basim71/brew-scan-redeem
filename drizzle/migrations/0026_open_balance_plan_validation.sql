CREATE OR REPLACE FUNCTION public.validate_plan_consumption()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF new.duration_days IS NULL OR new.duration_days <= 0 THEN RAISE EXCEPTION 'plan_invalid_duration'; END IF;
  IF new.price IS NULL OR new.price < 0 THEN RAISE EXCEPTION 'plan_invalid_price'; END IF;
  IF new.drinks_per_redemption < 1 THEN RAISE EXCEPTION 'plan_invalid_drinks_per_redemption'; END IF;
  IF new.max_drinks_per_day < new.drinks_per_redemption THEN RAISE EXCEPTION 'plan_max_daily_below_redemption'; END IF;
  IF new.max_drinks_per_redemption < 1 THEN RAISE EXCEPTION 'plan_invalid_max_per_redemption'; END IF;
  IF new.redemption_frequency NOT IN ('daily','every_2_days','every_3_days','weekly','custom') THEN RAISE EXCEPTION 'plan_invalid_frequency'; END IF;
  IF new.plan_type = 'open_balance' THEN
    IF new.total_cups IS NULL OR new.total_cups < 1 THEN RAISE EXCEPTION 'plan_total_cups_required'; END IF;
  ELSIF new.redemption_frequency = 'custom' AND (new.redemption_frequency_days IS NULL OR new.redemption_frequency_days < 1) THEN
    RAISE EXCEPTION 'plan_custom_frequency_days_required';
  END IF;
  IF new.redemption_frequency <> 'custom' AND new.redemption_frequency_days IS NOT NULL THEN new.redemption_frequency_days := NULL; END IF;
  IF new.carry_unused = false AND new.max_carry_days IS NOT NULL THEN new.max_carry_days := NULL; END IF;
  IF new.carry_unused = true AND (new.max_carry_days IS NULL OR new.max_carry_days < 1) THEN RAISE EXCEPTION 'plan_carry_days_required'; END IF;
  IF new.redemption_window_start IS NOT NULL AND new.redemption_window_end IS NOT NULL
     AND new.redemption_window_end <= new.redemption_window_start THEN RAISE EXCEPTION 'plan_invalid_time_window'; END IF;
  IF new.name IS NULL OR new.name = '' THEN new.name := COALESCE(new.name_en, new.name_ar); END IF;
  RETURN new;
END;
$$;