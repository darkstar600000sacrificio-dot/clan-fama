-- SACRIFICIO: decisão segura de solicitações de FAMA.
-- Execute este arquivo uma única vez no Supabase SQL Editor.

create or replace function public.review_fame_request(
  p_request_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_is_active boolean;
  v_request public.fame_requests%rowtype;
  v_member public.members%rowtype;
  v_current_fame numeric;
  v_old_fame numeric;
  v_requested_fame numeric;
begin
  if v_user_id is null then
    raise exception 'Você precisa estar conectado para decidir solicitações.';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception 'Decisão inválida.';
  end if;

  select role, is_active
    into v_role, v_is_active
  from public.profiles
  where id = v_user_id;

  if not found or not coalesce(v_is_active, false) then
    raise exception 'Conta inativa ou perfil não encontrado.';
  end if;

  if v_role not in ('owner', 'manager') then
    raise exception 'Somente o proprietário ou o gerente responsável pode decidir solicitações.';
  end if;

  select *
    into v_request
  from public.fame_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Solicitação não encontrada.';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Esta solicitação já foi decidida.';
  end if;

  select *
    into v_member
  from public.members
  where id = v_request.member_id
  for update;

  if not found then
    raise exception 'O integrante desta solicitação não foi encontrado.';
  end if;

  if v_role = 'manager' and not exists (
    select 1
    from public.houses h
    where h.id = v_member.house_id
      and h.manager_profile_id = v_user_id
  ) then
    raise exception 'Você só pode decidir solicitações dos integrantes da sua própria casa.';
  end if;

  if p_decision = 'approve' then
    v_current_fame := coalesce(v_member.fame, 0)::numeric;
    v_old_fame := coalesce(v_request.old_fame, 0)::numeric;
    v_requested_fame := coalesce(v_request.requested_fame, 0)::numeric;

    if v_current_fame <> v_old_fame then
      raise exception 'A FAMA do integrante mudou desde o envio. Confira a solicitação antes de aprovar.';
    end if;

    if v_requested_fame <= v_current_fame then
      raise exception 'A FAMA solicitada precisa ser maior que a FAMA atual.';
    end if;

    update public.members
    set fame = v_requested_fame
    where id = v_member.id;

    update public.clan_stats
    set global_fame = coalesce(global_fame, 0) + (v_requested_fame - v_current_fame)
    where id = 1;

    if not found then
      raise exception 'O registro de FAMA global (id 1) não foi encontrado. A operação foi cancelada.';
    end if;

    update public.fame_requests
    set status = 'approved',
        reviewed_at = now()
    where id = v_request.id;

    return jsonb_build_object(
      'success', true,
      'status', 'approved',
      'new_fame', v_requested_fame
    );
  end if;

  update public.fame_requests
  set status = 'rejected',
      reviewed_at = now()
  where id = v_request.id;

  return jsonb_build_object(
    'success', true,
    'status', 'rejected'
  );
end;
$$;

revoke all on function public.review_fame_request(uuid, text) from public;
revoke all on function public.review_fame_request(uuid, text) from anon;
grant execute on function public.review_fame_request(uuid, text) to authenticated;

comment on function public.review_fame_request(uuid, text) is
  'Permite que o dono ou o gerente responsável aprove ou recuse uma solicitação de FAMA; aprovação atualiza FAMA individual e global em uma única transação.';
