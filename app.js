(() => {
  "use strict";

  const SUPABASE_URL = "https://twqewrezssynlbzqpptb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_F6Wn-moqrGolX3EFowLL2Q_FAjLZsPi";

  const clientFactory = window.supabase && window.supabase.createClient;
  const supabaseClient = clientFactory
    ? clientFactory(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      })
    : null;

  const houseOrder = ["conquista", "guerra", "fome", "morte"];
  const houseNames = {
    conquista: "Conquista",
    guerra: "Guerra",
    fome: "Fome",
    morte: "Morte"
  };

  let houses = [];
  let members = [];
  let currentSession = null;
  let currentProfile = null;

  const overviewHouses = document.getElementById("overview-houses");
  const membersHouseGrid = document.getElementById("members-house-grid");
  const membersDetailPanel = document.getElementById("members-detail-panel");
  const membersDetailTitle = document.getElementById("members-detail-title");
  const membersDetailCaption = document.getElementById("members-detail-caption");
  const membersSlotList = document.getElementById("members-slot-list");
  const membersBackButton = document.getElementById("members-back-button");
  const loginDialog = document.getElementById("login-dialog");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const loginSubmit = document.getElementById("login-submit");

  function padSlot(number) {
    return String(number).padStart(2, "0");
  }

  function setLoginMessage(message, type) {
    loginStatus.textContent = message || "";
    loginStatus.className = "login-status" + (type ? " " + type : "");
  }

  function houseForSlot(slot) {
    if (slot >= 1 && slot <= 10) return "conquista";
    if (slot >= 11 && slot <= 20) return "guerra";
    if (slot >= 21 && slot <= 30) return "fome";
    if (slot >= 31 && slot <= 40) return "morte";
    if (slot === 46) return "conquista";
    if (slot === 47) return "guerra";
    if (slot === 48) return "fome";
    if (slot === 49) return "morte";
    return null;
  }

  function getSlotInfo(member) {
    const slot = Number(member.slot_number);
    const house = houses.find((item) => item.id === member.house_id);
    if (member.slot_type === "special") return { group: "Rotativos e especiais", role: "Especial" };
    if (member.slot_type === "manager") return { group: house ? house.name : houseNames[houseForSlot(slot)], role: "Gerente" };
    if (member.slot_type === "owner") return { group: "Administração", role: "Proprietário" };
    return { group: house ? house.name : houseNames[houseForSlot(slot)] || "Casa", role: "Membro" };
  }

  function createHouseCards() {
    overviewHouses.replaceChildren();

    houseOrder.forEach((code) => {
      const house = houses.find((item) => item.code === code);
      if (!house) return;

      const houseMembers = members
        .filter((member) => member.house_id === house.id && member.slot_type === "member")
        .sort((a, b) => a.slot_number - b.slot_number);
      const manager = members.find((member) => member.house_id === house.id && member.slot_type === "manager");

      const card = document.createElement("article");
      card.className = "house-card";

      const top = document.createElement("div");
      top.className = "house-card-top";

      const title = document.createElement("h3");
      title.textContent = house.name;

      const range = document.createElement("span");
      range.className = "house-range";
      const firstSlot = houseMembers.length ? houseMembers[0].slot_number : 0;
      const lastSlot = houseMembers.length ? houseMembers[houseMembers.length - 1].slot_number : 0;
      range.textContent = "Slots " + padSlot(firstSlot) + "–" + padSlot(lastSlot);
      top.append(title, range);

      const slots = document.createElement("div");
      slots.className = "slot-preview";

      houseMembers.forEach((member) => {
        const pill = document.createElement("span");
        pill.className = "slot-pill" + (member.is_occupied ? " occupied" : "");
        pill.textContent = padSlot(member.slot_number);
        pill.title = member.is_occupied ? (member.nickname || "Ocupado") : "Disponível";
        slots.appendChild(pill);
      });

      const managerLine = document.createElement("p");
      managerLine.className = "house-manager";
      managerLine.textContent = manager
        ? "Gerente · slot " + padSlot(manager.slot_number) + " · " + (manager.nickname || (manager.is_occupied ? "Conta vinculada" : "A definir"))
        : "Gerente ainda não cadastrado";

      card.append(top, slots, managerLine);
      overviewHouses.appendChild(card);
    });
  }

  function formatFame(value) {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = Number(value);
    return Number.isFinite(numeric)
      ? numeric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
      : String(value);
  }

  function sumOccupiedFame(records) {
    return records.reduce((total, member) => {
      if (!member || !member.is_occupied) return total;
      const value = Number(member.fame);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  function getHouseRoster(code, house) {
    const houseIndex = houseOrder.indexOf(code);
    if (houseIndex < 0) return [];
    const firstSlot = houseIndex * 10 + 1;
    const lastSlot = firstSlot + 9;
    const managerSlot = 46 + houseIndex;

    return members.filter((member) => {
      const slot = Number(member.slot_number);
      if (member.slot_type === "member") {
        return (slot >= firstSlot && slot <= lastSlot) || Boolean(house && member.house_id === house.id);
      }
      if (member.slot_type === "manager") {
        return slot === managerSlot || Boolean(house && member.house_id === house.id);
      }
      return false;
    });
  }

  function createMembersHouseCard(code, title, eyebrow, detail, occupancy, fameText) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "members-house-card";
    card.dataset.group = code;
    card.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.className = "members-house-eyebrow";
    label.textContent = eyebrow;

    const name = document.createElement("strong");
    name.className = "members-house-name";
    name.textContent = title;

    const description = document.createElement("span");
    description.className = "members-house-detail";
    description.textContent = detail;

    const count = document.createElement("span");
    count.className = "members-house-occupancy";
    count.textContent = occupancy;

    const fame = document.createElement("span");
    fame.className = "members-house-fame";
    fame.textContent = fameText;

    const arrow = document.createElement("span");
    arrow.className = "members-house-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";

    card.append(label, name, description, count, fame, arrow);
    card.addEventListener("click", () => showMembersGroup(code));
    return card;
  }

  function createMembersHouseCards() {
    if (!membersHouseGrid) return;
    membersHouseGrid.replaceChildren();

    houseOrder.forEach((code, index) => {
      const house = houses.find((item) => item.code === code);
      if (!house) return;

      const houseMembers = members.filter(
        (member) => member.house_id === house.id && member.slot_type === "member"
      );
      const houseFame = sumOccupiedFame(getHouseRoster(code, house));
      const occupied = houseMembers.filter((member) => member.is_occupied).length;
      const card = createMembersHouseCard(
        code,
        house.name || houseNames[code],
        "CASA DO CLÃ",
        "10 vagas + 1 gerente",
        occupied + "/10 vagas ocupadas",
        "Fama da casa: " + formatFame(houseFame)
      );
      card.style.setProperty("--house-outline", ["#041365", "#01080b", "#f1ff00", "#ff0000"][index]);
      membersHouseGrid.appendChild(card);
    });

    const rotatingSlots = members.filter(
      (member) => member.slot_type === "special" && Number(member.slot_number) >= 41 && Number(member.slot_number) <= 45
    );
    const occupiedRotating = rotatingSlots.filter((member) => member.is_occupied).length;
    const rotatingFame = sumOccupiedFame(rotatingSlots);
    const owner = members.find((member) => Number(member.slot_number) === 50);
    const ownerName = owner && owner.nickname ? owner.nickname : "Proprietário do clã";
    const rotatingCard = createMembersHouseCard(
      "rotativos",
      "Minha área",
      "ÁREA DO PROPRIETÁRIO",
      "Rotativos · 5 vagas especiais",
      "Responsável: " + ownerName + " · " + occupiedRotating + "/5 ocupadas",
      "Fama dos rotativos: " + formatFame(rotatingFame)
    );
    rotatingCard.style.setProperty("--house-outline", "#9ca3af");
    membersHouseGrid.appendChild(rotatingCard);
  }

  function createMemberSlotRow(slotNumber, member, roleLabel, photoCode) {
    const occupied = Boolean(member && member.is_occupied);
    const row = document.createElement("article");
    row.className = "members-slot-row" + (roleLabel === "Gerente" ? " is-manager" : "");

    // Segmento 1: foto local da casa e do slot.
    const photo = document.createElement("div");
    photo.className = "members-slot-photo-wrap";

    const placeholder = document.createElement("span");
    placeholder.className = "members-slot-photo-placeholder";
    placeholder.textContent = "FOTO";

    const image = document.createElement("img");
    image.className = "members-slot-photo";
    image.alt = member && member.nickname
      ? "Foto de " + member.nickname
      : "Foto da vaga " + padSlot(slotNumber);
    image.loading = "lazy";
    image.src = "./fotos/" + photoCode + "_" + slotNumber + ".png";
    image.addEventListener("error", () => {
      image.hidden = true;
      placeholder.hidden = false;
    }, { once: true });
    placeholder.hidden = true;
    photo.append(image, placeholder);

    // Segmento 2: nome e identificação do slot.
    const identity = document.createElement("div");
    identity.className = "members-slot-identity";

    const name = document.createElement("strong");
    name.textContent = occupied
      ? (member.nickname || (roleLabel === "Gerente" ? "Gerente cadastrado" : "Integrante cadastrado"))
      : "Vaga disponível";

    const role = document.createElement("span");
    role.textContent = "Slot " + padSlot(slotNumber) + " · " + roleLabel +
      (member && member.slot_label ? " · " + member.slot_label : "");
    identity.append(name, role);

    // Segmento 3: fama em coluna própria, ao lado do nome.
    const fame = document.createElement("div");
    fame.className = "members-slot-fame";

    const fameLabel = document.createElement("span");
    fameLabel.className = "members-slot-fame-label";
    fameLabel.textContent = "FAMA";

    const fameValue = document.createElement("strong");
    fameValue.className = "members-slot-fame-value";
    fameValue.textContent = occupied ? formatFame(member.fame) : "—";
    fame.append(fameLabel, fameValue);

    // Segmento 4: estado da vaga.
    const status = document.createElement("span");
    status.className = "members-slot-status " + (occupied ? "occupied" : "available");
    status.textContent = occupied ? "Ocupado" : "Disponível";

    row.append(photo, identity, fame, status);
    return row;
  }

  function showMembersGroup(code) {
    if (!membersDetailPanel || !membersSlotList) return;

    membersSlotList.replaceChildren();
    membersDetailPanel.dataset.group = code;

    membersHouseGrid.querySelectorAll(".members-house-card").forEach((card) => {
      const selected = card.dataset.group === code;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-expanded", selected ? "true" : "false");
    });

    if (code === "rotativos") {
      membersDetailTitle.textContent = "Minha área · Rotativos";
      const owner = members.find((member) => Number(member.slot_number) === 50);
      const ownerName = owner && owner.nickname ? owner.nickname : "Proprietário do clã";
      const rotatingSlots = members.filter(
        (item) => item.slot_type === "special" && Number(item.slot_number) >= 41 && Number(item.slot_number) <= 45
      );
      membersDetailCaption.textContent = "5 vagas especiais · Fama total: " + formatFame(sumOccupiedFame(rotatingSlots)) + " · Responsável: " + ownerName;

      for (let slot = 41; slot <= 45; slot += 1) {
        const member = members.find(
          (item) => Number(item.slot_number) === slot && item.slot_type === "special"
        );
        membersSlotList.appendChild(createMemberSlotRow(slot, member, "Rotativo", "rotativos"));
      }
    } else {
      const houseIndex = houseOrder.indexOf(code);
      const house = houses.find((item) => item.code === code);
      const houseName = house && house.name ? house.name : (houseNames[code] || "Casa");
      const firstSlot = houseIndex * 10 + 1;
      const managerSlot = 46 + houseIndex;

      const houseRoster = getHouseRoster(code, house);
      membersDetailTitle.textContent = houseName;
      membersDetailCaption.textContent = "10 vagas de membros e 1 posição de gerente · Fama total: " + formatFame(sumOccupiedFame(houseRoster));

      for (let slot = firstSlot; slot < firstSlot + 10; slot += 1) {
        const member = members.find(
          (item) => Number(item.slot_number) === slot && item.slot_type === "member"
        );
        membersSlotList.appendChild(createMemberSlotRow(slot, member, "Membro", code));
      }

      const manager = members.find(
        (item) => item.slot_type === "manager" &&
          ((house && item.house_id === house.id) || Number(item.slot_number) === managerSlot)
      );
      const actualManagerSlot = manager ? Number(manager.slot_number) : managerSlot;
      membersSlotList.appendChild(createMemberSlotRow(actualManagerSlot, manager, "Gerente", code));
    }

    membersDetailPanel.hidden = false;
  }

  function closeMembersGroup() {
    if (!membersDetailPanel) return;
    membersDetailPanel.hidden = true;
    membersHouseGrid.querySelectorAll(".members-house-card").forEach((card) => {
      card.classList.remove("is-selected");
      card.setAttribute("aria-expanded", "false");
    });
  }

  function updateOverviewStats() {
    const stats = document.querySelectorAll(".stat-card strong");
    if (stats.length >= 4) {
      stats[0].textContent = String(members.length).padStart(2, "0");
      stats[1].textContent = String(houses.length).padStart(2, "0");
      stats[2].textContent = String(members.filter((m) => m.slot_type === "special").length).padStart(2, "0");
      stats[3].textContent = String(members.filter((m) => m.slot_type === "manager").length).padStart(2, "0");
    }

    const owner = members.find((member) => member.slot_number === 50);
    const ownerName = document.querySelector(".owner-name");
    if (ownerName && owner && owner.nickname) ownerName.textContent = owner.nickname;
  }

  async function loadPublicData() {
    if (!supabaseClient) {
      console.error("Supabase JS não foi carregado.");
      return;
    }

    const [houseResult, memberResult] = await Promise.all([
      supabaseClient.from("houses").select("id,code,name"),
      supabaseClient.from("members").select("id,slot_number,slot_type,slot_label,house_id,nickname,discord_tag,fame,is_occupied").order("slot_number")
    ]);

    if (houseResult.error) console.error("Erro ao carregar casas:", houseResult.error.message);
    if (memberResult.error) console.error("Erro ao carregar slots:", memberResult.error.message);

    if (!houseResult.error && houseResult.data) houses = houseResult.data;
    if (!memberResult.error && memberResult.data) members = memberResult.data;

    createHouseCards();
    createMembersHouseCards();
    updateOverviewStats();
  }

  function updateAuthButtons() {
    document.querySelectorAll("[data-login]").forEach((button) => {
      button.textContent = currentSession ? "Sair" : "Entrar";
      button.setAttribute("aria-label", currentSession ? "Sair da conta" : "Entrar");
    });

    const publicBadge = document.querySelector(".public-badge");
    if (publicBadge) {
      publicBadge.replaceChildren();
      const dot = document.createElement("span");
      dot.className = "state-dot";
      publicBadge.appendChild(dot);
      const text = document.createElement("span");
      text.textContent = currentSession
        ? "Conectado · " + (currentProfile && currentProfile.display_name ? currentProfile.display_name : currentSession.user.email)
        : "Visualização pública";
      publicBadge.appendChild(text);
    }

    const publicState = document.querySelector(".public-state");
    if (publicState) {
      publicState.replaceChildren();
      const dot = document.createElement("span");
      dot.className = "state-dot";
      publicState.appendChild(dot);
      publicState.appendChild(document.createTextNode(currentSession ? "Sessão ativa" : "Área pública"));
    }

    const requestsLock = document.querySelector('[data-view="requests"] .nav-lock');
    if (requestsLock) requestsLock.hidden = Boolean(currentSession);

    const settingsNav = document.querySelector('[data-view="settings"]');
    if (settingsNav) {
      settingsNav.hidden = Boolean(currentSession && currentProfile && currentProfile.role !== "owner");
      const settingsLock = settingsNav.querySelector(".nav-lock");
      if (settingsLock) settingsLock.hidden = Boolean(currentSession && currentProfile && currentProfile.role === "owner");
    }
  }

  async function loadCurrentProfile() {
    currentProfile = null;
    if (!currentSession || !supabaseClient) {
      updateAuthButtons();
      return;
    }

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("role,display_name,is_active")
      .eq("id", currentSession.user.id)
      .single();

    if (error || !data) {
      console.error("Não foi possível carregar o perfil:", error && error.message);
      await supabaseClient.auth.signOut();
      currentSession = null;
      updateAuthButtons();
      setLoginMessage("Não foi possível confirmar as permissões desta conta.", "error");
      return;
    }

    if (!data.is_active || !["owner", "manager", "member"].includes(data.role)) {
      await supabaseClient.auth.signOut();
      currentSession = null;
      currentProfile = null;
      updateAuthButtons();
      setLoginMessage("Esta conta não está ativa ou não possui uma função válida no clã.", "error");
      return;
    }

    currentProfile = data;
    updateAuthButtons();
  }


  async function showMemberFameRequest(container) {
    const heading = document.createElement("div");
    heading.className = "section-intro";
    heading.innerHTML = '<p class="eyebrow">ÁREA DO MEMBRO</p><h2>Minha FAMA</h2><p class="muted">Aqui você pode solicitar uma atualização da sua FAMA. O valor só muda depois da aprovação da administração.</p>';
    container.appendChild(heading);

    const { data: member, error: memberError } = await supabaseClient
      .from("members")
      .select("id,slot_number,nickname,fame")
      .eq("profile_id", currentSession.user.id)
      .maybeSingle();

    if (memberError || !member) {
      const message = document.createElement("div");
      message.className = "empty-state";
      message.textContent = memberError
        ? "Não foi possível carregar seus dados de membro: " + memberError.message
        : "Sua conta não está vinculada a um slot ativo. Procure a administração.";
      container.appendChild(message);
      return;
    }

    const panel = document.createElement("section");
    panel.className = "admin-section member-request-panel";

    const panelHeading = document.createElement("div");
    panelHeading.className = "admin-section-heading";
    const titleWrap = document.createElement("div");
    titleWrap.innerHTML = '<p class="eyebrow">SEU CADASTRO</p><h3>Solicitar alteração de FAMA</h3>';
    const slotChip = document.createElement("span");
    slotChip.className = "number-chip";
    slotChip.textContent = "Slot " + padSlot(member.slot_number);
    panelHeading.append(titleWrap, slotChip);

    const currentBox = document.createElement("div");
    currentBox.className = "global-fame-current";
    const currentLabel = document.createElement("span");
    currentLabel.textContent = "Sua FAMA atual";
    const currentValue = document.createElement("strong");
    currentValue.textContent = formatFame(member.fame);
    currentBox.append(currentLabel, currentValue);

    const form = document.createElement("form");
    form.className = "admin-form admin-form-nested";
    form.innerHTML = `
      <div class="form-grid">
        <div class="form-field form-field-wide">
          <label for="member-request-fame">Nova FAMA desejada</label>
          <input id="member-request-fame" name="requested_fame" type="text" inputmode="numeric" maxlength="30" pattern="[0-9]+" placeholder="Digite o valor atualizado" required>
          <small>Você só pode solicitar um valor maior que sua FAMA atual.</small>
        </div>
      </div>
      <p id="member-request-status" class="form-feedback" role="status" aria-live="polite"></p>
      <div class="form-actions"><button class="primary-button" type="submit">Enviar solicitação</button></div>
    `;

    const feedback = form.querySelector("#member-request-status");
    const submit = form.querySelector('button[type="submit"]');
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const requestedText = form.querySelector("#member-request-fame").value.trim();
      if (!/^\d{1,30}$/.test(requestedText)) {
        feedback.textContent = "Informe um número inteiro válido.";
        feedback.className = "form-feedback error";
        return;
      }

      const currentValueBig = BigInt(String(member.fame ?? "0"));
      const requestedValueBig = BigInt(requestedText);
      if (requestedValueBig <= currentValueBig) {
        feedback.textContent = "A nova FAMA precisa ser maior que " + formatFame(member.fame) + ".";
        feedback.className = "form-feedback error";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Enviando...";
      feedback.textContent = "Registrando sua solicitação...";
      feedback.className = "form-feedback";

      const { error } = await supabaseClient
        .from("fame_requests")
        .insert({
          member_id: member.id,
          old_fame: String(member.fame ?? "0"),
          requested_fame: requestedText
        });

      submit.disabled = false;
      submit.textContent = "Enviar solicitação";

      if (error) {
        console.error("Erro ao enviar solicitação de FAMA:", error);
        feedback.textContent = "Não foi possível enviar. " + error.message;
        feedback.className = "form-feedback error";
        return;
      }

      form.reset();
      feedback.textContent = "Solicitação enviada! Sua FAMA atual só será alterada após a aprovação da administração.";
      feedback.className = "form-feedback success";
    });

    panel.append(panelHeading, currentBox, form);
    container.appendChild(panel);
  }

  async function showRequests() {
    const container = document.getElementById("requests-content");
    container.replaceChildren();

    if (currentProfile && currentProfile.role === "member") {
      await showMemberFameRequest(container);
      return;
    }

    const heading = document.createElement("div");
    heading.className = "section-intro";
    heading.innerHTML = '<p class="eyebrow">SOLICITAÇÕES</p><h2>Requests recebidos</h2><p class="muted">Solicitações visíveis para sua conta conforme as permissões do banco.</p>';
    container.appendChild(heading);

    const { data, error } = await supabaseClient
      .from("fame_requests")
      .select("id,member_id,old_fame,requested_fame,status,review_note,created_at,reviewed_at")
      .order("created_at", { ascending: false });

    if (error) {
      const message = document.createElement("div");
      message.className = "empty-state";
      message.textContent = "Não foi possível carregar os requests: " + error.message;
      container.appendChild(message);
      return;
    }

    if (!data || data.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Nenhuma solicitação encontrada.";
      container.appendChild(empty);
      return;
    }

    let managedHouseIds = new Set();
    if (currentProfile && currentProfile.role === "manager") {
      const { data: managedHouses, error: managedHousesError } = await supabaseClient
        .from("houses")
        .select("id")
        .eq("manager_profile_id", currentSession.user.id);

      if (managedHousesError) {
        console.error("Não foi possível identificar a casa do gerente:", managedHousesError);
      } else {
        managedHouseIds = new Set((managedHouses || []).map((house) => house.id));
      }
    }

    const list = document.createElement("div");
    list.className = "request-list";
    data.forEach((request) => {
      const member = members.find((item) => item.id === request.member_id);
      const card = document.createElement("article");
      card.className = "request-card";

      const copy = document.createElement("div");
      copy.className = "request-card-copy";
      const title = document.createElement("h3");
      title.textContent = "Slot " + (member ? padSlot(member.slot_number) : "—") + " · alteração de FAMA";
      const details = document.createElement("p");
      details.textContent = Number(request.old_fame).toLocaleString("pt-BR") + " → " + Number(request.requested_fame).toLocaleString("pt-BR") + " · " + new Date(request.created_at).toLocaleString("pt-BR");
      copy.append(title, details);

      const side = document.createElement("div");
      side.className = "request-card-side";
      const status = document.createElement("span");
      status.className = "request-status";
      status.textContent = request.status === "pending" ? "Pendente" : request.status === "approved" ? "Aprovado" : "Recusado";
      side.appendChild(status);

      const canReview = currentProfile && (
        currentProfile.role === "owner" ||
        (currentProfile.role === "manager" && member && member.house_id && managedHouseIds.has(member.house_id))
      );

      if (request.status === "pending" && canReview) {
        const actions = document.createElement("div");
        actions.className = "request-actions";

        const approveButton = document.createElement("button");
        approveButton.type = "button";
        approveButton.className = "secondary-button";
        approveButton.textContent = "Aprovar";

        const rejectButton = document.createElement("button");
        rejectButton.type = "button";
        rejectButton.className = "danger-button";
        rejectButton.textContent = "Recusar";

        const feedback = document.createElement("p");
        feedback.className = "request-card-feedback";
        feedback.setAttribute("role", "status");
        feedback.setAttribute("aria-live", "polite");

        async function reviewRequest(decision, button) {
          const isApproval = decision === "approve";
          const actionLabel = isApproval ? "aprovar" : "recusar";
          const confirmation = window.confirm(
            "Deseja " + actionLabel + " a solicitação do slot " +
            (member ? padSlot(member.slot_number) : "—") + "?"
          );
          if (!confirmation) return;

          approveButton.disabled = true;
          rejectButton.disabled = true;
          button.textContent = isApproval ? "Aprovando..." : "Recusando...";
          feedback.textContent = "Salvando decisão...";
          feedback.className = "request-card-feedback";

          const { data: result, error: reviewError } = await supabaseClient.rpc(
            "review_fame_request",
            {
              p_request_id: request.id,
              p_decision: decision
            }
          );

          if (reviewError || !result?.success) {
            const message = reviewError
              ? reviewError.message
              : (result?.error || "O servidor não confirmou a decisão.");
            feedback.textContent = "Não foi possível concluir: " + message;
            feedback.className = "request-card-feedback error";
            approveButton.disabled = false;
            rejectButton.disabled = false;
            approveButton.textContent = "Aprovar";
            rejectButton.textContent = "Recusar";
            return;
          }

          feedback.textContent = isApproval
            ? "Solicitação aprovada e FAMA atualizada."
            : "Solicitação recusada.";
          feedback.className = "request-card-feedback success";
          await loadPublicData();
          await showRequests();
        }

        approveButton.addEventListener("click", () => reviewRequest("approve", approveButton));
        rejectButton.addEventListener("click", () => reviewRequest("reject", rejectButton));
        actions.append(approveButton, rejectButton);
        side.append(actions);
        card.append(copy, side, feedback);
      } else {
        card.append(copy, side);
      }

      list.appendChild(card);
    });
    container.appendChild(list);
  }

  function formatFame(value) {
    try {
      return BigInt(String(value ?? "0")).toLocaleString("pt-BR");
    } catch (_) {
      return String(value ?? "0");
    }
  }

  function setAdminFeedback(message, type) {
    const status = document.getElementById("admin-action-status");
    if (!status) return;
    status.textContent = message || "";
    status.className = "form-feedback" + (type ? " " + type : "");
  }

  async function readFunctionError(error, fallback) {
    let message = fallback;
    try {
      if (error && error.context && typeof error.context.clone === "function") {
        const payload = await error.context.clone().json();
        if (payload && payload.error) message = payload.error;
      } else if (error && error.message) {
        message = error.message;
      }
    } catch (_) {
      if (error && error.message) message = error.message;
    }
    return message;
  }

  async function showSettings() {
    const container = document.getElementById("settings-content");
    container.innerHTML = `
      <section class="settings-summary settings-intro">
        <h3>Administração do SACRIFICIO</h3>
        <p>Criação de contas, controle das vagas, correções de FAMA e remoção de integrantes. Estas ferramentas são exclusivas do proprietário.</p>
      </section>

      <section class="admin-section">
        <div class="admin-section-heading">
          <div><p class="eyebrow">CONTROLE DO CLÃ</p><h3>FAMA global</h3></div>
          <span class="number-chip">Σ</span>
        </div>
        <div class="global-fame-current">
          <span>FAMA acumulada do SACRIFICIO</span>
          <strong id="global-fame-current">Carregando...</strong>
        </div>
        <form id="global-fame-form" class="admin-form admin-form-nested">
          <div class="form-grid">
            <div class="form-field form-field-wide">
              <label for="global-fame-value">Novo total global</label>
              <input id="global-fame-value" name="new_total" type="text" inputmode="numeric" maxlength="30" pattern="[0-9]+" placeholder="Digite o total correto" required>
              <small>Este ajuste altera somente o total global, sem adicionar FAMA a nenhum integrante.</small>
            </div>
            <div class="form-field form-field-wide">
              <label for="global-fame-reason">Motivo da correção</label>
              <input id="global-fame-reason" name="reason" type="text" maxlength="500" placeholder="Explique o motivo do ajuste" required>
            </div>
          </div>
          <div class="form-actions"><button class="primary-button" id="global-fame-submit" type="submit">Corrigir FAMA global</button></div>
        </form>
      </section>

      <section class="admin-section">
        <div class="admin-section-heading">
          <div><p class="eyebrow">CONTAS CADASTRADAS</p><h3>Integrantes do clã</h3></div>
          <span class="number-chip" id="admin-member-total">—</span>
        </div>
        <p class="muted admin-section-description">Você pode corrigir a FAMA individual ou remover qualquer integrante, inclusive gerentes. A FAMA global não será reduzida quando alguém sair.</p>
        <div id="admin-members-list" class="admin-members-list"></div>
      </section>

      <section class="admin-section">
        <details class="create-account-details" open>
          <summary>
            <span><p class="eyebrow">NOVO CADASTRO</p><strong>Criar conta</strong></span>
            <span class="number-chip">+</span>
          </summary>
          <form id="create-account-form" class="admin-form admin-form-nested">
            <div class="form-grid">
              <div class="form-field">
                <label for="create-role">Tipo de conta</label>
                <select id="create-role" name="role" required>
                  <option value="member">Membro</option>
                  <option value="manager">Gerente</option>
                </select>
              </div>
              <div class="form-field">
                <label for="create-nickname">Nick do jogo</label>
                <input id="create-nickname" name="nickname" type="text" minlength="2" maxlength="32" autocomplete="off" placeholder="Ex.: Jogador123" required>
              </div>
              <div class="form-field form-field-wide" id="create-email-field" hidden>
                <label for="create-email">Email do gerente</label>
                <input id="create-email" name="email" type="email" autocomplete="off" placeholder="gerente@email.com">
                <small>O email será usado para entrar na conta de gerente.</small>
              </div>
              <div class="form-field">
                <label for="create-password">Senha inicial</label>
                <input id="create-password" name="password" type="password" minlength="10" autocomplete="new-password" placeholder="Mínimo de 10 caracteres" required>
              </div>
              <div class="form-field">
                <label for="create-discord">Discord (opcional)</label>
                <input id="create-discord" name="discord_tag" type="text" maxlength="100" autocomplete="off" placeholder="Usuário do Discord">
              </div>
              <div class="form-field form-field-wide">
                <label for="create-slot">Slot disponível</label>
                <select id="create-slot" name="slot_number" required></select>
                <small id="create-slot-info">Escolha primeiro o tipo de conta.</small>
              </div>
            </div>
            <div class="admin-form-note">
              <strong>Segurança das credenciais</strong>
              <span>A senha será enviada diretamente à função segura do Supabase Auth. Ela não será gravada em uma tabela nem exibida depois do cadastro.</span>
            </div>
            <p id="create-account-status" class="form-feedback" role="status" aria-live="polite"></p>
            <div class="form-actions">
              <button class="primary-button" id="create-account-submit" type="submit">Criar conta e ocupar slot</button>
            </div>
          </form>
        </details>
      </section>
      <p id="admin-action-status" class="form-feedback" role="status" aria-live="polite"></p>
    `;

    if (!supabaseClient || !currentSession || !currentProfile || currentProfile.role !== "owner") {
      return;
    }

    // FAMA global
    const globalCurrent = document.getElementById("global-fame-current");
    const globalInput = document.getElementById("global-fame-value");
    const globalForm = document.getElementById("global-fame-form");
    const globalSubmit = document.getElementById("global-fame-submit");

    const { data: stats, error: statsError } = await supabaseClient
      .from("clan_stats")
      .select("global_fame")
      .eq("id", 1)
      .maybeSingle();

    if (statsError || !stats) {
      globalCurrent.textContent = "Não foi possível carregar";
      setAdminFeedback("Erro ao consultar a FAMA global: " + (statsError?.message || "registro não encontrado."), "error");
    } else {
      globalCurrent.textContent = formatFame(stats.global_fame);
      globalForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const newTotal = globalInput.value.trim();
        const reason = document.getElementById("global-fame-reason").value.trim();

        if (!/^\d{1,30}$/.test(newTotal) || !reason) {
          setAdminFeedback("Informe um total inteiro válido e o motivo da correção.", "error");
          return;
        }

        if (!window.confirm("Confirma definir a FAMA global do SACRIFICIO como " + formatFame(newTotal) + "? Isso não altera a FAMA individual de ninguém.")) {
          return;
        }

        globalSubmit.disabled = true;
        globalSubmit.textContent = "Salvando...";
        setAdminFeedback("Aplicando correção global...", "");

        const { error } = await supabaseClient.rpc("admin_adjust_global_fame", {
          p_new_total: newTotal,
          p_reason: reason
        });

        globalSubmit.disabled = false;
        globalSubmit.textContent = "Corrigir FAMA global";

        if (error) {
          console.error("Erro ao corrigir FAMA global:", error);
          setAdminFeedback("Não foi possível corrigir a FAMA global: " + error.message, "error");
          return;
        }

        await showSettings();
        setAdminFeedback("FAMA global atualizada com sucesso.", "success");
      });
    }

    // Lista de integrantes ocupados
    const list = document.getElementById("admin-members-list");
    const occupiedMembers = members
      .filter((member) => member.is_occupied && Number(member.slot_number) !== 50)
      .sort((a, b) => a.slot_number - b.slot_number);

    document.getElementById("admin-member-total").textContent = String(occupiedMembers.length);

    if (occupiedMembers.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Ainda não existem membros ou gerentes cadastrados.";
      list.appendChild(empty);
    }

    occupiedMembers.forEach((member) => {
      const info = getSlotInfo(member);
      const card = document.createElement("article");
      card.className = "admin-member-card";

      const top = document.createElement("div");
      top.className = "admin-member-top";

      const identity = document.createElement("div");
      identity.className = "admin-member-identity";

      const name = document.createElement("strong");
      name.textContent = member.nickname || "Integrante sem Nick";

      const meta = document.createElement("span");
      meta.textContent = "Slot " + padSlot(member.slot_number) + " · " + info.group + " · " + info.role;

      identity.append(name, meta);

      const fame = document.createElement("span");
      fame.className = "admin-member-fame";
      fame.textContent = formatFame(member.fame) + " FAMA";

      top.append(identity, fame);

      const actions = document.createElement("div");
      actions.className = "admin-member-actions";

      const fameForm = document.createElement("form");
      fameForm.className = "member-fame-form";

      const newFameLabel = document.createElement("label");
      newFameLabel.textContent = "Corrigir FAMA";
      const newFameInput = document.createElement("input");
      newFameInput.type = "text";
      newFameInput.inputMode = "numeric";
      newFameInput.maxLength = 30;
      newFameInput.pattern = "[0-9]+";
      newFameInput.placeholder = "Novo valor";
      newFameInput.value = String(member.fame ?? "0");
      newFameInput.required = true;
      newFameInput.setAttribute("aria-label", "Nova FAMA de " + (member.nickname || "integrante"));
      const reasonInput = document.createElement("input");
      reasonInput.type = "text";
      reasonInput.maxLength = 500;
      reasonInput.placeholder = "Motivo da correção";
      reasonInput.required = true;
      reasonInput.setAttribute("aria-label", "Motivo da correção de FAMA");
      const adjustButton = document.createElement("button");
      adjustButton.type = "submit";
      adjustButton.className = "secondary-button";
      adjustButton.textContent = "Salvar FAMA";

      newFameLabel.appendChild(newFameInput);
      fameForm.append(newFameLabel, reasonInput, adjustButton);

      fameForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const newValue = newFameInput.value.trim();
        const reason = reasonInput.value.trim();

        if (!/^\d{1,30}$/.test(newValue) || !reason) {
          setAdminFeedback("Informe uma FAMA inteira válida e o motivo da correção.", "error");
          return;
        }

        if (BigInt(newValue) < BigInt(String(member.fame || "0"))) {
          const confirmed = window.confirm(
            "Você está diminuindo a FAMA de " + (member.nickname || "este integrante") +
            ". A FAMA global também diminuirá pela diferença. Deseja continuar?"
          );
          if (!confirmed) return;
        }

        adjustButton.disabled = true;
        adjustButton.textContent = "Salvando...";

        const { error } = await supabaseClient.rpc("admin_adjust_member_fame", {
          p_member_id: member.id,
          p_new_fame: newValue,
          p_reason: reason
        });

        if (error) {
          console.error("Erro ao corrigir FAMA individual:", error);
          setAdminFeedback("Não foi possível corrigir a FAMA: " + error.message, "error");
          adjustButton.disabled = false;
          adjustButton.textContent = "Salvar FAMA";
          return;
        }

        await loadPublicData();
        await showSettings();
        setAdminFeedback("FAMA de " + (member.nickname || "integrante") + " corrigida com sucesso.", "success");
      });

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "danger-button";
      removeButton.textContent = "Remover integrante";
      removeButton.addEventListener("click", async () => {
        const confirmation = window.confirm(
          "Remover " + (member.nickname || "este integrante") +
          " do slot " + padSlot(member.slot_number) + "?\n\n" +
          "A conta, Nick, Discord, FAMA individual e requests serão excluídos. " +
          "A FAMA global do SACRIFICIO será preservada."
        );

        if (!confirmation) return;

        removeButton.disabled = true;
        removeButton.textContent = "Removendo...";

        const { data, error } = await supabaseClient.functions.invoke(
          "remove-clan-member",
          { body: { slot_number: Number(member.slot_number) } }
        );

        if (error || !data?.success) {
          const message = error
            ? await readFunctionError(error, "Não foi possível remover o integrante.")
            : (data?.error || "O servidor não confirmou a remoção.");

          console.error("Erro ao remover integrante:", error || data);
          removeButton.disabled = false;
          removeButton.textContent = "Remover integrante";
          setAdminFeedback(message, "error");
          return;
        }

        await loadPublicData();
        await showSettings();
        setAdminFeedback(
          "Integrante removido. Slot " + padSlot(data.slot_number) +
          " liberado; a FAMA global foi preservada.",
          "success"
        );
      });

      actions.append(fameForm, removeButton);
      card.append(top, actions);
      list.appendChild(card);
    });

    // Cadastro de novas contas
    const { data: houseData, error: houseError } = await supabaseClient
      .from("houses")
      .select("id,code,name,manager_profile_id");

    if (houseError) {
      console.error("Erro ao consultar gerentes das casas:", houseError.message);
      setCreateAccountFeedback("Não foi possível carregar as casas. Atualize a página e tente novamente.", "error");
      return;
    }

    houses = houseData ?? houses;

    const form = document.getElementById("create-account-form");
    const roleSelect = document.getElementById("create-role");
    const slotSelect = document.getElementById("create-slot");
    const emailField = document.getElementById("create-email-field");
    const emailInput = document.getElementById("create-email");
    const slotInfo = document.getElementById("create-slot-info");
    const submitButton = document.getElementById("create-account-submit");

    function refreshAvailableSlots() {
      const role = roleSelect.value;
      const isManager = role === "manager";
      emailField.hidden = !isManager;
      emailInput.required = isManager;

      const available = members
        .filter((member) => {
          if (member.is_occupied) return false;
          if (!isManager) {
            return member.slot_type === "member" || member.slot_type === "special";
          }
          if (member.slot_type !== "manager" || !member.house_id) return false;
          const house = houses.find((item) => item.id === member.house_id);
          return Boolean(house && !house.manager_profile_id);
        })
        .sort((a, b) => a.slot_number - b.slot_number);

      slotSelect.replaceChildren();

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = available.length
        ? "Selecione uma vaga"
        : isManager ? "Nenhuma vaga de gerente disponível" : "Nenhuma vaga disponível";
      slotSelect.appendChild(placeholder);

      available.forEach((member) => {
        const info = getSlotInfo(member);
        const option = document.createElement("option");
        option.value = String(member.slot_number);
        option.textContent =
          "Slot " + padSlot(member.slot_number) + " — " +
          (isManager ? "Gerente · " + info.group : info.group + " · " +
            (member.slot_type === "special" ? "Especial/rotativo" : "Membro"));
        slotSelect.appendChild(option);
      });

      slotSelect.disabled = available.length === 0;
      submitButton.disabled = available.length === 0;
      slotInfo.textContent = isManager
        ? "Gerentes ocupam os slots 46–49 e ficam vinculados à casa correspondente."
        : "Membros podem ocupar os slots 01–45, incluindo as cinco vagas especiais.";
    }

    roleSelect.addEventListener("change", refreshAvailableSlots);
    refreshAvailableSlots();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const role = roleSelect.value;
      const nickname = document.getElementById("create-nickname").value.trim();
      const password = document.getElementById("create-password").value;
      const slotNumber = Number(slotSelect.value);
      const discordTag = document.getElementById("create-discord").value.trim();
      const email = emailInput.value.trim();

      if (!slotNumber) {
        setCreateAccountFeedback("Selecione um slot disponível.", "error");
        return;
      }

      if (role === "manager" && !email) {
        setCreateAccountFeedback("Informe o email do gerente.", "error");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Criando conta...";
      setCreateAccountFeedback("Enviando cadastro ao Supabase...", "");

      try {
        const { data, error } = await supabaseClient.functions.invoke(
          "create-clan-account",
          {
            body: {
              role,
              nickname,
              password,
              slot_number: slotNumber,
              email: role === "manager" ? email : undefined,
              discord_tag: discordTag || null
            }
          }
        );

        if (error) {
          const serverMessage = await readFunctionError(error, "Não foi possível criar a conta.");
          throw new Error(serverMessage);
        }

        if (!data || !data.success) {
          throw new Error(data && data.error ? data.error : "O servidor não confirmou o cadastro.");
        }

        form.reset();
        await loadPublicData();
        await showSettings();

        setCreateAccountFeedback(
          "Conta criada! " + data.account.nickname +
          " foi vinculado ao slot " + padSlot(data.account.slot_number) +
          (data.account.house ? " · " + data.account.house : "") + ".",
          "success"
        );
      } catch (error) {
        console.error("Erro ao criar conta:", error);
        setCreateAccountFeedback(error.message || "Erro inesperado ao criar a conta.", "error");
      } finally {
        const currentButton = document.getElementById("create-account-submit");
        if (currentButton) {
          currentButton.disabled = false;
          currentButton.textContent = "Criar conta e ocupar slot";
        }
      }
    });
  }

  function setCreateAccountFeedback(message, type) {
    const status = document.getElementById("create-account-status");
    if (!status) return;
    status.textContent = message || "";
    status.className = "form-feedback" + (type ? " " + type : "");
  }

  function showView(name) {
    const target = document.getElementById("view-" + name);
    if (!target) return false;

    if ((name === "requests" || name === "settings") && !currentSession) {
      setLoginMessage("Entre com sua conta para acessar esta área.", "");
      if (typeof loginDialog.showModal === "function") loginDialog.showModal();
      return false;
    }

    if (name === "settings" && (!currentProfile || currentProfile.role !== "owner")) {
      return false;
    }

    document.querySelectorAll(".view").forEach((view) => {
      const active = view === target;
      view.classList.toggle("active", active);
      view.hidden = !active;
    });

    document.querySelectorAll(".nav-link").forEach((button) => {
      const active = button.dataset.view === name;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });

    document.getElementById("page-title").textContent = target.dataset.title || "SACRIFICIO";
    window.history.replaceState(null, "", "#" + (name === "overview" ? "visao-geral" : name));

    if (name === "requests") showRequests();
    if (name === "settings") showSettings();
    return true;
  }

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.go));
  });

  document.querySelectorAll("[data-login]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (currentSession) {
        const { error } = await supabaseClient.auth.signOut();
        if (error) console.error("Erro ao sair:", error.message);
        currentSession = null;
        currentProfile = null;
        updateAuthButtons();
        showView("overview");
      } else if (typeof loginDialog.showModal === "function") {
        setLoginMessage("", "");
        loginDialog.showModal();
      }
    });
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => loginDialog.close());
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabaseClient) {
      setLoginMessage("O cliente Supabase não carregou. Atualize a página e tente novamente.", "error");
      return;
    }

    const identity = document.getElementById("login-identity").value.trim();
    const password = document.getElementById("login-password").value;
    loginSubmit.disabled = true;
    loginSubmit.textContent = "Entrando...";
    setLoginMessage("Verificando acesso...", "");

    try {
      if (identity.includes("@")) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: identity,
          password
        });
        if (error) throw error;
        currentSession = data.session;
      } else {
        const { data, error } = await supabaseClient.functions.invoke(
          "member-login",
          { body: { nickname: identity, password } }
        );

        if (error) {
          throw new Error(await readFunctionError(error, "Não foi possível entrar. Confira o Nick e a senha."));
        }
        if (!data?.session?.access_token || !data?.session?.refresh_token) {
          throw new Error(data?.error || "Não foi possível entrar. Confira o Nick e a senha.");
        }

        const { data: sessionData, error: sessionError } = await supabaseClient.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });
        if (sessionError) throw sessionError;
        currentSession = sessionData.session;
      }

      await loadCurrentProfile();

      if (currentSession && currentProfile) {
        setLoginMessage("Acesso confirmado.", "success");
        loginDialog.close();
        loginForm.reset();
        await loadPublicData();
        showView(currentProfile.role === "member" ? "requests" : "overview");
      } else {
        setLoginMessage("Não foi possível confirmar as permissões desta conta.", "error");
      }
    } catch (error) {
      console.error("Erro de login:", error);
      setLoginMessage(
        identity.includes("@")
          ? "Não foi possível entrar. Confira o email e a senha."
          : (error.message || "Não foi possível entrar. Confira o Nick e a senha."),
        "error"
      );
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Entrar";
    }
  });

  if (membersBackButton) {
    membersBackButton.addEventListener("click", closeMembersGroup);
  }

  async function init() {
    if (!supabaseClient) {
      setLoginMessage("Não foi possível carregar a biblioteca do Supabase.", "error");
      return;
    }

    await loadPublicData();

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) console.error("Erro ao recuperar sessão:", error.message);
    currentSession = data && data.session ? data.session : null;
    await loadCurrentProfile();

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentSession = session;
      // Defer profile reads until the auth callback releases its internal lock.
      window.setTimeout(() => loadCurrentProfile(), 0);
    });

    const initialHash = window.location.hash.replace("#", "");
    const initialViews = {
      "visao-geral": "overview",
      "members": "members",
      "requests": "requests",
      "settings": "settings"
    };
    if (initialViews[initialHash]) showView(initialViews[initialHash]);
    updateAuthButtons();
  }

  init().catch((error) => {
    console.error("Erro ao iniciar o SACRIFICIO:", error);
  });
})();
