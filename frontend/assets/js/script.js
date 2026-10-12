var messages = []
var userMessage = document.querySelector("#message-input")
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
async function sendChat() {

    if (messages.length === 0) {
        messagesContainer.style.display = "flex"
        messagesContainer.style.flexDirection = "column"
        document.querySelector(".suggestions").style.display = "none"

    }

    messagesContainer.innerHTML += `<article class="message user-message">
                        <div class="message-body">${userMessage.value}</div>
                    </article>  `

    messages.push({
        role: "user",
        content: userMessage.value
    })

    userMessage.value = ""

    messagesContainer.innerHTML += thinkingBot

    const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: messages
        })
    })

    const res = await response.json()

    console.log(res)

    messages.push({
        role: "assistant",
        content: res.message
    })

    document.querySelector("#thinkingMsg").remove()

    messagesContainer.innerHTML += `<article class="message assistant-message">
                        <span class="assistant-mark">
                            <svg aria-hidden="true">
                                <use href="#spark"></use>
                            </svg>
                        </span>
                        <div class="message-body">${res.message}</div>
                    </article>`
}

function userWriting() {
    if (userMessage.value === "") {
        document.querySelector(".send-button").disabled = true
    } else {
        document.querySelector(".send-button").disabled = false
    }
}