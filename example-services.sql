-- Run this in the Supabase SQL Editor after supabase-schema.sql.
-- It adds example services only when a service with the same name is not present.

insert into public."sheylaspro-services"
  (name, description, price_label, icon, sort_order, is_live)
select
  service.name,
  service.description,
  service.price_label,
  service.icon,
  service.sort_order,
  true
from (
  values
    ('Standard Cleaning', 'Routine cleaning for kitchens, bathrooms, bedrooms, and shared living spaces.', 'Free estimate', '✨', 10),
    ('Deep Cleaning', 'Detailed top-to-bottom cleaning for buildup, hard-to-reach areas, and extra attention throughout the home.', 'Free estimate', '🫧', 20),
    ('Move-In & Move-Out', 'Empty-home cleaning to help prepare a property for moving in, moving out, or a final walkthrough.', 'Free estimate', '📦', 30),
    ('Airbnb Turnover', 'Reliable turnover cleaning between guests, including resetting rooms and preparing the property for arrival.', 'Free estimate', '🏠', 40),
    ('Office Cleaning', 'Recurring or one-time cleaning for offices, studios, and other small commercial spaces.', 'Free estimate', '🏢', 50),
    ('Post-Construction Cleaning', 'Dust and debris cleanup after renovations, repairs, or construction work.', 'Free estimate', '🧹', 60)
) as service(name, description, price_label, icon, sort_order)
where not exists (
  select 1
  from public."sheylaspro-services" existing
  where lower(existing.name) = lower(service.name)
);
