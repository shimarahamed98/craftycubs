-- ═══════════════════════════════════════════════════════════
-- CRAFTY CUBS — SAMPLE DATA
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── CUSTOMERS ──────────────────────────────────────────────
insert into customers (id, name, phone, email, address, notes) values
  ('c1000000-0000-0000-0000-000000000001', 'Mrs. Christy Gregory',   '+94 77 234 5678', 'christy.gregory@gmail.com',   '14, Park Road, Colombo 05',          'Recurring client — birthday parties'),
  ('c1000000-0000-0000-0000-000000000002', 'Mr. Ashan Fernando',     '+94 71 876 5432', 'ashan.fernando@gmail.com',    '22B, Lotus Lane, Nugegoda',          'School event coordinator'),
  ('c1000000-0000-0000-0000-000000000003', 'Ms. Nadeesha Perera',    '+94 76 345 9900', 'nadeesha.perera@yahoo.com',   '8, Hill Crescent, Kandy',            'Corporate workshop client'),
  ('c1000000-0000-0000-0000-000000000004', 'Mrs. Dilani Jayasinghe', '+94 77 112 3344', 'dilani.j@gmail.com',          '3, Flower Road, Colombo 03',         'Pre-school partner'),
  ('c1000000-0000-0000-0000-000000000005', 'Mr. Roshan Wickrama',    '+94 70 998 7766', 'roshan.w@hotmail.com',        '56, Sea Street, Dehiwala',           'Weekend workshop bookings')
on conflict (id) do nothing;

-- ── INVOICES ───────────────────────────────────────────────
insert into invoices (
  id, invoice_number, date, customer_id, customer_name, customer_phone, customer_email, customer_address,
  items, subtotal, discount_type, discount, discount_amt, delivery, total,
  status, amount_paid, notes, terms,
  bank_account_name, bank_account, bank_name,
  created_at
) values

-- CC-345 · Fully Paid (Jan)
('i1000000-0000-0000-0000-000000000001', 'CC-345', '2026-01-14',
  'c1000000-0000-0000-0000-000000000001', 'Mrs. Christy Gregory', '+94 77 234 5678', 'christy.gregory@gmail.com', '14, Park Road, Colombo 05',
  '[{"id":"item1","name":"Tote Bag Painting Station","description":"30 kids","price":"","hasSubItems":true,"subItems":[{"id":"s1","description":"30 bags","qty":30,"price":1700}]},{"id":"item2","name":"Glitter Jar Activity","description":"20 kids","price":"","hasSubItems":true,"subItems":[{"id":"s2","description":"20 jars","qty":20,"price":850}]}]',
  68000, 'fixed', 0, 0, 0, 68000,
  'paid', 68000, 'Lovely event at British School!',
  'A non-refundable deposit of 50% is due upon confirmation. Balance due on completion.',
  'Thamana Mahuroof', '200220052081', 'Nations Trust Bank (Crescat Branch)',
  '2026-01-14 09:00:00+05:30'),

-- CC-346 · Fully Paid (Jan)
('i1000000-0000-0000-0000-000000000002', 'CC-346', '2026-01-28',
  'c1000000-0000-0000-0000-000000000002', 'Mr. Ashan Fernando', '+94 71 876 5432', 'ashan.fernando@gmail.com', '22B, Lotus Lane, Nugegoda',
  '[{"id":"item3","name":"Canvas Painting Workshop","description":"School art day","price":"45000","hasSubItems":false,"subItems":[]},{"id":"item4","name":"Material Pack","description":"Per student kit","price":"12000","hasSubItems":false,"subItems":[]}]',
  57000, 'fixed', 2000, 2000, 1500, 56500,
  'paid', 56500, 'Annual art day at Gateway College',
  'A non-refundable deposit of 50% is due upon confirmation. Balance due on completion.',
  'Thamana Mahuroof', '200220052081', 'Nations Trust Bank (Crescat Branch)',
  '2026-01-28 10:30:00+05:30'),

-- CC-347 · 50% Deposit Paid (Feb)
('i1000000-0000-0000-0000-000000000003', 'CC-347', '2026-02-10',
  'c1000000-0000-0000-0000-000000000003', 'Ms. Nadeesha Perera', '+94 76 345 9900', 'nadeesha.perera@yahoo.com', '8, Hill Crescent, Kandy',
  '[{"id":"item5","name":"Corporate Team Building — Craft Session","description":"2 hours, 40 pax","price":"85000","hasSubItems":false,"subItems":[]},{"id":"item6","name":"Customised Take-Home Kit","description":"Per person","price":"","hasSubItems":true,"subItems":[{"id":"s3","description":"40 kits","qty":40,"price":1200}]}]',
  133000, 'pct', 5, 6650, 0, 126350,
  'deposit', 63175, 'Corporate event at Cinnamon Grand Ballroom',
  'A non-refundable deposit of 50% is due upon confirmation. Balance due on completion.',
  'Thamana Mahuroof', '200220052081', 'Nations Trust Bank (Crescat Branch)',
  '2026-02-10 14:00:00+05:30'),

