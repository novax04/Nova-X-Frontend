const BACKEND_URL = "https://nova-x-backend.onrender.com";

function showTab(tabName) {
    document.querySelectorAll(".panel-section").forEach(panel => panel.style.display = "none");
    document.querySelectorAll(".tab-button").forEach(button => button.classList.remove("active"));
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
        li.append(checkbox, span, deleteButton);
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
        if (isRecording) recognition.stop(); else recognition.start();
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

        const lowerCaseMessage = message.toLowerCase();

        if (lowerCaseMessage.startsWith("search ")) {
            const query = lowerCaseMessage.replace(/^search /i, "");
            const results = await searchWeb(query);
            chatBox.removeChild(loader);
            addMessage("Nova X", "🔎 Search results:", "ai-message");
            chatBox.innerHTML += results.map(r =>
                typeof r === 'string'
                    ? `<div>${r}</div>`
                    : `<div class="ai-message"><a href="${unwrapDuckDuckGoURL(r.url)}" target="_blank"><strong>${r.title}</strong></a></div>`
            ).join('');
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
        }

        if (lowerCaseMessage.includes("news in")) {
            const country = lowerCaseMessage.replace("news in", "").trim();
            await fetchNewsByCountry(country);
            chatBox.removeChild(loader);
            return;
        }

        if (lowerCaseMessage.includes("news about")) {
            const topic = lowerCaseMessage.replace("news about", "").trim();
            await fetchNewsByTopic(topic);
            chatBox.removeChild(loader);
            return;
        }

        if (lowerCaseMessage.includes("weather in")) {
            const city = lowerCaseMessage.replace("weather in", "").trim();
            await getWeatherByCity(city);
            chatBox.removeChild(loader);
            return;
        }

        if (lowerCaseMessage.includes("weather") || lowerCaseMessage.includes("temperature")) {
            getLocation();
            chatBox.removeChild(loader);
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            chatBox.removeChild(loader);
            addMessage("Nova X", data.response, "ai-message");
        } catch {
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

    async function searchWeb(query) {
        const res = await fetch(`${BACKEND_URL}/search-web`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        return data.results;
    }

    function unwrapDuckDuckGoURL(wrappedUrl) {
        const match = wrappedUrl.match(/uddg=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : wrappedUrl;
    }

    function getLocation() {
        navigator.geolocation.getCurrentPosition(
            pos => getWeather(pos.coords.latitude, pos.coords.longitude),
            () => addMessage("Nova X", "⚠️ Location access denied.", "ai-message")
        );
    }

    async function getWeather(lat, lon) {
        const url = `${BACKEND_URL}/weather?city=${lat},${lon}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            addMessage("Nova X", `🌤️ ${data.location}: ${data.condition}, ${data.temp_c}°C`);
        } catch {
            addMessage("Nova X", "⚠️ Error getting weather.");
        }
    }

    async function getWeatherByCity(city) {
        const url = `${BACKEND_URL}/weather?city=${encodeURIComponent(city)}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            addMessage("Nova X", `🌤️ ${data.location}: ${data.condition}, ${data.temp_c}°C`);
        } catch {
            addMessage("Nova X", "⚠️ Error getting weather.");
        }
    }

    async function fetchNewsByCountry(country) {
        try {
            const res = await fetch(`${BACKEND_URL}/news/country?country=${country}`);
            const data = await res.json();
            addMessage("Nova X", data.response);
        } catch {
            addMessage("Nova X", "⚠️ Error getting news.");
        }
    }

    async function fetchNewsByTopic(topic) {
        try {
            const res = await fetch(`${BACKEND_URL}/news/topic?topic=${topic}`);
            const data = await res.json();
            addMessage("Nova X", data.response);
        } catch {
            addMessage("Nova X", "⚠️ Error getting news.");
        }
    }

    document.getElementById("help-button").addEventListener("click", () => {
        const panel = document.getElementById("help-panel");
        panel.style.display = panel.style.display === "block" ? "none" : "block";
    });

    document.getElementById("todo-panel-toggle").addEventListener("click", () => {
        document.getElementById("assistant-panel").style.display = "block";
    });

    document.getElementById("close-assistant").addEventListener("click", () => {
        document.getElementById("assistant-panel").style.display = "none";
    });

    document.querySelectorAll(".tab-button").forEach(button => {
        button.addEventListener("click", () => {
            showTab(button.dataset.tab);
        });
    });

    document.getElementById("add-task").addEventListener("click", addTask);
    document.getElementById("add-reminder").addEventListener("click", addReminder);

    document.getElementById("image-upload").addEventListener("change", async function () {
        const file = this.files[0];
        if (!file || !file.type.startsWith("image/")) {
            addMessage("Nova X", "⚠️ Please upload a valid image file.");
            return;
        }

        addMessage("Nova X", "🖼️ Processing image...");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${BACKEND_URL}/analyze-image`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const text = await response.text();

            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                throw new Error("❌ Backend returned invalid JSON");
            }

            addMessage("Nova X", result.summary || "❌ No text found in the image.");
        } catch (error) {
            addMessage("Nova X", `❌ Error processing the image: ${error.message}`);
        }
    });
});
