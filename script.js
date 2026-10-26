"use strict";

const STORAGE_KEY = "todo-list-items";
const MAX_TEXT_LENGTH = 200;
const FILTERS = {
  all: "all",
  active: "active",
  completed: "completed"
};
const PRIORITIES = {
  low: "낮음",
  medium: "보통",
  high: "높음"
};

const form = document.querySelector("#todoForm");
const input = document.querySelector("#todoInput");
const dueAtInput = document.querySelector("#dueAtInput");
const priorityInput = document.querySelector("#priorityInput");
const inputMessage = document.querySelector("#inputMessage");
const characterCount = document.querySelector("#characterCount");
const todoList = document.querySelector("#todoList");
const emptyState = document.querySelector("#emptyState");
const totalCount = document.querySelector("#totalCount");
const completedCount = document.querySelector("#completedCount");
const progressLabel = document.querySelector("#progressLabel");
const progress = document.querySelector(".progress-track");
const progressBar = document.querySelector("#progressBar");
const storageNotice = document.querySelector("#storageNotice");
const filterButtons = document.querySelectorAll("[data-filter]");
const deleteDialog = document.querySelector("#deleteDialog");
const deleteDialogDescription = document.querySelector("#deleteDialogDescription");
const cancelDeleteButton = document.querySelector("#cancelDelete");
const confirmDeleteButton = document.querySelector("#confirmDelete");

let todos = loadTodos();
let currentFilter = FILTERS.all;
let pendingDeleteId = null;
let deleteTrigger = null;

function loadTodos() {
  let savedTodos;

  try {
    savedTodos = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("저장된 할 일을 불러오지 못했습니다.", error);
    showStorageNotice("저장된 할 일을 불러오지 못해 빈 목록으로 시작합니다.");
    return [];
  }

  if (savedTodos === null) {
    return [];
  }

  try {
    const parsedTodos = JSON.parse(savedTodos);
    if (
      !Array.isArray(parsedTodos) ||
      !parsedTodos.every(isValidTodo) ||
      new Set(parsedTodos.map((todo) => todo.id)).size !== parsedTodos.length
    ) {
      throw new TypeError("저장된 할 일 데이터 형식이 올바르지 않습니다.");
    }
    return parsedTodos.map((todo) => ({
      ...todo,
      dueAt: todo.dueAt ?? null,
      priority: todo.priority ?? "medium"
    }));
  } catch (error) {
    console.warn("저장된 할 일 데이터가 손상되어 빈 목록으로 시작합니다.", error);
    showStorageNotice("저장된 할 일 데이터를 읽을 수 없어 빈 목록으로 시작합니다.");
    return [];
  }
}

function isValidTodo(todo) {
  return (
    todo !== null &&
    typeof todo === "object" &&
    typeof todo.id === "string" &&
    todo.id.length > 0 &&
    typeof todo.text === "string" &&
    todo.text.trim().length > 0 &&
    getCharacterLength(todo.text) > 0 &&
    getCharacterLength(todo.text) <= MAX_TEXT_LENGTH &&
    typeof todo.completed === "boolean" &&
    typeof todo.createdAt === "number" &&
    Number.isFinite(todo.createdAt) &&
    (todo.dueAt === undefined || todo.dueAt === null || isValidLocalDateTime(todo.dueAt)) &&
    (todo.priority === undefined || Object.hasOwn(PRIORITIES, todo.priority))
  );
}

function isValidLocalDateTime(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value);
  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10)) &&
    date.getHours() === Number(value.slice(11, 13)) &&
    date.getMinutes() === Number(value.slice(14, 16))
  );
}

function getCharacterLength(value) {
  return Array.from(value).length;
}

function showStorageNotice(message) {
  storageNotice.textContent = message;
  storageNotice.classList.remove("d-none");
}

function clearStorageNotice() {
  storageNotice.textContent = "";
  storageNotice.classList.add("d-none");
}

function saveTodos() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    clearStorageNotice();
  } catch (error) {
    console.error("할 일 목록을 저장하지 못했습니다.", error);
    showStorageNotice("저장하지 못했습니다. 새로고침하면 변경 사항이 사라질 수 있습니다.");
  }
}

