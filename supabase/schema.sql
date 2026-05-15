create extension if not exists pgcrypto;

create table if not exists public.images_metadata (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  detections jsonb not null
);

