const backendURL = "https://nova-x-7akw.onrender.com/api/ask";

function showTab(tabName) {
    document.querySelectorAll(".panel-section").forEach(panel => {
        panel.style.display = "none";
    });
    document.querySelectorAll(".tab-button").forEach(button => {
        button.classList.remove("active");
    });
    document.getElementById(tabName).style.display = "block";
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add("active");
}

function addTask() {
    const taskInput = document.getElementById("task-input");
    const taskList = document.getElementById("task-list");

    if (taskInput.value.trim()) {
        const li = document.createElement("li");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        const span = document.createElement("span");
        span.textContent = taskInput.value.trim();
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "🗑️";
        deleteButton.onclick = () => taskList.removeChild(li);

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(deleteButton);
        taskList.appendChild(li);

        taskInput.value = "";
    }
}

function addReminder() {
    const reminderInput = document.getElementById("reminder-input");
    const reminderList = document.getElementById("reminder-list");

    if (reminderInput.value.trim()) {
        const li = document.createElement("li");
        li.textContent = reminderInput.value.trim();
        reminderList.appendChild(li);
        reminderInput.value = "";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const sendButton = document.getElementById("send-button");
    const micButton = document.getElementById("mic-button");
    const waveform = document.getElementById("waveform");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";

    let isRecording = false;

    micButton.addEventListener("click", () => {
        if (isRecording) recognition.stop();
        else recognition.start();

        isRecording = !isRecording;
        micButton.classList.toggle("active", isRecording);
        waveform.style.display = isRecording ? "flex" : "none";
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        stopRecordingUI();
        sendMessage();
    };

    recognition.onspeechend = stopRecordingUI;
    recognition.onerror = (event) => {
        addMessage("Nova X", `⚠️ Speech recognition error: ${event.error}`, "ai-message");
        stopRecordingUI();
    };

    function stopRecordingUI() {
        isRecording = false;
        micButton.classList.remove("active");
        waveform.style.display = "none";
    }

    sendButton.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage("You", message, "user-message");
        userInput.value = "";

        const loader = document.createElement("div");
        loader.classList.add("typing-indicator");
        loader.innerHTML = "<span></span><span></span><span></span>";
        chatBox.appendChild(loader);
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const response = await fetch(backendURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            chatBox.removeChild(loader);
            addMessage("Nova X", data.response, "ai-message");
        } catch (err) {
            chatBox.removeChild(loader);
            addMessage("Nova X", "⚠️ Error getting response from backend.", "ai-message");
        }
    }

    function addMessage(sender, text, className = "ai-message") {
        const msg = document.createElement("div");
        msg.classList.add("message", className);
        msg.innerHTML = `<strong>${sender}:</strong> ${text.replace(/\n/g, "<br>")}`;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // 🆘 Help Panel Toggle
    document.getElementById("help-button").addEventListener("click", () => {
        const panel = document.getElementById("help-panel");
        panel.style.display = panel.style.display === "block" ? "none" : "block";
    });

    // 📋 Assistant Panel Toggle
    document.getElementById("todo-panel-toggle").addEventListener("click", () => {
        document.getElementById("assistant-panel").style.display = "block";
    });

    document.getElementById("close-assistant").addEventListener("click", () => {
        document.getElementById("assistant-panel").style.display = "none";
    });

    // 🗂 Tabs
    document.querySelectorAll(".tab-button").forEach(button => {
        button.addEventListener("click", () => {
            showTab(button.dataset.tab);
        });
    });

    // ➕ Task / Reminder
    document.getElementById("add-task").addEventListener("click", addTask);
    document.getElementById("add-reminder").addEventListener("click", addReminder);

    // 📄 PDF Upload
    document.getElementById("pdf-upload").addEventListener("change", async function () {
        const file = this.files[0];
        if (!file || file.type !== "application/pdf") {
            addMessage("Nova X", "⚠️ Please upload a valid PDF file.");
            return;
        }

        addMessage("Nova X", "📄 Processing PDF...");
        const formData = new FormData();
        formData.append("pdf", file);

        try {
            const response = await fetch("https://nova-x-7akw.onrender.com/pdf", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();
            if (result.text) {
                const summaryPrompt = `Summarize this PDF:\n\n${result.text.slice(0, 3000)}`;
                const chatRes = await fetch(backendURL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: summaryPrompt }),
                });
                const chatData = await chatRes.json();
                addMessage("Nova X", chatData.response);
            } else {
                addMessage("Nova X", "❌ No text found in PDF.");
            }
        } catch {
            addMessage("Nova X", "❌ Error processing the PDF.");
        }
    });
});
