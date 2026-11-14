(() => {
  "use strict";

  const houses = [
    { name: "Conquista", first: 1, last: 10, manager: 46 },
    { name: "Guerra", first: 11, last: 20, manager: 47 },
    { name: "Fome", first: 21, last: 30, manager: 48 },
    { name: "Morte", first: 31, last: 40, manager: 49 }
  ];

  const overviewHouses = document.getElementById("overview-houses");
  const tableBody = document.getElementById("members-table-body");
  const searchInput = document.getElementById("member-search");
  const memberCount = document.getElementById("member-count");
  const loginDialog = document.getElementById("login-dialog");

  function padSlot(number) {
    return String(number).padStart(2, "0");
  }

  function createHouseCards() {
    houses.forEach((house) => {
      const card = document.createElement("article");
      card.className = "house-card";

      const top = document.createElement("div");
      top.className = "house-card-top";

      const title = document.createElement("h3");
      title.textContent = house.name;

      const range = document.createElement("span");
      range.className = "house-range";
      range.textContent = "Slots " + padSlot(house.first) + "–" + padSlot(house.last);

      top.append(title, range);

      const slots = document.createElement("div");
      slots.className = "slot-preview";

      for (let slot = house.first; slot <= house.last; slot += 1) {
        const pill = document.createElement("span");
        pill.className = "slot-pill";
        pill.textContent = padSlot(slot);
        slots.appendChild(pill);
      }

      const manager = document.createElement("p");
      manager.className = "house-manager";
      manager.textContent = "Posição do gerente: slot " + padSlot(house.manager);

      card.append(top, slots, manager);
      overviewHouses.appendChild(card);
    });
  }

  function getSlotInfo(slot) {
    if (slot >= 1 && slot <= 10) return { group: "Conquista", role: "Membro" };
    if (slot >= 11 && slot <= 20) return { group: "Guerra", role: "Membro" };
    if (slot >= 21 && slot <= 30) return { group: "Fome", role: "Membro" };
    if (slot >= 31 && slot <= 40) return { group: "Morte", role: "Membro" };
    if (slot >= 41 && slot <= 45) return { group: "Rotativos e especiais", role: "Especial" };
    if (slot === 46) return { group: "Conquista", role: "Gerente" };
    if (slot === 47) return { group: "Guerra", role: "Gerente" };
    if (slot === 48) return { group: "Fome", role: "Gerente" };
    if (slot === 49) return { group: "Morte", role: "Gerente" };
    return { group: "Administração", role: "Proprietário" };
  }

  function createMemberRows(filter) {
    const term = (filter || "").trim().toLocaleLowerCase("pt-BR");
    tableBody.replaceChildren();
    let visible = 0;

    for (let slot = 1; slot <= 50; slot += 1) {
      const info = getSlotInfo(slot);
      const isOwner = slot === 50;
      const name = isOwner ? "Lux_Nihil" : "Vaga disponível";
      const searchable = (padSlot(slot) + " " + info.group + " " + info.role + " " + name).toLocaleLowerCase("pt-BR");

      if (term && !searchable.includes(term)) continue;
      visible += 1;

      const row = document.createElement("tr");
      const values = [
        { text: padSlot(slot), className: "slot-number" },
        { text: info.group, className: "" },
        { text: info.role, className: "" },
        { text: name, className: isOwner ? "status-owner" : "" },
        { text: isOwner ? "Ocupado" : "Disponível", className: isOwner ? "status-owner" : "status-empty" }
      ];

      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value.text;
        if (value.className) cell.className = value.className;
        row.appendChild(cell);
      });

      tableBody.appendChild(row);
    }

    memberCount.textContent = visible + (visible === 1 ? " posição" : " posições");
  }

  function showView(name) {
    const target = document.getElementById("view-" + name);
    if (!target) return;

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

    document.getElementById("page-title").textContent = target.dataset.title || "CLAN FAMA";
    window.history.replaceState(null, "", "#" + (name === "overview" ? "visao-geral" : name));
  }

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.go));
  });

  document.querySelectorAll("[data-login]").forEach((button) => {
    button.addEventListener("click", () => {
      if (typeof loginDialog.showModal === "function") loginDialog.showModal();
    });
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => loginDialog.close());
  });

  searchInput.addEventListener("input", () => createMemberRows(searchInput.value));

  createHouseCards();
  createMemberRows("");

  const hash = window.location.hash.replace("#", "");
  const initialViews = {
    "visao-geral": "overview",
    "members": "members",
    "requests": "requests",
    "settings": "settings"
  };
  if (initialViews[hash]) showView(initialViews[hash]);
})();