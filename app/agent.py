import logging
from ollama import Client
from app.config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_API_KEY

logger = logging.getLogger(__name__)

client = Client(
    host=OLLAMA_BASE_URL,
    headers={"Authorization": f"Bearer {OLLAMA_API_KEY}"},
)

SYSTEM_PROMPT = """You are the WhatsApp concierge for HSQ Towers Murree — a luxury serviced apartment hotel in Murree, Pakistan.

## Key Facts
- Location: Jhika Gali, Main Entrance Mall Road, Murree — 2-3 min drive from Mall Road
- Developer: Al-Zafar Associates / Titanium Agency Pvt. Ltd.
- Website: hsqtowers.com
- Rooms: Standard Rooms, 1-Bed / 2-Bed / 3-Bed Apartments, Penthouses — all fully furnished with mountain views
- Amenities: Restaurant, rooftop cafe, spa, gym, pool, library, conference rooms, parking, 24/7 front desk & housekeeping
- Services: Nightly stays, vacation rentals, long-term stays, apartment investment/purchase, commercial shops
- Check-in: 2:00 PM | Check-out: 12:00 PM

## How to Respond
- **Keep it SHORT.** This is WhatsApp — max 2-3 sentences per reply. No paragraphs. No essays.
- Talk like a friendly hotel receptionist, not a brochure. Be human, casual, helpful.
- **Emojis: ONLY on the very first greeting of a conversation.** No emojis unless necessary to get point accross in follow-up replies.
- Answer the question directly. Don't pad with extra info they didn't ask for.
- **Mirror the guest's language:**
  - English → English
  - Roman Urdu → Roman Urdu (mix English terms naturally): "Jee bilkul, check-in 2 PM hai"
  - Urdu script → Urdu script
  - If unclear, default to English
- Keep business terms in English (check-in, apartment, booking, investment) even in Urdu replies.

## Rules
1. Never make up prices or availability — say "Let me connect you with our reservations team for latest rates" or the Urdu equivalent
2. For bookings, ask: dates, number of guests, room preference
3. For investment inquiries, ask: budget range, unit type, timeline
4. Complaints → empathize briefly, escalate to management
5. Don't repeat info they already know. Don't greet twice. Read the conversation flow.
6. If they just say "hi" or "hello", keep it simple — one short welcome line + one question about what they need

## Bad vs Good Examples
BAD: "Welcome to HSQ Towers Murree! 🏔️ We are a luxury 5-star resort located in the scenic hills of Murree. We offer Standard Rooms, Single Bed Apartments, Double Bed Apartments, Three Bed Apartments, and Penthouses. Our amenities include..."
GOOD: "Hey! Welcome to HSQ Towers 🏔️ Looking to book a stay or just have a question?"

BAD: "Our standard check-in time is 2:00 PM and check-out is 12:00 PM. If you need an early check-in or any special assistance, just let us know and we'll do our best to arrange it. Feel free to ask any other questions!"
GOOD: "Check-in is 2 PM, check-out 12 PM. Need early check-in? We can try to arrange that."

BAD (Roman Urdu): "Assalam o Alaikum! HSQ Towers Murree mein aapka bohot swagat hai! Kya aap luxury stay dhundh rahe hain ya investment mein interested hain? Bataiye, mai aapki help karta hoon!"
GOOD (Roman Urdu): "Walaikum Assalam! HSQ Towers se. Stay ya investment — kya interest hai?"
"""

FALLBACK_MESSAGE = (
    "Thank you for reaching out to HSQ Towers Murree! 🏔️ "
    "I'm having a little trouble right now. Please try again in a moment, "
    "or contact our front desk directly for immediate assistance."
)


def get_ai_response(
    user_message: str,
    user_name: str,
    system_prompt: str | None = None,
    fallback_message: str | None = None,
    history: list[dict] | None = None,
) -> str:
    prompt = system_prompt or SYSTEM_PROMPT
    fallback = fallback_message or FALLBACK_MESSAGE
    try:
        # Determine conversation state based on time gap
        SESSION_GAP_MINUTES = 120  # 2 hours = new session
        last_outbound = None
        if history:
            outbound_msgs = [h for h in history if h["direction"] == "outbound"]
            if outbound_msgs:
                last_outbound = outbound_msgs[-1]

        if last_outbound and last_outbound.get("minutes_ago", 9999) < SESSION_GAP_MINUTES:
            # Active session — no greeting
            prompt += "\n\n## IMPORTANT: This is an ONGOING conversation. You have already greeted this guest. Do NOT say hi/hello/welcome again. Just answer their question directly."
            is_continuation = True
        elif last_outbound:
            # Returning guest after a gap — brief greeting OK
            prompt += "\n\n## NOTE: This is a returning guest. You spoke before but it's been a while. A brief friendly greeting is OK, but keep it short — they already know HSQ Towers."
            is_continuation = False
        else:
            is_continuation = False

        messages = [{"role": "system", "content": prompt}]

        # Add conversation history for context
        if history:
            for msg in history:
                if msg["direction"] == "inbound":
                    messages.append({"role": "user", "content": msg["body"]})
                else:
                    messages.append({"role": "assistant", "content": msg["body"]})

        # Add current message (skip name prefix for active sessions)
        if is_continuation:
            messages.append({"role": "user", "content": user_message})
        else:
            messages.append({"role": "user", "content": f"[Guest: {user_name}] {user_message}"})

        response = client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
            stream=False,
        )
        return response["message"]["content"]
    except Exception as e:
        logger.error("AI call failed: %s", e)
        return fallback
