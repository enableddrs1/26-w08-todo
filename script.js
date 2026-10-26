"use strict";

const STORAGE_KEY = "todo-list.tasks.v1";
const MAX_TASK_LENGTH = 200;

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const inputMessage = document.querySelector("#input-message");
const characterCount = document.querySelector("#character-count");
const storageMessage = document.querySelector("#storage-message");
const totalCount = document.querySelector("#total-count");
const completedCount = document.querySelector("#completed-count");
const progressLabel = document.querySelector("#progress-label");
const progressTrack = document.querySelector("#progress-track");
const progressFill = document.querySelector("#progress-fill");
const filterButtons = document.querySelectorAll(".filter-button");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");

let tasks = loadTasks();
let currentFilter = "all";
let fallbackIdCounter = 0;

function isTaskArray(value) {
  if (!Array.isArray(value)) {
    return false;
  }

  const ids = new Set();
  return value.every((task) => {
    if (
      task === null ||
      typeof task !== "object" ||
      typeof task.id !== "string" ||
      task.id.length === 0 ||
      typeof task.text !== "string" ||
      task.text.trim().length === 0 ||
      task.text.length > MAX_TASK_LENGTH ||
      typeof task.completed !== "boolean" ||
      typeof task.createdAt !== "number" ||
      !Number.isFinite(task.createdAt) ||
      ids.has(task.id)
    ) {
      return false;
    }

    ids.add(task.id);
    return true;
  });
}

function loadTasks() {
  try {
    const storedTasks = window.localStorage.getItem(STORAGE_KEY);
    if (storedTasks === null) {
      return [];
    }

    const parsedTasks = JSON.parse(storedTasks);
    if (!isTaskArray(parsedTasks)) {
      showStorageMessage("저장된 할 일 데이터가 올바르지 않아 빈 목록으로 시작합니다.");
      return [];
    }

    return parsedTasks;
  } catch (error) {
    console.warn("Unable to load saved tasks.", error);
    showStorageMessage("저장된 할 일을 불러오지 못해 빈 목록으로 시작합니다.");
    return [];
  }
}

function showStorageMessage(message) {
  storageMessage.textContent = message;
  storageMessage.classList.remove("hidden");
}

function clearStorageMessage() {
  storageMessage.textContent = "";
  storageMessage.classList.add("hidden");
}

function saveTasks() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    clearStorageMessage();
  } catch (error) {
    console.warn("Unable to save tasks.", error);
    showStorageMessage("브라우저 저장소에 저장하지 못했습니다. 브라우저 설정을 확인해 주세요.");
  }
}

function createTaskId() {
  let id;
  do {
    if (typeof window.crypto?.randomUUID === "function") {
      id = window.crypto.randomUUID();
    } else {
      fallbackIdCounter += 1;
      id = `todo-${Date.now()}-${fallbackIdCounter}-${Math.random().toString(36).slice(2)}`;
    }
  } while (tasks.some((task) => task.id === id));

  return id;
}

function getVisibleTasks() {
  if (currentFilter === "active") {
    return tasks.filter((task) => !task.completed);
  }
  if (currentFilter === "completed") {
    return tasks.filter((task) => task.completed);
  }
  return tasks;
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className =
    "flex min-w-0 items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:items-center";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox mt-1 h-5 w-5 shrink-0 cursor-pointer accent-cyan-400 sm:mt-0";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `${task.text} 완료 여부`);
  checkbox.dataset.action = "toggle";
  checkbox.dataset.taskId = task.id;

  const text = document.createElement("span");
  text.className = `task-text min-w-0 flex-1 leading-relaxed ${
    task.completed ? "text-slate-500 line-through" : "text-slate-200"
  }`;
  text.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className =
    "task-delete min-h-10 shrink-0 rounded-xl px-3 text-sm font-semibold text-slate-400 transition hover:bg-rose-400/10 hover:text-rose-300";
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("aria-label", `삭제: ${task.text}`);
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.taskId = task.id;

  item.append(checkbox, text, deleteButton);
  return item;
}

function render() {
  const completed = tasks.filter((task) => task.completed).length;
  const percentage = tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);

  totalCount.textContent = String(tasks.length);
  completedCount.textContent = String(completed);
  progressLabel.textContent = `${percentage}%`;
  progressTrack.setAttribute("aria-valuenow", String(percentage));
  progressFill.style.width = `${percentage}%`;

  filterButtons.forEach((button) => {
    const selected = button.dataset.filter === currentFilter;
    button.setAttribute("aria-pressed", String(selected));
  });

  const visibleTasks = getVisibleTasks();
  todoList.replaceChildren(...visibleTasks.map(createTaskElement));

  if (tasks.length === 0) {
    emptyState.textContent = "할 일을 추가해 보세요!";
    emptyState.classList.remove("hidden");
  } else if (visibleTasks.length === 0) {
    emptyState.textContent = "표시할 할 일이 없습니다.";
    emptyState.classList.remove("hidden");
  } else {
    emptyState.textContent = "";
    emptyState.classList.add("hidden");
  }
}

function updateCharacterCount() {
  const length = input.value.length;
  characterCount.textContent = `${length} / ${MAX_TASK_LENGTH}`;
  characterCount.classList.toggle("text-rose-300", length > MAX_TASK_LENGTH);
  characterCount.classList.toggle("text-slate-500", length <= MAX_TASK_LENGTH);
}

function showInputMessage(message) {
  inputMessage.textContent = message;
  inputMessage.classList.remove("hidden");
  input.setAttribute("aria-invalid", "true");
}

function clearInputMessage() {
  inputMessage.textContent = "";
  inputMessage.classList.add("hidden");
  input.removeAttribute("aria-invalid");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (text.length === 0) {
    showInputMessage("할 일 내용을 입력해 주세요.");
    input.focus();
    return;
  }
  if (input.value.length > MAX_TASK_LENGTH) {
    showInputMessage("할 일은 200자 이하로 입력해 주세요.");
    input.focus();
    return;
  }

  tasks = [
    ...tasks,
    {
      id: createTaskId(),
      text,
      completed: false,
      createdAt: Date.now(),
    },
  ];
  saveTasks();
  clearInputMessage();
  input.value = "";
  updateCharacterCount();
  render();
  input.focus();
});

input.addEventListener("input", () => {
  clearInputMessage();
  updateCharacterCount();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

todoList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.dataset.action !== "toggle") {
    return;
  }

  const task = tasks.find((item) => item.id === target.dataset.taskId);
  if (!task) {
    render();
    return;
  }

  tasks = tasks.map((item) =>
    item.id === task.id ? { ...item, completed: target.checked } : item,
  );
  saveTasks();
  render();
});

todoList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest('button[data-action="delete"]');
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const nextTasks = tasks.filter((task) => task.id !== button.dataset.taskId);
  if (nextTasks.length === tasks.length) {
    render();
    return;
  }

  tasks = nextTasks;
  saveTasks();
  render();
});

updateCharacterCount();
render();