-- CC-348 · Fully Paid (Feb)
('i1000000-0000-0000-0000-000000000004', 'CC-348', '2026-02-22',
  'c1000000-0000-0000-0000-000000000004', 'Mrs. Dilani Jayasinghe', '+94 77 112 3344', 'dilani.j@gmail.com', '3, Flower Road, Colombo 03',
  '[{"id":"item7","name":"Pre-school Sensory Play Station","description":"15 toddlers","price":"28000","hasSubItems":false,"subItems":[]},{"id":"item8","name":"Parent & Child Painting","description":"15 pairs","price":"22500","hasSubItems":false,"subItems":[]}]',
  50500, 'fixed', 0, 0, 0, 50500,
  'paid', 50500, 'Beautiful morning session at Little Wonders Montessori',
  'A non-refundable deposit of 50% is due upon confirmation. Balance due on completion.',
  'Thamana Mahuroof', '200220052081', 'Nations Trust Bank (Crescat Branch)',
  '2026-02-22 08:30:00+05:30'),

-- CC-349 · Unpaid / Overdue (Mar — 30+ days ago)
('i1000000-0000-0000-0000-000000000005', 'CC-349', '2026-03-05',
  'c1000000-0000-0000-0000-000000000005', 'Mr. Roshan Wickrama', '+94 70 998 7766', 'roshan.w@hotmail.com', '56, Sea Street, Dehiwala',
  '[{"id":"item9","name":"Weekend Pottery Workshop","description":"10 participants","price":"35000","hasSubItems":false,"subItems":[]},{"id":"item10","name":"Clay Materials","description":"Per kit","price":"","hasSubItems":true,"subItems":[{"id":"s4","description":"10 kits","qty":10,"price":1500}]}]',
  50000, 'fixed', 0, 0, 0, 50000,
  'unpaid', 0, 'Follow up on payment — event was 5 Mar',
  'A non-refundable deposit of 50% is due upon confirmation. Balance due on completion.',
  'Thamana Mahuroof', '200220052081', 'Nations Trust Bank (Crescat Branch)',
  '2026-03-05 11:00:00+05:30'),

-- CC-350 · Booking Confirmed (Apr)
('i1000000-0000-0000-0000-000000000006', 'CC-350', '2026-04-18',
  'c1000000-0000-0000-0000-000000000001', 'Mrs. Christy Gregory', '+94 77 234 5678', 'christy.gregory@gmail.com', '14, Park Road, Colombo 05',
  '[{"id":"item11","name":"Birthday Party Craft Package","description":"25 kids, 3 stations","price":"75000","hasSubItems":false,"subItems":[]},{"id":"item12","name":"Custom Party Favours","description":"25 goody bags","price":"","hasSubItems":true,"subItems":[{"id":"s5","description":"25 bags","qty":25,"price":800}]}]',
  95000, 'fixed', 0, 0, 2000, 97000,
  'confirmed', 0, 'Birthday party at BMICH — 25 kids. Setup by 9am.',
  'A non-refundable deposit of 50% is due upon confirmation. Balance due on completion.',
  'Thamana Mahuroof', '200220052081', 'Nations Trust Bank (Crescat Branch)',
  '2026-04-18 16:00:00+05:30'),

-- CC-351 · Partially Paid (May)
('i1000000-0000-0000-0000-000000000007', 'CC-351', '2026-05-30',
  'c1000000-0000-0000-0000-000000000002', 'Mr. Ashan Fernando', '+94 71 876 5432', 'ashan.fernando@gmail.com', '22B, Lotus Lane, Nugegoda',
  '[{"id":"item13","name":"End-of-Year Art Exhibition Setup","description":"Full school","price":"120000","hasSubItems":false,"subItems":[]},{"id":"item14","name":"Framing & Display Materials","description":"50 pieces","price":"25000","hasSubItems":false,"subItems":[]}]',
  145000, 'pct', 10, 14500, 0, 130500,
  'partial', 65250, 'End of year exhibition — Gateway College Nugegoda',
  'A non-refundable deposit of 50% is due upon confirmation. Balance due on completion.',
  'Thamana Mahuroof', '200220052081', 'Nations Trust Bank (Crescat Branch)',
  '2026-05-30 13:00:00+05:30')