function createTodoId() {
  if (typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setInputMessage(message) {
  inputMessage.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function updateCharacterCount() {
  const length = getCharacterLength(input.value);
  characterCount.textContent = `${length}/${MAX_TEXT_LENGTH}`;
  characterCount.classList.toggle("is-over-limit", length > MAX_TEXT_LENGTH);
  if (length <= MAX_TEXT_LENGTH) {
    setInputMessage("");
  }
}

function getVisibleTodos() {
  if (currentFilter === FILTERS.active) {
    return todos.filter((todo) => !todo.completed);
  }
  if (currentFilter === FILTERS.completed) {
    return todos.filter((todo) => todo.completed);
  }
  return todos;
}

function createTodoElement(todo) {
  const item = document.createElement("li");
  item.className = "list-group-item todo-item";
  item.dataset.todoId = todo.id;
  item.classList.toggle("is-completed", todo.completed);

  const checkbox = document.createElement("input");
  checkbox.className = "form-check-input todo-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", `${todo.text} 완료 여부`);
  checkbox.addEventListener("change", () => {
    const wasCompleted = todo.completed;
    todos = todos.map((currentTodo) =>
      currentTodo.id === todo.id
        ? { ...currentTodo, completed: checkbox.checked }
        : currentTodo
    );
    saveTodos();
    render();
    if (checkbox.checked && !wasCompleted) {
      const updatedItem = Array.from(todoList.children).find(
        (currentItem) => currentItem.dataset.todoId === todo.id
      );
      if (updatedItem) {
        showConfetti(updatedItem);
      }
    }
  });

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;

  const details = document.createElement("div");
  details.className = "todo-details";

  const priority = document.createElement("span");
  priority.className = `priority-badge priority-${todo.priority}`;
  priority.textContent = `우선순위 ${PRIORITIES[todo.priority]}`;
  details.append(priority);

  if (todo.dueAt) {
    const dueAt = new Date(todo.dueAt);
    const dueDate = document.createElement("time");
    dueDate.className = "due-date";
    dueDate.dateTime = todo.dueAt;
    dueDate.textContent = `마감 ${new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(dueAt)}`;

    if (!todo.completed && dueAt.getTime() < Date.now()) {
      dueDate.classList.add("is-overdue");
      dueDate.textContent = `기한 지남 · ${dueDate.textContent}`;
    }
    details.append(dueDate);
  }

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-outline-danger btn-sm delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("aria-label", `${todo.text} 삭제`);
  deleteButton.addEventListener("click", () => {
    openDeleteDialog(todo, deleteButton);
  });

  const content = document.createElement("div");
  content.className = "todo-content";
  content.append(text, details);

  item.append(checkbox, content, deleteButton);
  return item;
}

function showConfetti(item) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const colors = ["#5269db", "#f2b84b", "#55a88a", "#ef8294", "#6bbbd0"];
  for (let index = 0; index < 16; index += 1) {
    const particle = document.createElement("span");
    const angle = (Math.PI * 2 * index) / 16 + Math.random() * 0.3;
    const distance = 35 + Math.random() * 55;
    particle.className = "confetti-particle";
    particle.setAttribute("aria-hidden", "true");
    particle.style.setProperty("--particle-x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--particle-y", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--particle-rotation", `${Math.random() * 540 - 270}deg`);
    particle.style.setProperty("--particle-color", colors[index % colors.length]);
    particle.style.setProperty("--particle-size", `${5 + Math.random() * 5}px`);
    particle.style.setProperty("--particle-delay", `${Math.random() * 80}ms`);
    item.append(particle);
    particle.addEventListener("animationend", () => particle.remove(), { once: true });
  }
}

function openDeleteDialog(todo, trigger) {
  pendingDeleteId = todo.id;
  deleteTrigger = trigger;
  deleteDialogDescription.textContent = todo.text;
  deleteDialog.showModal();
}

function closeDeleteDialog() {
  if (deleteDialog.open) {
    deleteDialog.close();
  }
}

cancelDeleteButton.addEventListener("click", closeDeleteDialog);

confirmDeleteButton.addEventListener("click", () => {
  if (pendingDeleteId === null) {
    closeDeleteDialog();
    return;
  }

  const todoExists = todos.some((todo) => todo.id === pendingDeleteId);
  if (todoExists) {
    todos = todos.filter((todo) => todo.id !== pendingDeleteId);
    saveTodos();
    render();
  }

  closeDeleteDialog();
});

deleteDialog.addEventListener("close", () => {
  pendingDeleteId = null;
  if (deleteTrigger?.isConnected) {
    deleteTrigger.focus();
  } else {
    input.focus();
  }
  deleteTrigger = null;
});

function render() {
  const visibleTodos = getVisibleTodos();
  const doneCount = todos.filter((todo) => todo.completed).length;
  const percentage = todos.length === 0 ? 0 : (doneCount / todos.length) * 100;
  const percentageText = Number.isInteger(percentage)
    ? String(percentage)
    : percentage.toFixed(1);

  totalCount.textContent = String(todos.length);
  completedCount.textContent = String(doneCount);
  progressLabel.textContent = `${percentageText}%`;
  progress.setAttribute("aria-valuenow", percentageText);
  progressBar.style.width = `${percentage}%`;

  todoList.replaceChildren(...visibleTodos.map(createTodoElement));
  emptyState.classList.toggle("d-none", visibleTodos.length > 0);
  emptyState.textContent =
    todos.length === 0 ? "할 일을 추가해 보세요!" : "표시할 할 일이 없습니다.";

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  const characterLength = getCharacterLength(input.value);

  if (text.length === 0) {
    setInputMessage("할 일 내용을 입력해 주세요.");
    input.focus();
    return;
  }

  if (characterLength > MAX_TEXT_LENGTH) {
    setInputMessage(`할 일은 ${MAX_TEXT_LENGTH}자 이내로 입력해 주세요.`);
    input.focus();
    return;
  }

  if (dueAtInput.value && !isValidLocalDateTime(dueAtInput.value)) {
    setInputMessage("마감 날짜와 시간을 확인해 주세요.");
    dueAtInput.setAttribute("aria-invalid", "true");
    dueAtInput.focus();
    return;
  }

  dueAtInput.setAttribute("aria-invalid", "false");
  todos = [
    ...todos,
    {
      id: createTodoId(),
      text,
      completed: false,
      createdAt: Date.now(),
      dueAt: dueAtInput.value || null,
      priority: priorityInput.value
    }
  ];
  saveTodos();
  form.reset();
  priorityInput.value = "medium";
  updateCharacterCount();
  render();
  input.focus();
});

input.addEventListener("input", updateCharacterCount);

dueAtInput.addEventListener("input", () => {
  dueAtInput.setAttribute("aria-invalid", "false");
  if (inputMessage.textContent === "마감 날짜와 시간을 확인해 주세요.") {
    setInputMessage("");
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

updateCharacterCount();
render();
