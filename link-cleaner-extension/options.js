const input = document.getElementById("word-input");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("word-list");

async function getWords() {
  const data = await chrome.storage.local.get("customWords");
  return Array.isArray(data.customWords) ? data.customWords : [];
}

async function saveWords(words) {
  await chrome.storage.local.set({ customWords: words });
  render();
}

async function render() {
  const words = await getWords();
  list.textContent = "";

  if (!words.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "还没添加干扰词";
    list.appendChild(li);
    return;
  }

  for (const word of words) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = word;

    const btn = document.createElement("button");
    btn.className = "secondary";
    btn.textContent = "删";
    btn.addEventListener("click", async () => {
      await saveWords(words.filter((item) => item !== word));
    });

    li.append(span, btn);
    list.appendChild(li);
  }
}

addBtn.addEventListener("click", async () => {
  const words = input.value
    .split(/[\s,，、;；]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (!words.length) return;

  const current = await getWords();
  const next = [...current];
  for (const word of words) {
    if (!next.includes(word)) next.push(word);
  }
  await saveWords(next);
  input.value = "";
  input.focus();
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addBtn.click();
});

render();