on conflict (id) do nothing;

-- ── PAYMENTS (for invoices that have partial/deposit records) ──
insert into payments (id, invoice_id, amount, note, method, created_at) values
  ('p1000000-0000-0000-0000-000000000001', 'i1000000-0000-0000-0000-000000000001', 34000, '50% deposit received', 'bank', '2026-01-05 10:00:00+05:30'),
  ('p1000000-0000-0000-0000-000000000002', 'i1000000-0000-0000-0000-000000000001', 34000, 'Balance cleared after event', 'bank', '2026-01-15 09:00:00+05:30'),
  ('p1000000-0000-0000-0000-000000000003', 'i1000000-0000-0000-0000-000000000002', 56500, 'Full payment in advance', 'bank', '2026-01-25 11:00:00+05:30'),
  ('p1000000-0000-0000-0000-000000000004', 'i1000000-0000-0000-0000-000000000003', 63175, '50% deposit — Kandy corporate', 'bank', '2026-02-01 14:00:00+05:30'),
  ('p1000000-0000-0000-0000-000000000005', 'i1000000-0000-0000-0000-000000000004', 50500, 'Cash payment on the day', 'cash', '2026-02-22 12:00:00+05:30'),
  ('p1000000-0000-0000-0000-000000000006', 'i1000000-0000-0000-0000-000000000007', 65250, '50% deposit received', 'bank', '2026-05-20 10:00:00+05:30')
on conflict (id) do nothing;

-- ── EVENTS ─────────────────────────────────────────────────
insert into events (id, name, date, customer_id, customer_name, invoice_id, total_expenses, notes) values
  ('e1000000-0000-0000-0000-000000000001', 'Tote Bag Painting — British School',         '2026-01-14', 'c1000000-0000-0000-0000-000000000001', 'Mrs. Christy Gregory',   'i1000000-0000-0000-0000-000000000001', 18500, 'Bags + glitter + staff × 2. Smooth event.'),
  ('e1000000-0000-0000-0000-000000000002', 'Art Day — Gateway College',                  '2026-01-28', 'c1000000-0000-0000-0000-000000000002', 'Mr. Ashan Fernando',     'i1000000-0000-0000-0000-000000000002', 22000, 'Canvases, paints, material packs for 60 students'),
  ('e1000000-0000-0000-0000-000000000003', 'Corporate Craft Session — Cinnamon Grand',   '2026-02-10', 'c1000000-0000-0000-0000-000000000003', 'Ms. Nadeesha Perera',    'i1000000-0000-0000-0000-000000000003', 41000, 'Premium materials + 3 staff. Venue provided by client.'),
  ('e1000000-0000-0000-0000-000000000004', 'Sensory Play — Little Wonders Montessori',   '2026-02-22', 'c1000000-0000-0000-0000-000000000004', 'Mrs. Dilani Jayasinghe', 'i1000000-0000-0000-0000-000000000004', 14000, 'Sensory materials + parent pack'),
  ('e1000000-0000-0000-0000-000000000005', 'Pottery Workshop — Dehiwala',                '2026-03-05', 'c1000000-0000-0000-0000-000000000005', 'Mr. Roshan Wickrama',    'i1000000-0000-0000-0000-000000000005', 19500, 'Clay + kiln rental + staff. Payment still pending.'),
  ('e1000000-0000-0000-0000-000000000006', 'Birthday Party — BMICH',                     '2026-04-18', 'c1000000-0000-0000-0000-000000000001', 'Mrs. Christy Gregory',   'i1000000-0000-0000-0000-000000000006', 0,     'Upcoming — not happened yet'),
  ('e1000000-0000-0000-0000-000000000007', 'End-of-Year Exhibition — Gateway College',   '2026-05-30', 'c1000000-0000-0000-0000-000000000002', 'Mr. Ashan Fernando',     'i1000000-0000-0000-0000-000000000007', 38000, 'Frames, display boards, printing')
on conflict (id) do nothing;

