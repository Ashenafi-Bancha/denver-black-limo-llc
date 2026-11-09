-- 020_customer_deposit_choice.sql
--
-- What the customer chose to pay up front, as distinct from what the office
-- asked for.
--
-- 019 gave a booking `deposit_required`: the figure the office sets on the
-- quote sheet. The client now wants the customer to decide — pay the whole
-- total, or put down an amount of their own choosing against a trip that
-- may be weeks away.
--
-- That is a third number, not a replacement for either of the two we have:
--
--   deposit_required  what the office asks for, and the floor for a choice
--   deposit_chosen    what the customer said they would pay now
--   booking_payments  what actually arrived, which is the only one that
--                     decides whether the booking is settled
--
-- Writing the customer's figure into deposit_required would erase the
-- office's own minimum, and the next person to open the quote sheet would
-- see the customer's number presented as the company's policy. Keeping them
-- apart also lets the office see that somebody chose to pay more than asked.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_chosen NUMERIC(10,2);

COMMENT ON COLUMN bookings.deposit_chosen IS
  'Amount the customer elected to pay up front when accepting the quote. Null means they chose to pay in full, or the quote predates the choice.';
