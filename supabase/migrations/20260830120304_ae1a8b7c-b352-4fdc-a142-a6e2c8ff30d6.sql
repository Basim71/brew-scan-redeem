UPDATE public.customers SET email = NULL WHERE email LIKE '%@example.com';
DELETE FROM public.customer_otp_codes WHERE email LIKE '%@example.com';
DELETE FROM public.customer_scan_sessions WHERE phone IN ('0535007792','0548886270');