-- ── FINANCE ENTRIES ────────────────────────────────────────
insert into finance_entries (id, person, type, amount, note, month, year) values
  ('f1000000-0000-0000-0000-000000000001', 'R', 'investment', 150000, 'Initial capital — Jan 2026',      1, 2026),
  ('f1000000-0000-0000-0000-000000000002', 'T', 'investment', 150000, 'Initial capital — Jan 2026',      1, 2026),
  ('f1000000-0000-0000-0000-000000000003', 'R', 'withdrawal', 45000,  'Profit share — Feb 2026',          2, 2026),
  ('f1000000-0000-0000-0000-000000000004', 'T', 'withdrawal', 45000,  'Profit share — Feb 2026',          2, 2026),
  ('f1000000-0000-0000-0000-000000000005', 'R', 'investment', 50000,  'Additional working capital — Mar', 3, 2026),
  ('f1000000-0000-0000-0000-000000000006', 'R', 'withdrawal', 30000,  'Profit share — Apr 2026',          4, 2026),
  ('f1000000-0000-0000-0000-000000000007', 'T', 'withdrawal', 30000,  'Profit share — Apr 2026',          4, 2026)
on conflict (id) do nothing;

-- ── INVOICE TEMPLATES ─────────────────────────────────────
insert into invoice_templates (id, name, data) values
  ('t1000000-0000-0000-0000-000000000001', 'Tote Bag Package',
   '{"items":[{"id":"t1i1","name":"Tote Bag Painting Station","description":"","price":"","hasSubItems":true,"subItems":[{"id":"t1s1","description":"bags","qty":20,"price":1700}]}],"discount_type":"fixed","discount":0,"delivery":0,"notes":"Thank you for your booking!","terms":"A non-refundable deposit of fifty percent (50%) of the total amount is due upon confirmation of the booking.\nThe remaining fifty percent (50%) is due upon completion of the event/session.\nStaff to handle stations will be provided.\nActivity stations will be available for 2 hours. Additional time will be charged at LKR 3,500 per hour.","bank_account_name":"Thamana Mahuroof","bank_account":"200220052081","bank_name":"Nations Trust Bank (Crescat Branch)"}'),
  ('t1000000-0000-0000-0000-000000000002', 'Birthday Party Package',
   '{"items":[{"id":"t2i1","name":"Birthday Party Craft Package","description":"3 activity stations","price":"75000","hasSubItems":false,"subItems":[]},{"id":"t2i2","name":"Custom Party Favours","description":"goody bags","price":"","hasSubItems":true,"subItems":[{"id":"t2s1","description":"bags","qty":20,"price":800}]}],"discount_type":"fixed","discount":0,"delivery":2000,"notes":"Happy Birthday! 🎉","terms":"A non-refundable deposit of fifty percent (50%) of the total amount is due upon confirmation of the booking.\nThe remaining fifty percent (50%) is due upon completion of the event/session.\nStaff to handle stations will be provided.\nActivity stations will be available for 2 hours. Additional time will be charged at LKR 3,500 per hour.","bank_account_name":"Thamana Mahuroof","bank_account":"200220052081","bank_name":"Nations Trust Bank (Crescat Branch)"}'),
  ('t1000000-0000-0000-0000-000000000003', 'Corporate Workshop',
   '{"items":[{"id":"t3i1","name":"Corporate Team Building — Craft Session","description":"2 hours","price":"85000","hasSubItems":false,"subItems":[]},{"id":"t3i2","name":"Take-Home Kit","description":"per person","price":"","hasSubItems":true,"subItems":[{"id":"t3s1","description":"kits","qty":30,"price":1200}]}],"discount_type":"pct","discount":5,"delivery":0,"notes":"Thank you for choosing Crafty Cubs!","terms":"A non-refundable deposit of fifty percent (50%) of the total amount is due upon confirmation of the booking.\nThe remaining fifty percent (50%) is due upon completion of the event/session.\nStaff to handle stations will be provided.\nActivity stations will be available for 2 hours. Additional time will be charged at LKR 3,500 per hour.","bank_account_name":"Thamana Mahuroof","bank_account":"200220052081","bank_name":"Nations Trust Bank (Crescat Branch)"}')
on conflict (id) do nothing;

-- ── UPDATE SETTINGS (next invoice number) ─────────────────
insert into settings (id, data) values
  ('global', '{"coName":"Crafty Cubs","coAddr":"32, Lorenz Road, Colombo 04","coPhone":"+94 77 763 4750","coEmail":"","prefix":"CC","nextNum":352,"bname":"Thamana Mahuroof","bacc":"200220052081","bbank":"Nations Trust Bank (Crescat Branch)","terms":"A non-refundable deposit of fifty percent (50%) of the total amount is due upon confirmation of the booking.\nThe remaining fifty percent (50%) is due upon completion of the event/session.\nStaff to handle stations will be provided.\nActivity stations will be available for 2 hours. Additional time will be charged at LKR 3,500 per hour."}')
on conflict (id) do update set data = excluded.data;
