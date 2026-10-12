var messages = []
var userMessage = document.querySelector("#message-input").value
var messagesContainer = document.querySelector(".messages")
var thinkingBot = `<article class="message assistant-message" id="thinkingMsg">
                        <span class="assistant-mark">
                            <svg aria-hidden="true">
                                <use href="#spark"></use>
                            </svg>
                        </span>
                        <div class="message-body">
                            <svg>
                                <use href="#thinking"></use>
                            </svg>
                        </div>
                    </article>`
function sendChat() {

    if (messages.length === 0) {
        messagesContainer.style.display = "flex"
        messagesContainer.style.flexDirection = "column"
        document.querySelector(".suggestions").style.display = "none"

    }

    messagesContainer.innerHTML += thinkingBot

    setTimeout(() => {
        document.querySelector("#thinkingMsg").remove()
    }, 3000);

    fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: 'Bonjour',
            userId: 123
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
        })


}

function userWriting() {
    if (userMessage === "") {
        document.querySelector(".send-button").disabled = true
    } else {
        document.querySelector(".send-button").disabled = false
    }
}