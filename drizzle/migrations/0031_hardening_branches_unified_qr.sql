CREATE OR REPLACE FUNCTION public.scan_list_public_branches()
 RETURNS TABLE(id uuid, name_en text, name_ar text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT b.id, b.name_en, b.name_ar
  FROM public.branches b
  JOIN public.organizations o ON o.id = b.organization_id
  WHERE b.is_active = true AND o.status = 'active'
  ORDER BY b.name_en;
$$;

REVOKE SELECT ON public.organization_settings FROM authenticated, anon;
GRANT SELECT (organization_id,default_language,currency,timezone,logo_url,background_url,primary_color,secondary_color,customer_registration_enabled,customer_comments_enabled,one_drink_per_day,created_at,updated_at,address,sales_channel_customer_app,sales_channel_cashier,sales_channel_website,sales_channel_external_api,payment_methods,default_payment_method,tax_enabled,tax_percentage,tax_included,default_activation,auto_renewal,default_bonus_days,order_prep_minutes,order_number_format,queue_behavior,allow_multiple_active_orders,welcome_message_ar,welcome_message_en,order_completed_message_ar,order_completed_message_en,loyalty_message_ar,loyalty_message_en,notify_email,notify_sms,notify_push,notify_orders,notify_subscription_expiry,notify_low_stock,notify_training,session_timeout_minutes,password_policy,two_factor_required,login_restriction,allowed_ip_addresses,audit_log_enabled,default_employee_role,employee_invite_mode,password_reset_policy,default_branch_id,branch_qr_mode,integrations,commercial_registration,tax_number,renewal_reminder_days,expiration_grace_days,membership_auto_notifications,opening_time,closing_time,working_days,holiday_exceptions,receipt_logo_url,receipt_footer_ar,receipt_footer_en,receipt_show_vat,invoice_prefix,invoice_next_number,notify_whatsapp,date_format,number_format,welcome_subtitle_ar,welcome_subtitle_en,empty_subscription_message_ar,empty_subscription_message_en,redeem_success_message_ar,redeem_success_message_en,expired_subscription_message_ar,expired_subscription_message_en,thank_you_message_ar,thank_you_message_en,notification_providers,notification_events,notification_templates,force_password_reset_days,remember_devices,allowed_countries,device_restriction,max_concurrent_sessions,failed_login_protection,failed_login_threshold,temporary_lock_minutes,auto_logout_enabled,suspicious_login_detection) ON public.organization_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.org_unified_qr_token(_organization_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.unified_qr_token FROM public.organization_settings s
  WHERE s.organization_id = _organization_id
    AND (public.has_organization_role(_organization_id, ARRAY['owner','admin'])
         OR public.is_platform_user(NULL));
$$;
REVOKE ALL ON FUNCTION public.org_unified_qr_token(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.org_unified_qr_token(uuid) TO authenticated;