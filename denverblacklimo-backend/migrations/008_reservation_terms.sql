-- 008_reservation_terms.sql
--
-- The Pricing page's booking policies predate the client's reservation
-- agreement (see terms.js). The stored "Cancellations & Refunds" text still
-- promised a full refund at 48 hours, which the agreement contradicts. Where
-- that text is the untouched original default, bring it in line, and add the
-- "Payment & Deposits" policy the agreement introduces. Anything the client
-- has since edited in the CMS is left exactly as they wrote it.
DO $$
DECLARE
  v           JSONB;
  item        JSONB;
  rebuilt     JSONB   := '[]'::jsonb;
  has_payment BOOLEAN := false;
BEGIN
  SELECT value INTO v FROM site_settings WHERE key = 'pricing';
  IF v IS NULL OR v->'policies' IS NULL OR jsonb_typeof(v->'policies') <> 'array' THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v->'policies') e WHERE e->>'title' = 'Payment & Deposits'
  ) INTO has_payment;

  FOR item IN SELECT * FROM jsonb_array_elements(v->'policies') LOOP
    IF item->>'title' = 'Cancellations & Refunds' AND item->>'text' LIKE 'Cancel more than 48 hours%' THEN
      item := jsonb_set(item, '{text}', to_jsonb(
        'Airport transfers need 24 hours notice. Sedans and SUVs on other trips need 72 hours, executive vans and limos 7 days, coaches and charters 14 days. Deposits are non-refundable, and late cancellations or no-shows are charged in full.'::text
      ));
    END IF;
    rebuilt := rebuilt || jsonb_build_array(item);

    -- Slot the payment policy directly after cancellations, where it reads naturally.
    IF NOT has_payment AND item->>'title' = 'Cancellations & Refunds' THEN
      rebuilt := rebuilt || jsonb_build_array(jsonb_build_object(
        'title', 'Payment & Deposits',
        'text',  'Airport and FBO pick-ups are paid in full when you book. Other reservations take a 50% deposit, with the balance due by vehicle class. The card on file covers the quoted rate plus any extra time, stops, tolls, parking or damages.',
        'icon',  'credit-card'
      ));
      has_payment := true;
    END IF;
  END LOOP;

  UPDATE site_settings
     SET value = jsonb_set(v, '{policies}', rebuilt),
         updated_at = now()
   WHERE key = 'pricing';
END $$;
