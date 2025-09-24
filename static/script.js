document.addEventListener("DOMContentLoaded", function () {
  const chatMessages = document.getElementById("chat-messages");
  const symptomInput = document.getElementById("symptom-input");
  const sendButton = document.getElementById("send-btn");
  const newChatButton = document.getElementById("new-chat");
  const daysModal = new bootstrap.Modal(document.getElementById("daysModal"));
  const daysInput = document.getElementById("days-input");
  const submitDaysButton = document.getElementById("submit-days");

  // State variables
  let currentState = "symptoms";
  let selectedSymptoms = [];
  let followUpQuestions = [];
  let currentQuestionIndex = 0;

  // Initialize chat
  function initChat() {
    addMessage(
      "bot",
      "Hello! I am your healthcare assistant. What symptoms are you experiencing?"
    );
    currentState = "symptoms";
  }

  // Add message to chat
  function addMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Handle user input
  function handleInput() {
    const input = symptomInput.value.trim();
    if (!input) return;

    addMessage("user", input);
    symptomInput.value = "";

    switch (currentState) {
      case "symptoms":
        handleSymptomInput(input);
        break;

      case "symptom_selection":
        const selection = parseInt(input);
        if (
          isNaN(selection) ||
          selection < 1 ||
          selection > selectedSymptoms.length
        ) {
          addMessage("bot", "Please enter a valid number from the list.");
          return;
        }
        handleSymptomSelection(selection - 1);
        break;

      case "followup":
        handleFollowUpResponse(input);
        break;
    }
  }

  // Handle symptom input
  function handleSymptomInput(input) {
    fetch("/get_symptoms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symptom: input }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.matches && data.matches.length > 0) {
          selectedSymptoms = data.matches;
          addMessage(
            "bot",
            "I found these matching symptoms. Please select one:"
          );
          selectedSymptoms.forEach((symptom, index) => {
            addMessage("bot", `${index + 1}. ${symptom}`);
          });
          currentState = "symptom_selection";
        } else {
          addMessage(
            "bot",
            "I couldn't find any matching symptoms. Please try again with different wording."
          );
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        addMessage(
          "bot",
          "Sorry, there was an error processing your symptom. Please try again."
        );
      });
  }

  // Handle symptom selection
  function handleSymptomSelection(index) {
    const selectedSymptom = selectedSymptoms[index];
    addMessage("user", selectedSymptom);

    fetch("/get_followup_questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symptom: selectedSymptom,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.questions && data.questions.length > 0) {
          followUpQuestions = data.questions;
          currentQuestionIndex = 0;
          addMessage("bot", followUpQuestions[0]);
          currentState = "followup";
        } else {
          showDaysModal();
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        addMessage(
          "bot",
          "Sorry, there was an error getting follow-up questions. Please try again."
        );
      });
  }

  // Handle follow-up response
  function handleFollowUpResponse(input) {
    if (input.toLowerCase() === "yes") {
      selectedSymptoms.push(
        followUpQuestions[currentQuestionIndex]
          .split("?")[0]
          .replace("Are you experiencing ", "")
      );
    }

    currentQuestionIndex++;
    if (currentQuestionIndex < followUpQuestions.length) {
      addMessage("bot", followUpQuestions[currentQuestionIndex]);
    } else {
      showDaysModal();
    }
  }

  // Show days modal
  function showDaysModal() {
    daysModal.show();
  }

  // Handle days submission
  function handleDaysSubmission() {
    const days = parseInt(daysInput.value);
    if (isNaN(days) || days < 1 || days > 365) {
      addMessage(
        "bot",
        "Please enter a valid number of days between 1 and 365."
      );
      return;
    }

    fetch("/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symptoms: selectedSymptoms,
        days: days,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          addMessage(
            "bot",
            `Based on your symptoms, you may have: ${data.prediction}`
          );
          addMessage("bot", `Description: ${data.description}`);
          addMessage("bot", `Severity: ${data.severity.level}`);
          addMessage("bot", `Advice: ${data.severity.advice}`);
          addMessage("bot", "Precautions:");
          data.precautions.forEach((precaution) => {
            addMessage("bot", `- ${precaution}`);
          });
          addMessage(
            "bot",
            "You can view your diagnosis history in your profile."
          );
        } else {
          addMessage(
            "bot",
            "Sorry, there was an error processing your symptoms. Please try again."
          );
        }
        daysModal.hide();
        currentState = "symptoms";
      })
      .catch((error) => {
        console.error("Error:", error);
        addMessage(
          "bot",
          "Sorry, there was an error getting the prediction. Please try again."
        );
      });
  }

  // Event Listeners
  sendButton.addEventListener("click", handleInput);
  symptomInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleInput();
    }
  });

  newChatButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to start a new chat?")) {
      selectedSymptoms = [];
      followUpQuestions = [];
      currentQuestionIndex = 0;
      chatMessages.innerHTML = "";
      initChat();
    }
  });

  submitDaysButton.addEventListener("click", handleDaysSubmission);

  // Initialize chat when page loads
  initChat();
});
